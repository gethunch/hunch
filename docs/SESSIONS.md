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
