-- Barber app schema: profiles, barber_profiles, services, appointments.
-- Run in the Supabase SQL editor (or via the Supabase CLI).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null check (role in ('customer', 'barber')),
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.barber_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  shop_name text,
  bio text,
  location text,
  -- weekday key -> [openHHmm, closeHHmm] or null when closed
  working_hours jsonb not null default '{
    "mon":["09:00","18:00"],"tue":["09:00","18:00"],"wed":["09:00","18:00"],
    "thu":["09:00","18:00"],"fri":["09:00","18:00"],"sat":["10:00","16:00"],"sun":null
  }'::jsonb
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barber_profiles (id) on delete cascade,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  barber_id uuid not null references public.barber_profiles (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists appointments_barber_start_idx
  on public.appointments (barber_id, start_time);
create index if not exists appointments_customer_start_idx
  on public.appointments (customer_id, start_time);
create index if not exists services_barber_idx on public.services (barber_id);

-- ---------------------------------------------------------------------------
-- New-user trigger: create a profile (+ barber_profile) from sign-up metadata
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'customer');
begin
  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    v_role,
    new.raw_user_meta_data ->> 'phone'
  );

  if v_role = 'barber' then
    insert into public.barber_profiles (id, shop_name)
    values (new.id, new.raw_user_meta_data ->> 'shop_name');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.barber_profiles enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;

-- profiles: everyone authenticated can read; you may only edit your own row.
create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- barber_profiles: readable by all; writable only by the owning barber.
create policy "barber profiles readable"
  on public.barber_profiles for select to authenticated using (true);
create policy "barber manages own barber profile"
  on public.barber_profiles for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- services: readable by all; writable only by the owning barber.
create policy "services readable"
  on public.services for select to authenticated using (true);
create policy "barber manages own services"
  on public.services for all to authenticated
  using (auth.uid() = barber_id) with check (auth.uid() = barber_id);

-- appointments: customer manages their own; barber sees/updates theirs.
create policy "customer reads own appointments"
  on public.appointments for select to authenticated
  using (auth.uid() = customer_id or auth.uid() = barber_id);
create policy "customer books own appointment"
  on public.appointments for insert to authenticated
  with check (auth.uid() = customer_id);
create policy "customer updates own appointment"
  on public.appointments for update to authenticated
  using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
create policy "barber updates received appointment"
  on public.appointments for update to authenticated
  using (auth.uid() = barber_id) with check (auth.uid() = barber_id);
