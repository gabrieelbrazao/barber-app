-- Dev seed: two demo barbers with services. Run AFTER 0001_init.sql.
-- Creates real auth users so the handle_new_user() trigger builds their profiles
-- and barber_profiles from metadata; we then enrich those rows and add services.
--
-- Demo logins (email / password):
--   marcus@demo.test  / password123
--   tony@demo.test    / password123
--
-- NOTE: dev-only. Inserting directly into auth.users is intended for local/test projects.

-- Fixed UUIDs so re-running stays idempotent.
-- Marcus: 11111111-1111-1111-1111-111111111111
-- Tony:   22222222-2222-2222-2222-222222222222

-- NOTE: the token columns must be '' (not NULL). GoTrue scans them as non-nullable
-- strings, so a NULL there makes login 500 with "converting NULL to string is unsupported".
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
   '{"full_name":"Marcus Cole","role":"barber","shop_name":"The Sharp Edge"}',
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'tony@demo.test',
   crypt('password123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}',
   '{"full_name":"Tony Russo","role":"barber","shop_name":"Russo & Sons"}',
   '', '', '', '', '', '', '', '')
on conflict (id) do nothing;

-- Email/password identities (required for login on recent Supabase versions).
insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"marcus@demo.test"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"tony@demo.test"}', 'email', now(), now(), now())
on conflict do nothing;

-- Enrich the barber_profiles the trigger created.
update public.barber_profiles set
  bio = 'Master barber, 12 years on the chair. Specializing in skin fades and classic scissor work.',
  location = 'Downtown'
where id = '11111111-1111-1111-1111-111111111111';

update public.barber_profiles set
  bio = 'Old-school hot-towel shaves and timeless cuts. Family shop since 1998.',
  location = 'Riverside'
where id = '22222222-2222-2222-2222-222222222222';

-- Services.
insert into public.services (barber_id, name, price_cents, duration_minutes)
values
  ('11111111-1111-1111-1111-111111111111', 'Classic Cut', 3500, 45),
  ('11111111-1111-1111-1111-111111111111', 'Skin Fade', 4000, 45),
  ('11111111-1111-1111-1111-111111111111', 'Beard Trim', 1500, 20),
  ('22222222-2222-2222-2222-222222222222', 'Scissor Cut', 3800, 50),
  ('22222222-2222-2222-2222-222222222222', 'Hot Towel Shave', 3000, 40),
  ('22222222-2222-2222-2222-222222222222', 'Cut & Shave', 6000, 75)
on conflict do nothing;
