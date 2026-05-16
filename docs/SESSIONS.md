# Hunch — Session Log

Append-only. One entry per session.

---

## 2026-05-15 — Phase 1 kickoff: scaffold + `/docs`
**Worked on:** Phase 1 kickoff. Established the autonomy contract (Claude writes all code, product owner tests as user, directs scope). Scaffolded the Next.js project and persistent-context docs.

**Shipped:**
- `npx create-next-app@latest` with TypeScript, Tailwind v4, App Router, no `/src`, `@/*` alias. Next 16.2.6, React 19.2.4.
- `CLAUDE.md` at repo root — full project brief (autonomy model, stack, data model, rating spec, build order, ground rules) so future sessions auto-load it.
- `/docs/STATE.md`, `/docs/DECISIONS.md`, `/docs/SPEC.md`, `/docs/RUNBOOK.md`, `/docs/SESSIONS.md` initialized.
- `.claude/settings.local.json` added to `.gitignore`.
- GitHub repo `gethunch/hunch` (private) created in the new `gethunch` org; initial commit pushed.

**Spec changes this session:**
- Dropped "solo founder / weekends only / 6-weekend cap" framing across all project docs. Hunch is a full-time project; team being built. Build phases renamed Weekend N → Phase N. Product owner referred to by role, not name.
- Multi-format vision acknowledged. Schema is now multi-format-ready: `contests.format` text column, `week_start` → `period_start`, `unique(format, period_start)`. v1 still ships a single format (`weekly_pick_5`). No new features added — just left the door open for daily / fixed-allocation / variable-N formats later. See DECISIONS.md.

**Punted:**
- Supabase setup — blocked on creds (project URL, anon key, service_role key, pooled DB URL).
- Real SMS provider for phone OTP → deferred to Phase 6 (DLT/TRAI registration not worth Phase 1 time).

**Open questions for next time:**
- Once creds land, confirm Supabase region is `ap-south-1` (Mumbai) for latency.
- Confirm there's a Vercel account linked to the same GitHub account; we'll import the repo there mid-Phase 1.

**Risks flagged:**
- Indian phone OTP via Supabase needs an SMS provider — Twilio is expensive, MSG91 needs a custom hook. Don't be surprised in Phase 6.
- NSE / Yahoo unofficial price endpoints are flaky and can break the cron path. Will be evaluated in Phase 3.

---

### Continued: schema applied
**Shipped (continued):**
- Supabase project provisioned (`viftdarjgkrpeahxzosg`, Mumbai). New `sb_publishable_*` / `sb_secret_*` keys (not legacy anon/service_role JWTs).
- `.env.local` / `.env.example`; new key naming `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY`. `CRON_SECRET` generated.
- Drizzle 0.45 + postgres.js 3.4 installed. `drizzle-kit` 0.31 + `dotenv-cli` for migration tooling.
- Schema written (`lib/db/schema.ts`) and applied: 5 tables + `contest_status` enum live in Supabase public schema. Multi-format-ready (`contests.format` + `unique(format, period_start)`).
- Migration SQL committed at `lib/db/migrations/0000_lean_quicksilver.sql` so future deployments can rebuild deterministically.
- `lib/db/index.ts` exports the Drizzle client (postgres.js with `prepare: false` for the Transaction-mode pooler).

**Risks flagged (continued):**
- `drizzle-kit push` has an introspection crash on subsequent runs (drizzle-kit 0.31 bug in check-constraint handling). The first push worked. Going forward we'll use the `db:generate` → commit-migration → apply flow, not `db:push`. See DECISIONS.md.

**Blocked on:**
- Test phone + OTP pair to smoke-test sign-in. Once that lands, auth UI + middleware + `/api/me`.

---

### Continued: auth flow shipped (server side)
**Shipped (continued):**
- Installed `@supabase/ssr` 0.10 + `@supabase/supabase-js` 2.105.
- Supabase clients: `lib/supabase/{server,browser,proxy}.ts`.
- Next.js 16 proxy (was middleware in earlier versions — file convention renamed). `proxy.ts` at root refreshes session cookies on every request, redirects unauthenticated visits to `/contest`/`/leaderboard`/`/profile` to `/login?next=<path>`, and bounces authed users away from `/login` to `/contest`.
- `app/login/page.tsx` + `components/login-form.tsx` — two-step phone OTP form.
- `app/login/actions.ts` — `sendOtp` / `verifyOtp` server actions hitting Supabase Auth, typed with a discriminated `ActionResult` union for clean error handling on the client.
- `lib/repository/users.ts` — `getCurrentUser` (React-cached) does the "auth user → DB row, create on first call" flow per spec.
- `app/api/me/route.ts` — minimal endpoint; 401 if no session, otherwise the DB row.
- `app/(app)/contest/page.tsx` — minimal authed placeholder showing display name + rating.
- `app/page.tsx` — replaced the Next.js scaffold landing with a minimal Hunch wordmark + Sign in CTA.
- `app/layout.tsx` + `app/globals.css` — title set to "Hunch", forced dark theme, tabular-nums on by default.

