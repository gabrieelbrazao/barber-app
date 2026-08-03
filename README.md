# Barber App (white-label)

A **white-label**, two-sided barber booking app built with Expo (SDK 54) + Supabase.
Each client build is **one barbershop**: customers enter directly into that shop, pick a
staff barber, and book — there is no cross-shop catalog.

- **Customers** see the shop's branding + promo banners, pick a barber, view services + ratings + portfolio, book open slots (applying a promo code), reschedule/cancel, get a local reminder before the appointment, review completed visits, track loyalty progress, and join a waitlist when a day is full.
- **Barbers (staff)** manage their service catalog (incl. an optional deposit), working hours, one-off time-off blocks, and profile/portfolio; confirm/complete/mark-no-show incoming appointments; and see their waitlist.
- **The shop owner** additionally self-serves branding (colors, logo) and promo banners from **Marca**, approves staff in **Equipe**, manages promo codes, and views KPIs (revenue, bookings, no-show rate, top services) in the **Painel** tab — no rebuild needed.

> New staff sign-ups start **unapproved** and are invisible/unbookable until the owner approves them in **Equipe** (closes a self-serve staff-injection hole). Local reminders fire only on a real device. Service deposits display and are recorded; charging them requires the Stripe setup below.

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
   (0001 → 0015). Optionally run [supabase/seed.sql](supabase/seed.sql) for a demo shop + staff (dev only).

   For local dev sign-up to log you in immediately, disable "Confirm email" under
   **Authentication → Providers → Email**. For production, also **enable leaked-password
   protection** under **Authentication → Policies** (HaveIBeenPwned check).

3. **Configure env** — copy the example and fill in the shared project credentials plus this
   build's shop id:
   ```bash
   cp .env.example .env
   ```
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   EXPO_PUBLIC_SHOP_ID=<the shops.id this build serves>   # local seed: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
   # Optional — only if you enable Stripe deposits (see "Deposits" below):
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_...
   ```

4. **Run** — the app bundles native modules (Stripe), so **Expo Go won't load it**; build a dev
   client once per platform, then iterate over it:
   ```bash
   eas build --profile development --platform android   # or ios
   npx expo start                                       # loads into the dev client
   ```

## Builds (EAS)

[eas.json](eas.json) defines four profiles. `base` holds the default client identity that every
profile inherits via `extends`; a per-client profile overrides those env vars (see
`client-sharp-edge` for the shape).

| Profile | Use | Output |
| --- | --- | --- |
| `development` | dev client for daily work | APK / simulator build, internal |
| `preview` | share with the client for review | APK, internal |
| `production` | store submission | AAB, `autoIncrement`, remote version source |
| `client-*` | one per white-label client | extends `production` with that client's env |

Secrets (`EXPO_PUBLIC_SUPABASE_*`) come from EAS environment variables per `environment`
(development/preview/production) — they are not in `eas.json`.

## Deposits (Stripe) — remaining setup

The schema (`services.deposit_cents`, `appointments.payment_status`/`payment_intent_id`), the two
edge functions ([supabase/functions/](supabase/functions/)), the owner/customer UI, and the client
PaymentSheet flow ([lib/payments.ts](lib/payments.ts), presented on booking when
`deposit_cents > 0`) all ship ready. What's left needs **your** Stripe/Supabase accounts:

1. **Function secrets:** `supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_...`
2. **Deploy:** `supabase functions deploy create-payment-intent` and
   `supabase functions deploy stripe-webhook --no-verify-jwt`; point a Stripe webhook at the latter.
3. **Publishable key:** set `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Without it `DEPOSITS_ENABLED` is
   false and booking silently skips the charge — deposits still display and are recorded.

The deposit amount is always recomputed server-side and the webhook is signature-verified, so the
client can never set its own price or mark itself paid.

## Tests

```bash
npm test                 # jest
npx supabase test db     # pgTAP — RLS tenant isolation across two shops (needs the local stack)
```

Jest covers pure logic (availability+blocks, reminders, promo, loyalty, analytics, formatting,
branding, config, ownership, payments) plus render tests for the UI kit and the booking screen.
[jest.setup.js](jest.setup.js) supplies the build-time env `lib/config.ts` requires and mocks
AsyncStorage's native module.

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
4. The owner opens **Marca** (colors, logo, banners, promo codes) and **Equipe** to **approve
   themselves and any staff** — unapproved staff don't appear to customers. KPIs live in **Painel**.
5. **Build & submit** that client's app: copy the `client-sharp-edge` profile in
   [eas.json](eas.json), swap in the env from step 2, then
   `eas build --profile client-<name> --platform all`. Migrations are applied **once** to the
   shared project, not per client.

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
eas.json               build profiles (development/preview/production + one per client)
app/
  _layout.tsx          Providers (branding, session, react-query, Stripe, theme) + role-based guards
  ErrorBoundary        exported from _layout.tsx — crash screen with a retry
  +not-found.tsx       unmatched routes
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
  payments.ts          Stripe PaymentSheet flow for service deposits
  queries.ts           react-query hooks (shop, banners, staff, services, appointments)
supabase/              migrations · seed · pgTAP RLS tests
```

## Notes

- Web export uses static rendering (`web.output`), which doesn't play well with
  AsyncStorage-backed auth during prerender. The app targets iOS/Android; run those for the full
  experience.
