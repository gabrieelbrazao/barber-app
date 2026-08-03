-- Owner-only KPI rollup over a date range. SECURITY DEFINER + an is_owner() guard;
-- aggregation stays in SQL. Revenue counts completed bookings net of any discount.
create or replace function public.shop_analytics(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_owner() then
    raise exception 'only the shop owner can view analytics';
  end if;

  with scoped as (
    select a.status,
           a.discount_cents,
           s.price_cents,
           s.name as service_name
    from public.appointments a
    join public.services s on s.id = a.service_id
    where a.shop_id = public.current_shop_id()
      and a.start_time >= p_from
      and a.start_time < p_to
  )
  select jsonb_build_object(
    'revenue_cents', coalesce((select sum(price_cents - discount_cents) from scoped where status = 'completed'), 0),
    'completed', (select count(*) from scoped where status = 'completed'),
    'cancelled', (select count(*) from scoped where status = 'cancelled'),
    'no_show', (select count(*) from scoped where status = 'no_show'),
    'total', (select count(*) from scoped),
    'top_services', coalesce((
      select jsonb_agg(t) from (
        select service_name as name, count(*)::int as count
        from scoped
        where status = 'completed'
        group by service_name
        order by count(*) desc
        limit 5
      ) t
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke execute on function public.shop_analytics(timestamptz, timestamptz) from public, anon;
grant execute on function public.shop_analytics(timestamptz, timestamptz) to authenticated;
