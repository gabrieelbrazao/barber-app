-- Stop overlapping bookings at the database level and tighten insert validation,
-- so availability is enforced server-side (not just in the client's slot picker).

-- Installed in the dedicated extensions schema (Supabase keeps public clean).
create extension if not exists btree_gist with schema extensions;

-- A barber can't hold two non-cancelled appointments whose time ranges overlap.
-- tstzrange is [) (inclusive start, exclusive end), so back-to-back slots
-- (e.g. 10:00–10:45 and 10:45–11:30) do NOT count as overlapping.
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status <> 'cancelled');

-- Harden the customer insert policy: the booked service must belong to that
-- barber and be active, the range must be sane, and the start must be in the future.
drop policy if exists "customer books own appointment" on public.appointments;
create policy "customer books own appointment"
  on public.appointments for insert to authenticated
  with check (
    auth.uid() = customer_id
    and start_time < end_time
    and start_time > now()
    and exists (
      select 1 from public.services s
      where s.id = service_id
        and s.barber_id = appointments.barber_id
        and s.active
    )
  );
