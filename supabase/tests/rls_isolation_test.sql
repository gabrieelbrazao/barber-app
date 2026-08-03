-- RLS tenant-isolation tests (pgTAP). Run with: supabase test db
-- Seeds two independent shops (C and D) as superuser, then asserts that a member
-- of one shop can never read/write another shop's data, that only owners can
-- mutate shop/banners, and that shop_public is anon-readable for branding.

begin;
select plan(18);

-- Shop ids
-- C: cccccccc-cccc-cccc-cccc-cccccccccccc
-- D: dddddddd-dddd-dddd-dddd-dddddddddddd
insert into public.shops (id, name, location) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Shop C', 'C-town'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Shop D', 'D-town');

-- Users (the on_auth_user_created trigger builds profiles/barber_profiles from metadata).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values
  -- Shop C: owner (barber) + customer
  ('00000000-0000-0000-0000-000000000000', 'c1111111-1111-1111-1111-111111111111',
   'authenticated','authenticated','c-owner@test', crypt('x', gen_salt('bf')), now(), now(), now(),
   '{}', '{"full_name":"C Owner","role":"barber","title":"Owner","shop_id":"cccccccc-cccc-cccc-cccc-cccccccccccc"}',
   '','','','','','','',''),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','c-cust@test', crypt('x', gen_salt('bf')), now(), now(), now(),
   '{}', '{"full_name":"C Cust","role":"customer","shop_id":"cccccccc-cccc-cccc-cccc-cccccccccccc"}',
   '','','','','','','',''),
  -- Shop D: owner (barber) + customer
  ('00000000-0000-0000-0000-000000000000', 'd1111111-1111-1111-1111-111111111111',
   'authenticated','authenticated','d-owner@test', crypt('x', gen_salt('bf')), now(), now(), now(),
   '{}', '{"full_name":"D Owner","role":"barber","title":"Owner","shop_id":"dddddddd-dddd-dddd-dddd-dddddddddddd"}',
   '','','','','','','',''),
  ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000000',
   'authenticated','authenticated','d-cust@test', crypt('x', gen_salt('bf')), now(), now(), now(),
   '{}', '{"full_name":"D Cust","role":"customer","shop_id":"dddddddd-dddd-dddd-dddd-dddddddddddd"}',
   '','','','','','','','');

update public.shops set owner_id = 'c1111111-1111-1111-1111-111111111111'
  where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
update public.shops set owner_id = 'd1111111-1111-1111-1111-111111111111'
  where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

-- Services: 3 for C's barber, 2 for D's barber.
insert into public.services (barber_id, shop_id, name, price_cents, duration_minutes) values
  ('c1111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc','C1',1000,30),
  ('c1111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc','C2',1000,30),
  ('c1111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc','C3',1000,30),
  ('d1111111-1111-1111-1111-111111111111','dddddddd-dddd-dddd-dddd-dddddddddddd','D1',1000,30),
  ('d1111111-1111-1111-1111-111111111111','dddddddd-dddd-dddd-dddd-dddddddddddd','D2',1000,30);

-- One appointment in each shop (customer → owner-barber).
insert into public.appointments (customer_id, barber_id, service_id, shop_id, start_time, end_time)
select 'c0000000-0000-0000-0000-000000000000','c1111111-1111-1111-1111-111111111111', s.id,
       'cccccccc-cccc-cccc-cccc-cccccccccccc', now(), now() + interval '30 min'
from public.services s where s.name = 'C1';
insert into public.appointments (customer_id, barber_id, service_id, shop_id, start_time, end_time)
select 'd0000000-0000-0000-0000-000000000000','d1111111-1111-1111-1111-111111111111', s.id,
       'dddddddd-dddd-dddd-dddd-dddddddddddd', now(), now() + interval '30 min'
from public.services s where s.name = 'D1';

-- Banners: 2 for C, 1 for D.
insert into public.banners (shop_id, image_url, sort_order) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','c-1',0),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','c-2',1),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','d-1',0);