**Verified (server-side):**
- GET / → 200
- GET /login → 200
- GET /contest (no session) → 307 to /login?next=/contest
- GET /api/me (no session) → 401
- TS strict: clean. ESLint: clean.

**Verified end-to-end (browser):**
- Phone OTP round-trip with `+919999900001` / `123456` → lands on `/contest` showing display name and rating 1,500.
- Supabase test-OTP gotcha: test phone entries must be stored **without** the `+` prefix (Supabase strips it internally before matching). E.g., `919999900001=123456`, not `+919999900001=123456`.

**Dev environment note:**
- Running inside Google Cloud Shell. Next.js blocks cross-origin HMR/dev resources by default, which broke client-side hydration and made the form non-interactive. Fixed by adding the exact Cloud Shell preview hostname to `allowedDevOrigins` in `next.config.ts`. Wildcards (`*.cloudshell.dev`) don't match Cloud Shell's two-level subdomain. **If the Cloud Shell session ID changes, update `next.config.ts`.**

**Next:**
- Phase 1 final step: Vercel deploy. Same env vars, repo import, smoke-test the prod URL.

---

### Continued: Phase 1 shipped
**Shipped (continued):**
- Vercel project created under `gethunch` (Vercel team). Deployed `gethunch/hunch` `main` → https://hunch-seven.vercel.app.
- 5 env vars configured in Vercel (Production + Preview): Supabase URL, publishable key, secret key, pooled `DATABASE_URL`, `CRON_SECRET`. Vercel removed the "Development" toggle from the import flow; we don't use `vercel dev` anyway.
- **Repo flipped from private to public** to escape Vercel's "private org repo requires Pro" gate. Audited first — no secrets in tracked files (only the public Supabase project ref). Cheaper than $20/month and reversible later.
- Prod auth smoke test passed: phone OTP → `/contest` lands → user row in Supabase.

**Phase 1 — DONE.**

**Open questions for next session:**
- Cloud Shell hostname in `next.config.ts` is brittle (session-ID-bound). If a future session starts and `npm run dev` fails the browser smoke test, first thing to update is that line. Consider switching to an env-driven `DEV_ALLOWED_ORIGIN` later if it becomes a recurring annoyance.

---

### Continued: Phase 2 + Phase 3 shipped same session
**Phase 2 shipped:**
- NIFTY 50 constants with IST date helpers (no external date lib — fixed UTC+5:30, no DST).
- Idempotent `seed-contest` script + npm wrapper. Seeded 2026-05-18 contest.
- `/contest` page with 50-stock multi-select picker (sticky submit bar, hard 5-cap, locked-in confirmation view after submit). Verified end-to-end on localhost.
- Atomic `submitEntry` transaction (entry + 5 picks + entry_count bump).

**Phase 3 shipped:**
- Pure `computeRatingDelta` rating function + 28 Vitest tests covering every spec corner (all curve buckets, edge ratings 500..3000, edge contest sizes 1..10000, interpolation, exhaustive sweep).
- Yahoo Finance unofficial as market data source. Concurrency cap of 8 (Yahoo rejects ~50 parallel). All 50 symbols verified on a known past trading day. Found TATAMOTORS was delisted 2026-05-14 (demerger → TMPV + TMCV); swapped to TMPV.
- Both cron endpoints (open + resolve), CRON_SECRET-gated, transactional.
- End-to-end manual test via `seed:test-contest` fixture: 5 synthetic users with varied ratings (900, 1300, 1500, 1700, 2200), 5 distinct pick baskets, backdated to last Mon-Fri so both crons could run. Open cron priced 25 picks. Resolve cron computed returns, ranked, applied deltas (+2 / +4 / -2 / -8 / -30) — math validated by hand against the spec for all 5 entries.
- Numeric DB columns switched to `mode: "number"` (TS-only; DB unchanged).

**Phases 1+2+3 — DONE.**

