# Hunch — Current State

_Last updated: 2026-05-15_

## Built
- Next.js 16 + TypeScript + Tailwind v4 scaffold (`create-next-app`, App Router, no `/src`, `@/*` alias)
- ESLint configured; TypeScript strict clean
- `/docs` initialized (STATE, DECISIONS, SPEC, RUNBOOK, SESSIONS)
- `CLAUDE.md` at repo root with full project brief
- `.env.local` (gitignored) + `.env.example` (committed) for env vars
- Drizzle ORM + postgres.js driver; schema applied to Supabase
- All 5 tables + `contest_status` enum live in Supabase public schema
- Migration SQL committed at `lib/db/migrations/0000_*.sql`
- `lib/db/index.ts` exports the Drizzle client (`prepare: false` for the pooled connection)
- Supabase Auth wired: `lib/supabase/{server,browser,proxy}.ts` clients
- Next 16 proxy (was middleware) refreshes sessions + protects `/contest`, `/leaderboard`, `/profile`
- `/login` page with two-step phone-OTP form (`components/login-form.tsx` + server actions in `app/login/actions.ts`)
- `/api/me` returns the current user (401 if no session), creates the `users` row on first sign-in
- `/contest` placeholder authed page (Phase 2 builds the real UI)
- Landing page replaced (`app/page.tsx`) with minimal Hunch wordmark + Sign in CTA
- Dark theme forced in `globals.css`; tabular-nums on by default

## Deployed
- **Production:** https://hunch-seven.vercel.app (Vercel, auto-deploys from `main`)
- 5 env vars set in Vercel: Supabase URL + publishable + secret keys, pooled `DATABASE_URL`, `CRON_SECRET`
- Auth flow verified end-to-end in prod (sign-in with test phone, `/contest` renders, user row created)
- Repo is **public** (was private; Vercel hobby tier requires Pro for private org repos, so we flipped — no secrets in git)

## In progress
- **Phases 7–9 (onboarding + richer profile)**: in flight. Plan in `/home/rishisethia258/.claude/plans/streamed-snacking-octopus.md`.
- Phase 7 (schema + onboarded gate) shipped.

## Built (Phase 7)
- `users` table extended: `first_name`, `last_name`, `email`, `username`, `avatar_url`, `email_verified_at`, `onboarded` (default false). `display_name` dropped.
- Functional `lower()` unique indices on `username` and `email` (`lib/db/schema.ts`).
- Migration `lib/db/migrations/0001_onboarding_fields.sql` hand-written; applied via psql.
- `lib/repository/users.ts` `getCurrentUser` insert no longer sets a fake display name; new users land with `onboarded=false`.
- `lib/supabase/proxy.ts` sets an `x-pathname` request header (used by `(app)` layout).
- `app/(app)/layout.tsx` runs the onboarded redirect gate: `!onboarded → /onboarding`, `onboarded && /onboarding → /contest`.
- `app/(app)/onboarding/page.tsx`: stub destination, real form lands in Phase 8.
- `displayName` references purged across `(app)/layout.tsx`, `leaderboard/page.tsx`, `profile/[id]/page.tsx`. `components/profile-name-editor.tsx` + `profile/[id]/actions.ts` deleted; will be replaced in Phase 9.
- 5 synthetic test users backfilled with usernames + `onboarded=true` so leaderboard still reads cleanly.

## Built (latest additions)
- `lib/constants.ts`: NIFTY 50 list (with display names), `weekly_pick_5` format constant, IST date helpers, `nextContestMondayIST`, `contestTimestampsForMonday`.
- `scripts/seed-contest.ts` + `npm run seed:contest`: idempotent insert of next Monday's contest.
- `lib/repository/{contests,entries}.ts`: `getCurrentOpenContest`, `getEntryForUser`, transactional `submitEntry`.
- `/contest` page: 50-stock grid picker, sticky submit bar, locked-in confirmation view.
- `components/pick-five.tsx`: client picker with 5-pick cap.
- `app/(app)/contest/actions.ts`: validated server action for submission.
- `lib/rating/index.ts`: pure `computeRatingDelta(rating, rankFraction, size)` per spec + 28 Vitest tests.
- `lib/market/index.ts`: Yahoo Finance unofficial source for daily prices, concurrency-capped at 8, NIFTY .NS suffix.
- `scripts/probe-market.ts` + `npm run probe:market`: sanity check the price fetcher.
- `app/api/cron/open-contest/route.ts` + `resolve-contest/route.ts`: CRON_SECRET-gated, transactional. Resolve cron also seeds next week.
- `scripts/seed-test-contest.ts` + `npm run seed:test-contest`: backdated test contest with 5 synthetic users for end-to-end cron testing.
- TATAMOTORS → TMPV in `lib/constants.ts` (post-demerger fix).

## Deployed
- **Production:** https://hunch-seven.vercel.app (auto-deploys from `main`)
- 5 env vars set in Vercel
- Auth + contest entry + rating engine + crons all live in prod (crons not yet on a Vercel schedule — that's Phase 6)

## Built (Phase 5 + 6)
- Countdown timer on `/contest` (`components/contest-countdown.tsx`) ticking every 1s
- Sign-out via server action + nav button
- Editable display name on own profile, with server-side length/charset/uniqueness validation
- `vercel.json` with both cron schedules
- `docs/LAUNCH.md` checklist

## Next — launch
Everything in `/docs/LAUNCH.md`. Highlights:
1. Wait for the first real Monday cron cycle (03:45 UTC) and verify logs
2. Wire a real SMS provider for Supabase phone OTP (Twilio + DLT, or MSG91 hook)
3. Custom domain
4. Dogfood weekly cycles before opening to real users

## Open questions / deferred
- Real SMS provider for production phone OTP → Phase 6
- Vercel Cron schedules wired in `vercel.json` → Phase 6
- Custom domain → whenever there's a brand decision
- Test data in dev DB (5 test-* users, resolved 2026-05-11 contest, rating_history rows) — keep for now as leaderboard fixture; nuke later via SQL if needed

## Known issues
- 2 moderate npm audit warnings on initial scaffold (transitive, not actionable yet — revisit if they affect anything user-facing)

## Deferred (intentionally, with rationale)
- **Real SMS provider for phone OTP** → Phase 6. Indian SMS requires DLT/TRAI registration; not worth burning Phase 1 on it when dogfooding only needs a fixed dev OTP.
- **NSE/Yahoo market data integration** → Phase 3. Schedule risk (NSE blocks scrapers, Yahoo unofficial API is flaky) — flag and pick provider then.
