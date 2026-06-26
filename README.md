# Barber App

A two-sided barber booking app built with Expo (SDK 54) + Supabase.

- **Customers** browse barbers, view services, book open time slots, and manage their appointments.
- **Barbers** manage their service catalog and working hours, and confirm/complete incoming appointments.

Look & feel: a "Classic Barbershop" design system (warm charcoal + gold, serif headings) with full
light/dark support, built from reusable components in [components/ui/](components/ui/).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then in the SQL editor run:
   - [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) — tables, the new-user trigger, and RLS policies
   - [supabase/seed.sql](supabase/seed.sql) — optional demo barbers + services (dev only)

   For local dev sign-up to log you in immediately, disable "Confirm email" under
   **Authentication → Providers → Email** (otherwise sign-up requires email confirmation first).

3. **Configure env** — copy the example and fill in your project's API credentials
   (Project Settings → API):
   ```bash
   cp .env.example .env
   ```
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

4. **Run**
   ```bash
   npx expo start
   ```

## Demo logins (after running the seed)

| Role   | Email             | Password    |
| ------ | ----------------- | ----------- |
| Barber | marcus@demo.test  | password123 |
| Barber | tony@demo.test    | password123 |

Create a customer account through the **Sign up** screen (pick the "Customer" role) to book with them.

## Project structure

```
app/
  _layout.tsx          Providers (session, react-query, theme) + role-based Stack.Protected guards
  (auth)/              sign-in, sign-up (with role picker)
  (customer)/          browse · barber detail · booking · appointments · profile
  (barber)/            schedule · services (CRUD) · shop profile + working hours
  catalog.tsx          dev-only design-system showcase (/catalog)
components/ui/         design system: tokens-driven primitives + domain components
constants/theme.ts     design tokens (colors, spacing, radius, fonts)
contexts/session.tsx   auth state + profile (role)
lib/                   supabase client, react-query hooks, availability logic, formatting
supabase/              schema migration + seed
```

## Notes

- Web export uses static rendering (`app.json` → `web.output`), which doesn't play well with
  AsyncStorage-backed auth during prerender. The app targets iOS/Android; run those for the full
  experience.