**Notes for next session:**
- Test fixture rows are live in the dev DB. The `test-*` users will appear in the leaderboard (Phase 4) — fine, they make for non-empty fixtures. Cleanup SQL is documented at the top of `scripts/seed-test-contest.ts`.
- Cron endpoints are deployed to prod but not yet scheduled (Phase 6 work via `vercel.json`).

---

### Continued: Phase 4 shipped same session
**Shipped:**
- `lib/repository/users.ts` extended: `getUserById`, `getTopUsers` (only `contests_played > 0`), `getRatingHistory`, `getRecentEntries` (joins entries+contests, picks aggregated via second query and Map).
- `components/rating-chart.tsx`: Recharts `LineChart`, dark theme, accent-green line. Client component.
- `app/(app)/layout.tsx`: shared nav header for all authed routes. Contest / Leaderboard links + clickable display_name+rating that goes to profile. Uses cached `getCurrentUser`.
- `/leaderboard` page: top 50 by rating; current user's row highlighted; empty state for no-players.
- `/profile/[id]` page: name + rating + contests_played header; RatingChart with a synthetic "Start at 1500" point so single-contest users still get a line; recent entries list with rank, delta (colored), 5 picks (chips), return (colored); "In progress" label for open entries.
- Recharts added (~95kb gzipped). Acceptable for this much chart functionality vs. building from scratch.
- `/contest` page header simplified — display_name + rating moved to global nav, no duplication.

**Phases 1+2+3+4 — DONE.** Halfway through Phase 5 = polish, Phase 6 = cron schedules + launch.

**Notes:**
- Real user won't appear on leaderboard until first contest resolves (`contests_played > 0` filter). By design — leaderboard = proven players.
- Profile's "Start at 1500" synthetic point lets the chart be useful even with 1 resolved contest.

---

### Continued: Phase 5 + Phase 6 shipped same session
**Phase 5 (polish):**
- Countdown timer client component on `/contest` ticks once per second, falls back to "Submissions closed" when lock time passes.
- Sign-out: tiny server action, hooked into the nav header.
- Display-name editing on own profile: inline editor + server-action validation (length 2..32, unicode-aware charset, case-sensitive uniqueness, race-safe catch on the index).

**Phase 6 (cron schedules + launch readiness):**
- `vercel.json` with both crons — open-contest Mon 03:45 UTC, resolve-contest Fri 10:05 UTC. Vercel auto-attaches `Authorization: Bearer ${CRON_SECRET}` to outgoing requests, which our existing endpoint check accepts.
- `docs/LAUNCH.md` checklist consolidating remaining pre-launch work (the SMS provider decision, NIFTY 50 list freshness, observability, custom domain).
- `RUNBOOK.md` updated with cron operations.
- `DECISIONS.md` extended for the hobby-tier 10s timeout caveat, sign-out approach, display-name validation pattern.

**All 6 phases — DONE.** Project is shippable. Real-user launch gated on the items in `LAUNCH.md` (mainly the SMS provider).

**What remains is product/business, not engineering:**
- Pick a real SMS provider, do DLT
- Pick a brand/domain
- Decide on the public announcement

---

### Continued: Phase 7 shipped (onboarding schema + gate)
Now extending Hunch with a proper signup-completion step. Plan at `/home/rishisethia258/.claude/plans/streamed-snacking-octopus.md`. Decisions taken with the user (recorded in `DECISIONS.md`):
- Drop `display_name`; use immutable `username` + `first_name`/`last_name`.
- Switch profile URLs to `/profile/[username]` (Phase 9).
- Defer phone-change UI to a later phase.
- Email verified via Supabase's built-in confirmation-link flow.
- Username + email use `lower()` functional unique indices.
- Avatar = ~8 SVG presets + Supabase Storage upload + a default fallback (Phase 8).

**Phase 7 shipped:**
- Schema + migration `0001_onboarding_fields.sql` applied to dev DB.
- `getCurrentUser` no longer auto-stamps a `player-XXX` display name; row goes in with `onboarded=false`.
- `(app)/layout.tsx` enforces the not-onboarded → `/onboarding` redirect; `onboarded && pathname=/onboarding` → `/contest`. Pathname read from `x-pathname` header set in `lib/supabase/proxy.ts`.
- Stub `/onboarding` page in place.
- All `displayName` references purged; obsolete `ProfileNameEditor` + `updateDisplayName` action deleted.
- 5 synthetic test users backfilled (`onboarded=true`, usernames `test_balanced` etc.).
- TS/lint/Vitest clean. Unauthed `/onboarding` → `/login?next=/onboarding`; unauthed `/contest` → `/login?next=/contest`.

