# Agent guide

Expo SDK 54 + expo-router v6 + Supabase. Read the exact versioned docs at
https://docs.expo.dev/versions/v54.0.0/ before writing app code — the SDK moved a lot and
older Expo answers are usually wrong here.

## Commands

```bash
npm start            # Metro (dev client, not Expo Go — Stripe and notifications are native)
npm run lint         # eslint over app components hooks lib contexts
npx tsc --noEmit     # typecheck
npm test             # jest
supabase start       # local stack; apply supabase/migrations in order, then seed.sql
```

## Conventions

- Code, comments and commit messages in English. User-facing copy is **pt-BR** — check
  neighbouring strings before adding one.
- Screens live under `app/(auth|customer|barber)/`; shared UI in `components/ui/`; data
  access and Supabase queries in `lib/`.
- Colors come from the branding context (`useColors`), never from a hardcoded hex.
- Conventional Commits, one logical change per commit.

## Constraints worth knowing

- **Multi-tenancy is enforced by RLS**, not by client-side filters. A new table needs a
  `shop_id`, a policy, and a case in `supabase/tests/rls_isolation_test.sql`.
- **Android is edge-to-edge**, so the legacy `adjustResize` is gone: `KeyboardAvoidingView`
  needs an explicit `behavior="padding"` on both platforms.
- Nested stacks must repeat `headerShown: false` on the group screen; an inherited
  `screenOptions` leaves the option undefined and native-stack then zeroes the top inset.
- Stripe is native-only: `lib/stripe.ts` re-exports the SDK and `lib/stripe.web.ts` keeps
  the web bundle building with inert stand-ins.
