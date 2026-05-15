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
- **Phase 1 — done.** Skeleton + auth shipped.

## Next (Phase 2: Contest seeding + entry submission)
1. Seed script to insert next Monday's `weekly_pick_5` contest row
2. NIFTY 50 constants (`lib/constants.ts`) — 50 symbols, hardcoded
3. `/contest` page: list NIFTY 50, multi-select 5, submit
4. Server action validates and writes `entries` + 5 `entry_picks`
5. Confirmation state

## Blocked on product owner
- Nothing for Phase 2 kickoff. (NIFTY 50 list is publicly known; we don't need anything new.)

## Open questions / deferred
- Real SMS provider for production phone OTP → Phase 6 (DLT/TRAI registration).
- Market data source (NSE vs. Yahoo unofficial) → Phase 3.
- Custom domain pointing to Vercel deploy → not blocking; whenever there's a brand decision.

## Known issues
- 2 moderate npm audit warnings on initial scaffold (transitive, not actionable yet — revisit if they affect anything user-facing)

## Deferred (intentionally, with rationale)
- **Real SMS provider for phone OTP** → Phase 6. Indian SMS requires DLT/TRAI registration; not worth burning Phase 1 on it when dogfooding only needs a fixed dev OTP.
- **NSE/Yahoo market data integration** → Phase 3. Schedule risk (NSE blocks scrapers, Yahoo unofficial API is flaky) — flag and pick provider then.
