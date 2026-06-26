# Barber App (white-label)

A **white-label**, two-sided barber booking app built with Expo (SDK 54) + Supabase.
Each client build is **one barbershop**: customers enter directly into that shop, pick a
staff barber, and book — there is no cross-shop catalog.

- **Customers** see the shop's branding + promo banners, pick a barber, view services, book open slots, and manage their appointments.
- **Barbers (staff)** manage their service catalog, working hours, and profile; confirm/complete incoming appointments.
- **The shop owner** additionally self-serves branding (colors, logo) and promo banners from an in-app **Marca** tab — no rebuild needed.

### White-label architecture

- **Shared backend, multi-tenant.** One Supabase project hosts many shops; every domain table carries a `shop_id` and **RLS isolates each shop** (see [supabase/tests/rls_isolation_test.sql](supabase/tests/rls_isolation_test.sql)).
- **One build per client.** Each app is pinned to a shop via `EXPO_PUBLIC_SHOP_ID` and branded per client via [app.config.ts](app.config.ts).
- **Runtime theming.** Colors/logo are stored per shop and fetched on launch (works pre-login via the `shop_public` view); the default palette is the "Classic Barbershop" system in [constants/theme.ts](constants/theme.ts).

> One email = one account = one shop (`auth.users` is global to the project). A person
> using two of these apps with the same email collides — documented limitation.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** (shared across all clients) at [supabase.com](https://supabase.com),
   then apply every migration in [supabase/migrations/](supabase/migrations/) in order
   (0001 → 0004). Optionally run [supabase/seed.sql](supabase/seed.sql) for a demo shop + staff (dev only).

   For local dev sign-up to log you in immediately, disable "Confirm email" under
   **Authentication → Providers → Email**.

3. **Configure env** — copy the example and fill in the shared project credentials plus this
   build's shop id:
   ```bash
   cp .env.example .env
   ```
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   EXPO_PUBLIC_SHOP_ID=<the shops.id this build serves>   # local seed: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
   ```

4. **Run**
   ```bash
   npx expo start
   ```

## Tests

```bash
npm test                 # jest — pure logic (availability, formatting, branding merge, config, ownership)
npx supabase test db     # pgTAP — RLS tenant isolation across two shops (needs the local stack)
```

The local Supabase stack (`npx supabase start`, Docker required) applies the migrations + seed
and backs `supabase test db`.

## Onboarding a new client (per-build runbook)

1. **Create the shop row** in the shared project:
   `insert into shops (name, location) values ('Their Shop', 'City') returning id;`
2. **Set the build env**: `EXPO_PUBLIC_SHOP_ID=<that id>` and the per-client identity for
   [app.config.ts](app.config.ts): `CLIENT_NAME`, `CLIENT_SLUG`, `CLIENT_SCHEME`,
   `CLIENT_ICON`/`CLIENT_SPLASH` (assets under `assets/clients/<client>/`),
   `CLIENT_IOS_BUNDLE`/`CLIENT_ANDROID_PACKAGE`.
3. **Owner signs up** (Barbeiro role) in the app, then set them as owner:
   `update shops set owner_id = '<their profiles.id>' where id = '<shop id>';`
4. The owner opens the **Marca** tab to set colors, logo and banners (no rebuild needed).
5. **Build & submit** that client's app (e.g. an EAS build profile carrying the env above).
   Migrations are applied **once** to the shared project, not per client.

## Demo logins (after running the seed — shop "The Sharp Edge")

| Role             | Email            | Password    |
| ---------------- | ---------------- | ----------- |
| Barber (owner)   | marcus@demo.test | password123 |
| Barber (staff)   | tony@demo.test   | password123 |
| Customer         | joao@demo.test   | password123 |

Sign in as the owner to see the **Marca** tab; staff and customers don't.

## Project structure

```
app.config.ts          per-client (white-label) build config over app.json defaults
app/
  _layout.tsx          Providers (branding, session, react-query, theme) + role-based guards
  (auth)/              sign-in, sign-up (role picker; barbers give a staff title)
  (customer)/          shop home (logo · banners · staff) · barber detail · booking · appointments · profile
  (barber)/            schedule · services (CRUD) · profile · Marca (owner-only branding admin)
  catalog.tsx          dev-only design-system showcase (/catalog)
components/ui/         design system: tokens-driven primitives + domain components
constants/theme.ts     default design tokens (the runtime branding merges onto these)
contexts/
  branding.tsx         BrandingProvider — fetches shop branding, drives the runtime theme
  session.tsx          auth state + profile (role, shop_id)
lib/
  config.ts            EXPO_PUBLIC_SHOP_ID (this build's shop)
  branding.ts          mergeBranding() — overrides onto the default palette (unit-tested)
  shop.ts / uploads.ts ownership predicate + storage paths + image upload
  queries.ts           react-query hooks (shop, banners, staff, services, appointments)
supabase/              migrations · seed · pgTAP RLS tests
```

## Notes

- Web export uses static rendering (`web.output`), which doesn't play well with
  AsyncStorage-backed auth during prerender. The app targets iOS/Android; run those for the full
  experience.
