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
- **Phases 1, 2, 3 — all done.**

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

## Next (Phase 4: Leaderboard + profile)
1. `/leaderboard` page — top users by rating, with rating + contests-played, tabular nums
2. `/profile/[id]` page — rating history chart via Recharts, recent entries
3. Repository functions: `getTopUsers(limit)`, `getRatingHistory(userId)`, `getRecentEntries(userId, limit)`
4. Make `displayName` editable in profile (so users aren't stuck with `player-xxxxxxxx`)
5. Empty states for new users / leaderboards with few entries

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
