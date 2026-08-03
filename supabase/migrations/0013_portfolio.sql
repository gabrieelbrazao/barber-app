-- Barber portfolio: photos of past work, shown on the barber detail screen.

create table if not exists public.portfolio_images (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  barber_id uuid not null references public.barber_profiles (id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists portfolio_barber_idx on public.portfolio_images (barber_id, sort_order);

alter table public.portfolio_images enable row level security;
grant select, insert, update, delete on public.portfolio_images to authenticated;

create policy "portfolio readable within shop"
  on public.portfolio_images for select to authenticated
  using (shop_id = public.current_shop_id());

create policy "barber manages own portfolio"
  on public.portfolio_images for all to authenticated
  using (auth.uid() = barber_id)
  with check (auth.uid() = barber_id and shop_id = public.current_shop_id());

-- Public-read bucket; a barber may write only under `<shop_id>/<barber_id>/...`.
insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

drop policy if exists "portfolio public read" on storage.objects;
drop policy if exists "portfolio barber write" on storage.objects;

create policy "portfolio public read"
  on storage.objects for select
  using (bucket_id = 'portfolio');

create policy "portfolio barber write"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = public.current_shop_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'portfolio'
    and (storage.foldername(name))[1] = public.current_shop_id()::text
    and (storage.foldername(name))[2] = auth.uid()::text
  );