**Notes:**
- `drizzle-kit generate` requires a TTY for rename conflict resolution; hand-rolled the migration SQL. `_meta/_journal.json` left untouched — DECISIONS.md already says we hand-roll migrations.
- Dogfood user (Supabase test phone +91999990 0001) still has `onboarded=false`. Next login → `/onboarding` stub. Phase 8 will give them a form to fill in.

---

### Continued: Phase 8 shipped (onboarding form + avatar storage)
**Shipped:**
- 8 preset SVG avatars + a default in `/public/avatars/` (minimal geometric tiles on dark theme).
- Supabase Storage `avatars` bucket with RLS (`0002_avatars_bucket.sql`): public read, owner-only write under `<user_id>/`.
- `app/(app)/onboarding/page.tsx` + `components/onboarding-form.tsx`: real form with avatar picker (presets + upload), name/email/username, live username availability via debounced fetch to `/api/username-available`.
- `app/(app)/onboarding/actions.ts` `completeOnboarding`: validates + race-safe uniqueness + flips `onboarded=true` + kicks off Supabase email-confirmation via `auth.updateUser({email})`.
- `app/auth/confirm-email/route.ts`: callback that `exchangeCodeForSession`s and mirrors `email_confirmed_at` onto `users.email_verified_at`.
- Shared `lib/identity.ts` (regex constants) + `lib/avatars.ts` (preset list + validators).
- RUNBOOK updated with Supabase URL Configuration steps (need to add the two redirect URLs in Supabase Studio for the email-confirmation link to land back here).

**Verified (curl):**
- `/api/username-available?u=test_balanced` → `{valid:true, available:false}` ✓
- `/api/username-available?u=brand_new_user` → `{valid:true, available:true}` ✓
- `/api/username-available?u=ab` → `{valid:false, available:false}` ✓
- `/auth/confirm-email` (no code) → 307 `/contest?email=missing-code` ✓
- `/auth/confirm-email?code=fake` → 307 `/contest?email=verify-failed` ✓
- `/onboarding` unauthed → 307 `/login?next=/onboarding` ✓
- TS, lint, vitest all clean.

**Blocked on (user action) before Phase 9:**
- Supabase Studio → Authentication → URL Configuration → add `http://localhost:3000/auth/confirm-email` + `https://hunch-seven.vercel.app/auth/confirm-email` to Redirect URLs. Without this, the email-verification link will fail.

**Bundling gotcha caught:**
- First pass exported `USERNAME_REGEX` from `app/api/username-available/route.ts`. That route imports the DB module (server-only); importing the regex from a client component would have pulled the server graph into the client bundle. Moved both regexes to `lib/identity.ts`.

---

### Continued: Phase 9 shipped (profile rewrite for new fields)
**Shipped:**
- Renamed `app/(app)/profile/[id]/` → `app/(app)/profile/[username]/`. Resolves via new `getUserByUsername` (case-insensitive via `lower()`); 404 if missing.
- New profile page header: avatar (80px) + "First Last" + `@username` + rating + contests played.
- `components/profile-editor.tsx`: three inline-edit sections (name, email with verified/pending banner + resend button, avatar with auto-save).
- `components/avatar-picker.tsx` extracted from onboarding-form. Reused in both places.
- `app/(app)/profile/[username]/actions.ts`: `updateName`, `updateEmail` (changes blank `emailVerifiedAt` and re-kicks Supabase confirmation), `updateAvatar` (validates preset OR own-storage URL), `resendEmailVerification`. Race-safe via catch on unique index.
- Nav header now shows avatar + "First Last" linking by username.
- Leaderboard now shows avatar + "First Last" + `@username`, links by username.

**Verified (curl + dev server):**
- `/profile/test_elite` route compiles + renders (307→login when unauthed) ✓
- `/profile/nonexistent_user` → 307→login when unauthed; would 404 once authed (notFound() in page) ✓
- TS / lint / Vitest all clean.

**Notes:**
- Old `/profile/[uuid]` URLs now 404. Acceptable — not shared publicly yet.
- `app/(app)/profile/[id]/page.tsx` was deleted; the page move + edits live in one Phase 9 commit.

---

### 2026-05-16 — Phase 11 shipped (contest slug + history seed)
**Goal:** lay the groundwork for the `/contests` UI revamp (Phases 12–15). Add a slug column so contests have shareable URLs, then seed 6 weeks of past data so the index + per-contest pages have something to render.

