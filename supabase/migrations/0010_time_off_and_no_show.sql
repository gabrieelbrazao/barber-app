-- Add a 'no_show' status, and a barber time-off table that blocks availability.

alter table public.appointments
  drop constraint appointments_status_check,
  add constraint appointments_status_check
    check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));

create table if not exists public.time_off (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  barber_id uuid not null references public.barber_profiles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists time_off_barber_idx on public.time_off (barber_id, starts_at);

alter table public.time_off enable row level security;
grant select, insert, update, delete on public.time_off to authenticated;

create policy "time_off readable within shop"
  on public.time_off for select to authenticated
  using (shop_id = public.current_shop_id());

create policy "barber manages own time off"
  on public.time_off for all to authenticated
  using (auth.uid() = barber_id)
  with check (auth.uid() = barber_id and shop_id = public.current_shop_id());
