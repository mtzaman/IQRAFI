# IQRAFI

**Read. Complete. Together.** · *The Qur'an, together.*

IQRAFI helps Muslims turn individual Qur'an reading into a shared act of worship. Someone
starts a Khatma, invites their people, and IQRAFI shares the 30 Juz between readers. Each
reader finishes their part, and the group completes the Qur'an together.

The app is calm on purpose. It has no leaderboards, points, streaks, guilt or public shaming.

---

## What's built

| Area | Status |
| --- | --- |
| Email/password auth (Argon2id, DB sessions, rate limiting); Google & Apple OAuth (enabled via env) | ✅ |
| Onboarding (4 screens → choice → sign-up) | ✅ |
| Home: current Khatma, today's Juz, continue reading, group progress, open Juz, global progress | ✅ |
| Khatma creation: name, schedule (daily / 2 / 3 days / weekly / custom), start date, timezone, automatic/manual, recurring, rotation, Ramadan | ✅ |
| Assignment engine (1…30+ members, even contiguous blocks, rotation, resting readers when >30) | ✅ |
| Invitations: link, QR, WhatsApp, Telegram, email, native share, expiry & max uses, revoke | ✅ |
| Roles (owner/admin/member), reassignment, rebalance, leave/remove, ownership transfer, soft delete | ✅ |
| Incomplete Juz: ask for help, release to pool, volunteer takeover (audited), overdue claiming | ✅ |
| Qur'an reader: verified Uthmani text, surah/Juz/ayah navigation, search, bookmarks, last-read, progress, font size, light/dark/sepia, translation toggle | ✅ |
| Deliberate completion, idempotent + race-safe Khatma completion, auto-rotated next cycle | ✅ |
| Completion screen, optional share, dedications (private by default, group, public with confirmation), dedication history | ✅ |
| "The World Is Reading" global statistics (real data, counters + scheduled reconciliation) | ✅ |
| Gentle in-app notifications with preferences (email/push adapters pluggable) | ✅ |
| Profile, "Your Qur'an journey" (private reflection), settings, GDPR export, account deletion | ✅ |
| English / Arabic / Urdu UI with full RTL | ✅ |
| Admin dashboard: stats, reports, moderation, suspend users, system health | ✅ |
| Tests: unit, PostgreSQL integration, Playwright end-to-end (mobile + desktop) | ✅ |

## Stack and key decisions

- **Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4.** Server components
  render data. Mutations are server actions, which get built-in origin checks against CSRF.
- **PostgreSQL + Drizzle ORM.** Any Postgres works, including **Supabase** (just point
  `DATABASE_URL` at it). Migrations live in `drizzle/`. RLS is enabled on every table as
  defence in depth, so Supabase's `anon`/`authenticated` roles cannot reach app data directly.
- **Auth.** Uses database sessions, following the pattern recommended by the Lucia project.
  Only a SHA-256 hash of each session token is stored. Passwords use Argon2id
  (`@node-rs/argon2`). Google and Apple sign-in go through `arctic`, and only verified emails
  are linked. A managed provider such as Supabase Auth could replace this layer later without
  touching the domain services.
- **The database is authoritative.** Every Khatma mutation locks the Khatma row first. So when
  the last Juz are completed at the same moment, exactly one transaction finalises the Khatma.
  Unique indexes guarantee that each Juz appears exactly once per Khatma, and that a group has
  at most one active Khatma.
- **Clean layering.** `src/lib` holds pure logic (engine, permissions, validation, schedule).
  `src/server/services` holds business rules and authorization. `src/app/actions` holds thin
  server actions. `src/app` holds UI. The services are framework-agnostic, ready for a future
  native app's API.

## Qur'an text

The Qur'an text is **never generated or edited**. See [`data/quran/SOURCES.md`](data/quran/SOURCES.md).

- Arabic text: Uthmani script (Hafs) from The Noble Qur'an Encyclopedia.
- English translation: Saheeh International.
- Juz/Hizb/page metadata: `quran-meta` (MIT).
- `npm run quran:validate` checks the dataset's structure (114/6,236/30/604/240/15) and a
  **pinned SHA-256 checksum**, so a single changed character fails.
- **Before launch:** have a qualified reviewer check the text against a printed mushaf.

## Getting started

Requirements: Node 20+ and PostgreSQL 14+.

```bash
cp .env.example .env          # used by scripts
cp .env.example .env.local    # used by Next.js
# create databases referenced by DATABASE_URL and TEST_DATABASE_URL, then:
npm install
npm run db:setup              # migrations + verified Qur'an seed
npm run db:seed:demo          # optional, development only (clearly labelled demo data)
npm run dev
```

Demo accounts (development only): `ahmed@demo.iqrafi.com` (platform admin), `sara@`, `ali@`,
`fatima@`, `yusuf@demo.iqrafi.com`, all with the password `demo-password-123`. The seed
contains one completed Khatma and a second Khatma in progress with 17/30 Juz done. Everything
was created through the real services, so global statistics reflect genuine database rows.
The Discover page labels demo data.

| Script | Purpose |
| --- | --- |
| `npm run check` | lint + typecheck + Qur'an validation + unit & integration tests |
| `npm test` | Vitest (unit + integration; integration uses `TEST_DATABASE_URL`, which is wiped) |
| `npm run test:e2e` | Playwright journey tests (set `PW_CHROMIUM_PATH` to use a preinstalled Chromium) |
| `npm run build` | Production build |
| `npm run admin:grant -- email@example.com` | Grant platform admin (the only way to get admin access) |
| `npm run stats:refresh` | Reconcile global statistics |
| `npm run quran:build` / `quran:validate` | Rebuild / verify the Qur'an dataset |

## Windows demo package (for testers)

`npm run desktop:build` produces `dist/IQRAFI-Demo-win-x64.zip`: `IQRAFI.exe` plus an `app` folder.
Testers extract it and double-click `IQRAFI.exe`; no Node.js or PostgreSQL install is needed.

- The exe is a Node.js single executable application that starts the bundled Next.js server
  (`output: "standalone"`) with an **embedded PostgreSQL (PGlite)** database
  (`DATABASE_URL=pglite:<dir>`). On first start it applies the same migrations and seeds the verified
  Qur'an and the labelled demo data (`IQRAFI_DEMO=1`, see `src/instrumentation.ts`).
- Data lives in `%LOCALAPPDATA%\IQRAFI-Demo`; `IQRAFI.exe --reset` starts over.
- People on the same network can join using the address the launcher prints.
- The build cross-compiles from Linux/macOS too, or run the **Windows demo package** GitHub workflow.
- The exe is unsigned, so Windows SmartScreen shows a warning. Sign it before wider distribution.

## Deployment (e.g. Vercel + Supabase)

1. Create a Supabase project and use its Postgres connection string as `DATABASE_URL`.
2. Set `APP_URL`, `CRON_SECRET` and, optionally, the Google/Apple credentials. Secrets are
   never committed.
3. Run `npm run db:setup` against production once.
4. Schedule `POST /api/cron/stats` with `Authorization: Bearer $CRON_SECRET`, for example
   every 5 minutes.
5. Grant yourself admin with `npm run admin:grant -- you@example.com`.

## Documentation

- [Architecture & data model](docs/ARCHITECTURE.md)
- [Product principles & roadmap](docs/PRODUCT.md)

---

*IQRAFI is a technology product, not a source of religious authority. It is built with the hope
of becoming a source of ongoing benefit.*
