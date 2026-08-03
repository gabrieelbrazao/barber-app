-- Self-serve staff injection fix: signup trusts client-supplied role+shop_id, so
-- anyone could register as a barber of any shop. New staff now start UNAPPROVED and
-- only the shop owner can approve them; unapproved staff are invisible to customers
-- and unbookable.

alter table public.barber_profiles
  add column if not exists approved boolean not null default false;

-- Backfill existing staff as approved so the live shop / seed keeps working.
update public.barber_profiles set approved = true;

-- Owner-only approval. SECURITY DEFINER so it can flip a column staff can't
-- (migration 0005 removed `approved` from their updatable columns).
create or replace function public.set_staff_approval(p_staff_id uuid, p_approved boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'only the shop owner can change staff approval';
  end if;
  update public.barber_profiles
     set approved = p_approved
   where id = p_staff_id
     and shop_id = public.current_shop_id();
end;
$$;

revoke execute on function public.set_staff_approval(uuid, boolean) from public, anon;
grant execute on function public.set_staff_approval(uuid, boolean) to authenticated;

-- Bookings may only target an APPROVED barber (recreate the 0005 insert policy + check).
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
      select 1
      from public.services s
      join public.barber_profiles bp on bp.id = s.barber_id
      where s.id = service_id
        and s.barber_id = appointments.barber_id
        and s.active
        and s.shop_id = public.current_shop_id()
        and bp.approved
    )
  );
