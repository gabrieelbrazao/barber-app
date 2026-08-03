-- Deposits: an optional per-service deposit and the booking's payment state.
-- payment_status is only advanced server-side (the Stripe webhook, via service_role);
-- migration 0005 already restricts authenticated appointment updates to `status`,
-- so clients can't mark themselves paid.

alter table public.services
  add column if not exists deposit_cents integer not null default 0 check (deposit_cents >= 0);

alter table public.appointments
  add column if not exists payment_status text not null default 'none'
    check (payment_status in ('none', 'pending', 'paid', 'refunded')),
  add column if not exists payment_intent_id text;