-- New-feature rows: one per shop, to prove tenant isolation extends to them.
insert into public.reviews (shop_id, appointment_id, customer_id, barber_id, rating)
select 'cccccccc-cccc-cccc-cccc-cccccccccccc',
       (select id from public.appointments where shop_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' limit 1),
       'c0000000-0000-0000-0000-000000000000','c1111111-1111-1111-1111-111111111111', 5;
insert into public.reviews (shop_id, appointment_id, customer_id, barber_id, rating)
select 'dddddddd-dddd-dddd-dddd-dddddddddddd',
       (select id from public.appointments where shop_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' limit 1),
       'd0000000-0000-0000-0000-000000000000','d1111111-1111-1111-1111-111111111111', 4;

insert into public.time_off (shop_id, barber_id, starts_at, ends_at) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','c1111111-1111-1111-1111-111111111111', now() + interval '1 day', now() + interval '1 day 1 hour'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','d1111111-1111-1111-1111-111111111111', now() + interval '1 day', now() + interval '1 day 1 hour');

insert into public.promo_codes (shop_id, code, kind, value) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','CWELCOME','percent',10),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','DWELCOME','percent',10);

insert into public.portfolio_images (shop_id, barber_id, image_url) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc','c1111111-1111-1111-1111-111111111111','c-p1'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd','d1111111-1111-1111-1111-111111111111','d-p1');

insert into public.waitlist (shop_id, customer_id, barber_id, service_id, desired_date)
select 'cccccccc-cccc-cccc-cccc-cccccccccccc','c0000000-0000-0000-0000-000000000000','c1111111-1111-1111-1111-111111111111',
       (select id from public.services where name = 'C1'), current_date + 1;
insert into public.waitlist (shop_id, customer_id, barber_id, service_id, desired_date)
select 'dddddddd-dddd-dddd-dddd-dddddddddddd','d0000000-0000-0000-0000-000000000000','d1111111-1111-1111-1111-111111111111',
       (select id from public.services where name = 'D1'), current_date + 1;

-- ---- As Shop C customer -------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"c0000000-0000-0000-0000-000000000000","role":"authenticated"}';

select is((select count(*) from public.profiles)::int, 2, 'C customer sees only shop C profiles');
select is((select count(*) from public.barber_profiles)::int, 1, 'C customer sees only shop C staff');
select is((select count(*) from public.services)::int, 3, 'C customer sees only shop C services');
select is((select count(*) from public.appointments)::int, 1, 'C customer sees only own appointment');
select is((select count(*) from public.banners)::int, 2, 'C customer sees only shop C banners');
select is((select count(*) from public.shops)::int, 1, 'C customer sees only its own shop row');
select is((select count(*) from public.profiles where shop_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd')::int,
          0, 'C customer cannot see shop D profiles');

-- New tenant tables are isolated too.
select is((select count(*) from public.reviews)::int, 1, 'C customer sees only shop C reviews');
select is((select count(*) from public.time_off)::int, 1, 'C customer sees only shop C time-off');
select is((select count(*) from public.promo_codes)::int, 1, 'C customer sees only shop C promo codes');
select is((select count(*) from public.portfolio_images)::int, 1, 'C customer sees only shop C portfolio');
select is((select count(*) from public.waitlist)::int, 1, 'C customer sees only own waitlist entry');

-- ---- As Shop D customer -------------------------------------------------
set local "request.jwt.claims" to '{"sub":"d0000000-0000-0000-0000-000000000000","role":"authenticated"}';

select is((select count(*) from public.barber_profiles)::int, 1, 'D customer sees only shop D staff');
select is((select name from public.shops), 'Shop D', 'D customer sees only shop D');

-- ---- Owner-only writes ---------------------------------------------------
-- Non-owner (C customer) cannot rename the shop (RLS update affects 0 rows).
set local "request.jwt.claims" to '{"sub":"c0000000-0000-0000-0000-000000000000","role":"authenticated"}';
update public.shops set name = 'HACKED' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select is((select name from public.shops where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
          'Shop C', 'non-owner cannot rename the shop');

-- Non-owner cannot insert a banner (WITH CHECK violation).
select throws_ok(
  $$insert into public.banners (shop_id, image_url) values ('cccccccc-cccc-cccc-cccc-cccccccccccc','hack')$$,
  '42501', null, 'non-owner cannot insert a banner');

-- Owner can rename the shop.
set local "request.jwt.claims" to '{"sub":"c1111111-1111-1111-1111-111111111111","role":"authenticated"}';
update public.shops set name = 'Shop C2' where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select is((select name from public.shops where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
          'Shop C2', 'owner can rename the shop');

-- ---- Anon branding -------------------------------------------------------
set local role anon;
select is(
  (select count(*) from public.shop_public
   where id in ('cccccccc-cccc-cccc-cccc-cccccccccccc','dddddddd-dddd-dddd-dddd-dddddddddddd'))::int,
  2, 'anon can read branding for any shop via shop_public');

select * from finish();
rollback;
