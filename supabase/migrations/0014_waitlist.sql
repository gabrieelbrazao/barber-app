-- Waitlist: a customer can register interest for a barber/service on a day that has
-- no open slots. The barber sees waiting entries and contacts them manually.
-- NOTE: auto-notifying a waitlisted customer when a slot frees needs server push
-- (out of scope for the local-only reminders) — tracked as a follow-up.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  barber_id uuid not null references public.barber_profiles (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  desired_date date not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'notified', 'fulfilled', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists waitlist_barber_date_idx on public.waitlist (barber_id, desired_date);

alter table public.waitlist enable row level security;
grant select, insert, update, delete on public.waitlist to authenticated;

create policy "waitlist readable by party within shop"
  on public.waitlist for select to authenticated
  using (
    shop_id = public.current_shop_id()
    and (auth.uid() = customer_id or auth.uid() = barber_id)
  );

create policy "customer joins waitlist"
  on public.waitlist for insert to authenticated
  with check (auth.uid() = customer_id and shop_id = public.current_shop_id());

create policy "customer manages own waitlist entry"
  on public.waitlist for update to authenticated
  using (auth.uid() = customer_id) with check (auth.uid() = customer_id);

create policy "barber updates received waitlist entry"
  on public.waitlist for update to authenticated
  using (auth.uid() = barber_id) with check (auth.uid() = barber_id);

create policy "customer deletes own waitlist entry"
  on public.waitlist for delete to authenticated
  using (auth.uid() = customer_id);
