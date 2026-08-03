-- Reschedule is a customer-initiated time change. Migration 0005 deliberately
-- restricts customers to updating only `status` (→ cancelled), so moving a booking
-- goes through this validated SECURITY DEFINER RPC instead: it re-checks ownership,
-- a movable status, and a sane future time, resets to 'pending' for re-confirmation,
-- and lets the existing no-overlap exclusion constraint reject clashes (SQLSTATE 23P01).
create or replace function public.reschedule_appointment(
  p_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.appointments a
     set start_time = p_start,
         end_time = p_end,
         status = 'pending'
   where a.id = p_id
     and a.customer_id = auth.uid()
     and a.status in ('pending', 'confirmed')
     and p_start < p_end
     and p_start > now();

  if not found then
    raise exception 'cannot reschedule this appointment';
  end if;
end;
$$;

revoke execute on function public.reschedule_appointment(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.reschedule_appointment(uuid, timestamptz, timestamptz) to authenticated;