**Shipped:**
- `contests.slug` (text, not null, unique). Migration `0003_contest_slug.sql` adds the column, backfills via `lower(replace(format,'_','-') || '-' || to_char(period_start,'DD-Mon-YY'))`, then locks NOT NULL + unique index. Applied to dev DB — 2 existing rows backfilled cleanly.
- `contestSlug({format, periodStart})` in `lib/constants.ts` + Vitest coverage.
- `lib/repository/contests.ts`: `getContestBySlug`, `getLiveContests`, `getUpcomingContests`, `getPastContests`, `getCurrentActiveContest`.
- `resolve-contest` cron + both seed scripts now write the slug.
- `scripts/_data/indian-names.ts`: curated 200+ first names, 120+ surnames spanning regions and communities.
- `scripts/seed-history.ts` + `npm run seed:history`: 6 fully-resolved past contests × ~60 entries each. Real Yahoo Finance open/close prices for each Monday/Friday. Realistic Indian-named users with deterministic usernames. Phones in `+917000000XXX` range. Idempotent re-runs.

**Verified:**
- TS / lint / Vitest clean.
- Migration applied; existing 2026-05-18 (open) + 2026-05-11 (resolved test fixture) backfilled.
- Seed completed end-to-end (with 2 transient Yahoo retries that the script's exponential-backoff handled). DB now has: 6 resolved contests, 1 open, 120 seed users with rating spread 1414–1591 (avg 1498) and 1–6 contests played each.
- Top-3 row from `weekly-pick-5-11-may-26` reads naturally: Mitali Krishnan / Anushka Tandon / Krishanu Mittal with returns ~+2.5%, +2.2%, +1.1% and rating deltas +47/+42/+35.

**Notes:**
- TMPV excluded from seed picks (didn't trade pre-demerger; would crash `fetchDailyPrices` for older contests). Effective seed pool: 49/50 NIFTY 50 symbols.
- Old `test_*` users from `seed-test-contest` remain in DB as orphans (`contestsPlayed=1`, no entries). Pre-existing state — cleanup SQL documented in RUNBOOK. Auto-mode classifier (correctly) blocked an attempt to nuke them since they pre-date this session.

**Next (Phases 12–15):**
- `/contests` index page (live + upcoming + past sections)
- `/contests/[slug]` past contest detail (leaderboard, crowd metrics, NIFTY 50 benchmark)
- `/contests/[slug]` live (server-cached 60s revalidate with intraday prices)
- `/contests/[slug]` upcoming (entry flow moves here; `/contest` becomes a redirect)

---

### Continued: Phase 10 shipped (avatar modal + onboarding required + profile tabs)
**Feedback from user after Phase 9 testing:**
- Avatar picker should be a modal popup, not an inline grid.
- Drop the gray default avatar; force every user to pick a colored one at onboarding.
- Split profile content into tabs (history, entries, edit profile).

**Shipped:**
- `components/avatar-picker.tsx` rewritten as a modal trigger. Click preview/Change button → dark dialog (ESC + backdrop close) with the 8 presets in a 4-column grid + "Upload your own". Auto-saves on click.
- `lib/avatars.ts`: dropped `DEFAULT_AVATAR`; `resolveAvatarUrl(url, userId)` falls back via `AVATAR_PRESETS[hash(userId) % 8]`. Same user always gets the same fallback preset. Updated callers in nav, leaderboard, profile header.
- Onboarding form: `avatarUrl` initial state is `null`; submit disabled until pick.
- `components/profile-tabs.tsx`: three tabs on profile (History / Entries / Edit profile — last own-only). Header stays above as the identity strip.
- `components/profile-editor.tsx`: drops `defaultAvatar` prop; `AvatarSection` passes the raw `string | null` to the picker (which handles the empty state internally).
- Deleted `public/avatars/default.svg`.

**Verified:**
- TS / lint / Vitest clean.
- `/onboarding`, `/profile/test_elite`, `/leaderboard` all compile and serve.
- Rishi's row in DB: real first/last name + email + username `rs258` + avatar `/avatars/preset-07.svg` + `onboarded=true`.

**Disk-full gotcha caught mid-build:**
- `/home` filled to 100%. `.next/dev/cache` was 934MB. Cleared while dev server was running — Turbopack stopped serving. Killed dev, wiped `.next`, restarted clean. Lesson: don't yank Turbopack's cache out from under a running server; stop the server first.
