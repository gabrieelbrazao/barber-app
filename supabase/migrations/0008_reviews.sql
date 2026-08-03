-- Customer reviews for completed appointments (the Stars UI already existed; this
-- is its missing backend). One review per appointment; aggregate exposed as a view.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  barber_id uuid not null references public.barber_profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists reviews_barber_idx on public.reviews (barber_id);
create index if not exists reviews_shop_idx on public.reviews (shop_id);

alter table public.reviews enable row level security;

-- Insert needs full row access; edits are limited to the rating/comment so the
-- customer can't re-link a review to another appointment/barber.
grant select, insert on public.reviews to authenticated;
grant update (rating, comment) on public.reviews to authenticated;

create policy "reviews readable within shop"
  on public.reviews for select to authenticated
  using (shop_id = public.current_shop_id());

-- A customer may review ONLY their own completed appointment, and the row's
-- barber/shop must match that appointment (no forging another barber's rating).
create policy "customer reviews own completed appointment"
  on public.reviews for insert to authenticated
  with check (
    auth.uid() = customer_id
    and shop_id = public.current_shop_id()
    and exists (
      select 1 from public.appointments a
      where a.id = appointment_id
        and a.customer_id = auth.uid()
        and a.barber_id = reviews.barber_id
        and a.shop_id = reviews.shop_id
        and a.status = 'completed'
    )
  );

create policy "customer updates own review"
  on public.reviews for update to authenticated
  using (auth.uid() = customer_id)
  with check (auth.uid() = customer_id);

-- Per-barber aggregate. security_invoker so the querying user's RLS applies
-- (keeps it shop-scoped and avoids a SECURITY DEFINER view advisor finding).
create or replace view public.barber_ratings
  with (security_invoker = true) as
  select barber_id,
         round(avg(rating)::numeric, 2) as avg_rating,
         count(*)::int as review_count
  from public.reviews
  group by barber_id;

grant select on public.barber_ratings to authenticated;
