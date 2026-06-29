-- Harden access control (defensive). Closes privilege-escalation / tenant-hopping
-- gaps in the existing RLS and restores the booking-insert validation that 0004
-- dropped. No client change is needed: the app already writes only the columns and
-- status transitions allowed below.

-- ---------------------------------------------------------------------------
-- Column-level write privileges — RLS gates *which rows*, these gate *which
-- columns*. A row policy alone can't stop a user from flipping their own
-- `role`/`shop_id`, so we revoke table-wide UPDATE and grant only the editable
-- columns. (SELECT/INSERT/DELETE grants from 0004 stay; RLS still gates them.)
-- ---------------------------------------------------------------------------

-- profiles: a user edits only their display fields — never `role` or `shop_id`
-- (either change is privilege escalation / a move to another tenant).
revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

-- barber_profiles: staff edit their public card, not the `shop_id` they belong to.
revoke update on public.barber_profiles from authenticated;
grant update (title, bio, working_hours) on public.barber_profiles to authenticated;

-- appointments: callers may change only `status` — never move a booking's time,
-- barber, service, customer or shop after the fact.
revoke update on public.appointments from authenticated;
grant update (status) on public.appointments to authenticated;

-- ---------------------------------------------------------------------------
-- appointments row policies
-- ---------------------------------------------------------------------------

-- A customer may only CANCEL their own booking. Confirming/completing are the
-- barber's transitions (the barber policy, unchanged, still allows those).
drop policy if exists "customer updates own appointment" on public.appointments;
create policy "customer cancels own appointment"
  on public.appointments for update to authenticated
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id and status = 'cancelled');

-- Restore the booking-insert validation 0004 dropped, keep 0004's tenant scoping,
-- and force new bookings to start as 'pending' (no booking straight into 'confirmed').
drop policy if exists "customer books own appointment" on public.appointments;
create policy "customer books own appointment"
  on public.appointments for insert to authenticated
  with check (
    auth.uid() = customer_id
    and shop_id = public.current_shop_id()
    and status = 'pending'
    and start_time < end_time
    and start_time > now()
    and exists (
      select 1 from public.services s
      where s.id = service_id
        and s.barber_id = appointments.barber_id
        and s.active
        and s.shop_id = public.current_shop_id()
    )
  );
