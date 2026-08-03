# Sahn

An Islamic platform built as a courtyard: an assistant at the centre, ten
modules around it.

**Sahn does not issue rulings.** It retrieves, cites and explains. Every fiqh
answer traces to a named source and school, or it is not given.

## Status — Phases 1 and 2 complete

Phase 2 modules, all computing on the device with no API:

- **M1** prayer times (six calculation methods, asr madhhab, high-latitude and
  polar rules), next-prayer countdown, Qibla bearing and live compass
- **M2** salah tracker: five daily slots, streak, qada ledger, thirty-day grid
- **M7** Hijri calendar: Umm al-Qura conversion, key dates, recommended fasts

Not done in M1: **Web Push notifications.** They need VAPID keys, a service
worker and a scheduled sender, none of which can be tested before a deploy.

## Phase 1 (foundation)

Shipped:

- Next.js 15 App Router + TypeScript + Tailwind v4
- `next-intl` with `en` / `ar`, `dir` driven from the locale, logical properties
  throughout
- Design tokens, light and dark, from the spec palette
- The courtyard rail (desktop) and module grid (mobile), cut from an eight-point
  girih star
- Ten empty module routes, plus the assistant and a localized 404
- Supabase auth (email link), server/browser/middleware clients
- Full schema with RLS in `supabase/migrations/0001_init.sql`, applied to the
  live project and verified: 13 tables, RLS on all 13, no table without a policy

### Migrations

`supabase login` / `link` are not needed — `db push` takes the connection
string directly:

```bash
set -a; . ./.env.local; set +a
npx supabase db push --db-url "$SUPABASE_DB_URL"
```

`SUPABASE_DB_URL` must be the **session-mode pooler** host
(`aws-0-eu-west-1.pooler.supabase.com:5432`, user `postgres.<project-ref>`).
The direct host the dashboard shows, `db.<ref>.supabase.co`, publishes only an
AAAA record and will not resolve on an IPv4-only network.

Not started: every module's actual behaviour, the chat classifier, retrieval.
See the build spec, section 8, for phase order.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys
npm run dev
```

The shell runs without Supabase credentials — auth is the only part that needs
them.

```bash
npm test        # message parity, direction, numerals, route coverage
npm run typecheck
npm run build
```

## Rules that outlive Phase 1

- **No business logic in components.** Everything goes through `/app/api/*` so a
  React Native client can call the same routes unchanged.
- **No hardcoded strings.** Every string lives in `messages/{en,ar}.json`. A
  missing key throws in development rather than rendering a key path.
- **No directional utilities.** `ps-*` / `me-*` / `text-start`, never `pl-*` /
  `mr-*` / `text-left`. The lint config also blocks `next/link` in favour of the
  locale-aware `Link` in `src/i18n/navigation.ts`.
- **No bare numbers in messages.** `Intl.NumberFormat('ar')` emits Western
  digits; format through `formatNumber` in `src/lib/format.ts`, which uses
  `ar-EG-u-nu-arab`.
- **Quranic text is never set in the UI face.** Use the `.quran` class
  (Amiri Quran, line-height 2.2).
- **Motion budget:** the rail's load stagger and, later, the tasbih press.
  Nothing else animates. `prefers-reduced-motion` is respected globally.
- **RLS is default deny.** Personal worship data is owner-only and never enters
  chat context without an explicit user action.

## Layout

```
messages/            en.json, ar.json — every user-facing string
src/i18n/            routing, request config, locale-aware navigation
src/lib/girih.ts     the eight-point star the doorways are cut from
src/lib/modules.ts   the ten modules, rail order, phase and tier
src/components/      shell: rail, grid, doorway, courtyard plan, switcher
src/app/[locale]/    landing, chat, sign-in, ten module routes, 404
supabase/migrations/ schema and RLS
```

## Node

This machine runs Node from `~/.local/node` (Homebrew's prefix was not
writable). `~/.zshrc` puts it on `PATH`.
