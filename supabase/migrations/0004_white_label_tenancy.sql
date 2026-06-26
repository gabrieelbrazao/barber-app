-- White-label multi-tenancy: a shared project hosting many shops, isolated by RLS.
-- Each client build is pinned to one shop via EXPO_PUBLIC_SHOP_ID (= shops.id).
-- Shop-level identity (name/location) moves from barber_profiles onto `shops`;
-- barber_profiles become staff of a shop (gain `title`, lose shop_name/location).

-- ---------------------------------------------------------------------------
-- Shops (one row per client build)
-- ---------------------------------------------------------------------------

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text,
  location text,
  owner_id uuid references public.profiles (id) on delete set null,
  logo_url text,
  -- Brand color overrides: { "light": {token:hex,...}, "dark": {...} }. Empty = defaults.
  colors jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tenant columns on every domain table
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists shop_id uuid references public.shops (id) on delete cascade;
alter table public.barber_profiles
  add column if not exists shop_id uuid references public.shops (id) on delete cascade,
  add column if not exists title text;
alter table public.services
  add column if not exists shop_id uuid references public.shops (id) on delete cascade;
alter table public.appointments
  add column if not exists shop_id uuid references public.shops (id) on delete cascade;

-- Shop-level identity now lives on `shops`, not on each staff member.
alter table public.barber_profiles drop column if exists shop_name;
alter table public.barber_profiles drop column if exists location;

create index if not exists profiles_shop_idx on public.profiles (shop_id);
create index if not exists barber_profiles_shop_idx on public.barber_profiles (shop_id);
create index if not exists services_shop_idx on public.services (shop_id);
create index if not exists appointments_shop_idx on public.appointments (shop_id);

-- ---------------------------------------------------------------------------
-- Banners (per-shop promotional content)
-- ---------------------------------------------------------------------------

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  image_url text not null,
  title text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists banners_shop_idx on public.banners (shop_id, sort_order);

-- ---------------------------------------------------------------------------
-- Tenant helpers (security definer → bypass RLS, avoiding policy recursion)
-- ---------------------------------------------------------------------------

create or replace function public.current_shop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select shop_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shops
    where id = public.current_shop_id() and owner_id = auth.uid()
  )
$$;

-- ---------------------------------------------------------------------------
-- New-user trigger: stamp the joining shop from sign-up metadata
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'customer');
  v_shop uuid := nullif(new.raw_user_meta_data ->> 'shop_id', '')::uuid;
begin
  insert into public.profiles (id, full_name, role, phone, shop_id)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    v_role,
    new.raw_user_meta_data ->> 'phone',
    v_shop
  );

  if v_role = 'barber' then
    insert into public.barber_profiles (id, shop_id, title)
    values (new.id, v_shop, new.raw_user_meta_data ->> 'title');
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public branding view (anon-readable; the app loads the theme pre-login)
-- ---------------------------------------------------------------------------

create or replace view public.shop_public as
  select id, name, logo_url, colors from public.shops;

grant select on public.shop_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Table privileges for the PostgREST roles. RLS (below) does the row-level
-- gating; these coarse grants are still required for the roles to touch the
-- tables at all. (Hosted Supabase auto-grants these; we make it explicit so the
-- schema is portable to a bare Postgres / local test stack.)
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on
  public.profiles, public.barber_profiles, public.services,
  public.appointments, public.shops, public.banners
  to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security — replace the catalog-era (using true) policies with
-- tenant-scoped ones. Every read is gated by shop_id = current_shop_id().
-- ---------------------------------------------------------------------------

alter table public.shops enable row level security;
alter table public.banners enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles readable by authenticated" on public.profiles;
drop policy if exists "update own profile" on public.profiles;

create policy "profiles readable within shop"
  on public.profiles for select to authenticated
  using (shop_id = public.current_shop_id());
create policy "update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- barber_profiles -----------------------------------------------------------
drop policy if exists "barber profiles readable" on public.barber_profiles;
drop policy if exists "barber manages own barber profile" on public.barber_profiles;

create policy "barber profiles readable within shop"
  on public.barber_profiles for select to authenticated
  using (shop_id = public.current_shop_id());
create policy "barber manages own barber profile"
  on public.barber_profiles for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- services ------------------------------------------------------------------
drop policy if exists "services readable" on public.services;
drop policy if exists "barber manages own services" on public.services;

create policy "services readable within shop"
  on public.services for select to authenticated
  using (shop_id = public.current_shop_id());
create policy "barber manages own services"
  on public.services for all to authenticated
  using (auth.uid() = barber_id)
  with check (auth.uid() = barber_id and shop_id = public.current_shop_id());

-- appointments --------------------------------------------------------------
drop policy if exists "customer reads own appointments" on public.appointments;
drop policy if exists "customer books own appointment" on public.appointments;
drop policy if exists "customer updates own appointment" on public.appointments;
drop policy if exists "barber updates received appointment" on public.appointments;

create policy "appointments readable by party within shop"
  on public.appointments for select to authenticated
  using (
    shop_id = public.current_shop_id()
    and (auth.uid() = customer_id or auth.uid() = barber_id)
  );
create policy "customer books own appointment"
  on public.appointments for insert to authenticated
  with check (auth.uid() = customer_id and shop_id = public.current_shop_id());
create policy "customer updates own appointment"
  on public.appointments for update to authenticated
  using (auth.uid() = customer_id) with check (auth.uid() = customer_id);
create policy "barber updates received appointment"
  on public.appointments for update to authenticated
  using (auth.uid() = barber_id) with check (auth.uid() = barber_id);

-- shops ---------------------------------------------------------------------
drop policy if exists "members read their shop" on public.shops;
drop policy if exists "owner updates shop" on public.shops;

create policy "members read their shop"
  on public.shops for select to authenticated
  using (id = public.current_shop_id());
create policy "owner updates shop"
  on public.shops for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- banners -------------------------------------------------------------------
drop policy if exists "banners readable within shop" on public.banners;
drop policy if exists "owner manages banners" on public.banners;

create policy "banners readable within shop"
  on public.banners for select to authenticated
  using (shop_id = public.current_shop_id());
create policy "owner manages banners"
  on public.banners for all to authenticated
  using (public.is_owner() and shop_id = public.current_shop_id())
  with check (public.is_owner() and shop_id = public.current_shop_id());

-- ---------------------------------------------------------------------------
-- Storage: public read for branding/banners; owner writes only its own folder
-- (objects are keyed as `<shop_id>/...`).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true), ('banners', 'banners', true)
on conflict (id) do nothing;

drop policy if exists "branding public read" on storage.objects;
drop policy if exists "branding owner write" on storage.objects;

create policy "branding public read"
  on storage.objects for select
  using (bucket_id in ('branding', 'banners'));

create policy "branding owner write"
  on storage.objects for all to authenticated
  using (
    bucket_id in ('branding', 'banners')
    and public.is_owner()
    and (storage.foldername(name))[1] = public.current_shop_id()::text
  )
  with check (
    bucket_id in ('branding', 'banners')
    and public.is_owner()
    and (storage.foldername(name))[1] = public.current_shop_id()::text
  );
