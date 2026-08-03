-- Owner-created promo codes (validated server-side) + a per-customer loyalty count.

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  code text not null,
  kind text not null check (kind in ('percent', 'amount')),
  value int not null check (value > 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists promo_codes_shop_code_idx
  on public.promo_codes (shop_id, lower(code));

alter table public.appointments
  add column if not exists promo_code_id uuid references public.promo_codes (id) on delete set null,
  add column if not exists discount_cents int not null default 0 check (discount_cents >= 0);

alter table public.promo_codes enable row level security;
grant select, insert, update, delete on public.promo_codes to authenticated;

create policy "promo codes readable within shop"
  on public.promo_codes for select to authenticated
  using (shop_id = public.current_shop_id());

create policy "owner manages promo codes"
  on public.promo_codes for all to authenticated
  using (public.is_owner() and shop_id = public.current_shop_id())
  with check (public.is_owner() and shop_id = public.current_shop_id());

-- Validate a code for the caller's shop; returns 0 rows when invalid/expired.
create or replace function public.redeem_promo(p_code text)
returns table (promo_id uuid, kind text, value int)
language sql
stable
security definer
set search_path = public
as $$
  select id, kind, value
  from public.promo_codes
  where shop_id = public.current_shop_id()
    and lower(code) = lower(p_code)
    and active
    and (expires_at is null or expires_at > now())
  limit 1
$$;

revoke execute on function public.redeem_promo(text) from public, anon;
grant execute on function public.redeem_promo(text) to authenticated;

-- Loyalty = completed-appointment count per customer. security_invoker so the
-- caller only sees their own (appointments RLS).
create or replace view public.customer_loyalty
  with (security_invoker = true) as
  select customer_id, count(*)::int as completed_count
  from public.appointments
  where status = 'completed'
  group by customer_id;

grant select on public.customer_loyalty to authenticated;
