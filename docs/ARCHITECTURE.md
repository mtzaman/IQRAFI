# Architecture

```
src/
  app/                 Next.js routes (UI), server actions (app/actions), API routes (app/api)
    (app)/             Signed-in shell: home, groups, khatma, quran index, discover, profile, admin
    (reader)/          Immersive reader: /quran/juz/[n], /quran/surah/[n]
    (auth)/            Login / signup;  auth/* = OAuth handlers
    invite/[token]     Public invitation page;  welcome = onboarding;  / = landing
  components/          Design system (ui/), brand, app shell, khatma & reader components
  i18n/                Typed dictionaries (en source of truth; ar, ur), RTL, formatting
  lib/                 Pure logic: db schema, assignment engine, schedule, permissions, validation, Qur'an validation
  server/              Auth (sessions, OAuth), rate limiting, errors, services (business rules), Qur'an data access
  proxy.ts             Edge gate for private routes (optimistic cookie check)
data/quran/            Verified dataset + sources
drizzle/               SQL migrations (incl. RLS)
scripts/               Migrate, seed, dataset build/validate, admin grant, stats refresh
tests/                 unit/ (pure), integration/ (real PostgreSQL), e2e/ (Playwright)
```

## Data model (PostgreSQL)

- `users`, `sessions` (hashed ids), `oauth_accounts`
- `groups` (timezone, schedule, `cycle_days`, mode, recurring, rotate, kind, soft delete) · `group_members` (role, status)
- `khatmas` (cycle number, start/due dates in the group's timezone, status). A partial unique index allows one active Khatma per group.
- `assignments` (one row per Juz per Khatma, enforced unique; current reader, original reader, progress, help request, completion). `user_id = NULL` means the Juz is in the available pool.
- `assignment_events`: audit trail of assignments, claims, volunteer takeovers, releases and reassignments
- `reading_progress` (per user per Juz) · `bookmarks` · `users.last_read_ayah_id`
- `dedications` (private/group/public; a check constraint requires explicit confirmation for public)
- `invitations` (token, expiry, max uses, revocation)
- `notifications` · `reports` · `user_blocks`
- `global_counters`, `daily_stats` (aggregates) · `analytics_events` (anonymous, consent-only) · `rate_limits`
- `surahs`, `juz`, `ayahs`: Qur'an reference data (public read-only RLS policy)

All timestamps are `timestamptz` (UTC). Khatma dates are calendar dates in the group's timezone.

## Assignment engine (`src/lib/khatma/engine.ts`)

- *n ≤ 30:* 30 Juz are split into *n* contiguous blocks whose sizes differ by at most one (10 members → 3 each; 7 → 5,5,4,4,4,4,4). With rotation, member *i* takes block *(i + cycle − 1) mod n*.
- *n > 30:* a rotating window of 30 readers takes one Juz each. The others "rest" and are first in line next cycle.
- `verifyDistribution` runs before every insert. The DB unique index is the final guarantee.
- `distributeSubset` rebalances only Juz nobody has started, for example after people join or leave.

## Lifecycle

1. Create a group (the owner becomes a member, and an open invitation is created). The group then gathers readers.
2. An owner or admin presses **Assign Juz and begin**. Cycle 1 starts: 30 assignment rows are created and readers are notified.
3. Reading records progress through `/api/reading-progress`. Progress is monotonic and capped at 99%.
4. **Mark complete** asks for confirmation and is idempotent. Under the Khatma lock it marks the Juz complete, bumps the counters, and checks for completion.
5. On completion the Khatma is finalised, the group is notified, and, if the group is recurring, the next cycle starts with rotated assignments.
6. Leaving, removal or account deletion returns unfinished Juz to the pool and notifies admins. Members can claim pooled, help-requested or overdue Juz.

## Statistics

Completion counters are incremented inside the completing transaction. `refreshGlobalStats()` reconciles every figure from source rows. It runs on a schedule (`/api/cron/stats`) and also as a safety net when snapshots are older than 10 minutes. Reads come from a tiny table cached for 60 seconds. There are no rankings or per-entity comparisons.

## Security

- Every mutation checks identity, membership and role on the server (`requireGroupPermission`, `can()`).
- Zod validation strips control characters, and React escapes all output.
- Rate limits are Postgres-backed, so they work across instances: login, signup, mutations, invitations, reports and progress.
- Server actions get origin checks. The JSON progress endpoint checks same-origin itself. The cron endpoint uses a constant-time secret comparison.
- Session cookies are HttpOnly and SameSite=Lax, and Secure in production. Redirects after sign-in only allow same-site paths.
- Security headers include HSTS, `X-Frame-Options: DENY`, nosniff, referrer policy and permissions policy.
- Platform admin can only be granted from the CLI.

## Offline & native readiness

- The reader saves its position to `localStorage` immediately and syncs it to the server, retrying when back online and using `sendBeacon` when the page hides.
- Completion is never recorded offline. The button waits for connectivity, and the server action is idempotent, so retries are safe.
- The domain services have no framework coupling, so they can sit behind a REST/RPC API for the future iOS/Android apps. A PWA manifest is included.

## Extensibility

- **Languages:** add a dictionary that satisfies `Dictionary` and register it in `i18n/config.ts`. RTL is driven by the `DIRECTION` map.
- **Notification channels:** call `registerDeliveryAdapter({ channel: "email" | "push", deliver })`.
- **Translations/tafsir/audio:** the dataset carries a translation column. Add per-edition tables keyed by ayah id, with attribution.
- **Ramadan:** `groups.kind = 'ramadan'` means a 30-day, non-recurring Khatma, and the home screen shows the Ramadan day.
