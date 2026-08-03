-- Dev seed: ONE demo shop ("The Sharp Edge") with two staff barbers, a customer,
-- services and banners. Run AFTER the migrations. The app's EXPO_PUBLIC_SHOP_ID
-- for local dev must equal the shop id below.
--
-- Demo shop id: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- Demo logins (email / password):
--   marcus@demo.test  / password123   (barber, shop owner)
--   tony@demo.test     / password123   (barber, staff)
--   joao@demo.test     / password123   (customer)
--
-- NOTE: dev-only. Inserting directly into auth.users is intended for local/test projects.

-- Shop first (profiles.shop_id and barber_profiles.shop_id FK it). owner_id is set
-- after the owner's user exists.
insert into public.shops (id, name, location, colors)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'The Sharp Edge', 'Downtown', '{}'::jsonb)
on conflict (id) do nothing;

-- Auth users. handle_new_user() builds profiles (+ barber_profiles) from metadata,
-- stamping shop_id so they join the demo shop.
-- NOTE: token columns must be '' (not NULL) — GoTrue scans them as non-nullable strings.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'marcus@demo.test',
   crypt('password123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Marcus Cole","role":"barber","title":"Master Barber","shop_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}',
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'tony@demo.test',
   crypt('password123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Tony Russo","role":"barber","title":"Senior Barber","shop_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}',
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'joao@demo.test',
   crypt('password123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"João Silva","role":"customer","shop_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}',
   '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

-- Email/password identities (required for login on recent Supabase versions).
insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"marcus@demo.test"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"tony@demo.test"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   '{"sub":"33333333-3333-3333-3333-333333333333","email":"joao@demo.test"}', 'email', now(), now(), now())
on conflict do nothing;

-- Marcus owns the shop.
update public.shops
  set owner_id = '11111111-1111-1111-1111-111111111111'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Enrich the barber_profiles the trigger created. New staff default to
-- approved = false, which would leave the demo shop with no bookable barbers.
update public.barber_profiles set
  bio = 'Master barber, 12 years on the chair. Specializing in skin fades and classic scissor work.',
  approved = true
where id = '11111111-1111-1111-1111-111111111111';

update public.barber_profiles set
  bio = 'Old-school hot-towel shaves and timeless cuts. Family shop since 1998.',
  approved = true
where id = '22222222-2222-2222-2222-222222222222';

-- Services (scoped to the shop).
insert into public.services (barber_id, shop_id, name, price_cents, duration_minutes)
values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Classic Cut', 3500, 45),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Skin Fade', 4000, 45),
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Beard Trim', 1500, 20),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Scissor Cut', 3800, 50),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hot Towel Shave', 3000, 40),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Cut & Shave', 6000, 75)
on conflict do nothing;

-- Promo banners.
insert into public.banners (shop_id, image_url, title, sort_order, active)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://picsum.photos/seed/sharpedge1/800/400', '20% off skin fades this week', 0, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://picsum.photos/seed/sharpedge2/800/400', 'Hot towel shave — book now', 1, true)
on conflict do nothing;
