# Hunch — Current State

_Last updated: 2026-05-15_

## Built
- Next.js 16 + TypeScript + Tailwind v4 scaffold (`create-next-app`, App Router, no `/src`, `@/*` alias)
- ESLint configured
- `/docs` initialized (STATE, DECISIONS, SPEC, RUNBOOK, SESSIONS)
- `CLAUDE.md` at repo root with full project brief
- `.env.local` (gitignored) + `.env.example` (committed) for env vars
- Drizzle ORM + postgres.js driver installed; schema applied to Supabase
- All 5 tables (`users`, `contests`, `entries`, `entry_picks`, `rating_history`) + `contest_status` enum live in Supabase public schema
- Migration SQL committed at `lib/db/migrations/0000_*.sql`
- `lib/db/index.ts` exports a configured Drizzle client (postgres.js, `prepare: false` for the pooled connection)

## Deployed
- Nothing yet

## In progress
- **Phase 1: Skeleton + auth** — schema done; auth next.

## Next (in order)
1. Install `@supabase/ssr`, build server + browser Supabase clients
2. Phone OTP sign-in page using Supabase test phone numbers
3. Middleware protecting `/app/(app)/*`
4. `/api/me` + first-time user row creation
5. Deploy to Vercel and verify end-to-end

## Blocked on product owner
- **Test phone + OTP** in Authentication → Phone Auth → Test phone numbers (e.g., `+919999900001` / `123456`) — needed for the sign-in flow smoke test
- Vercel account + import repo when we're ready to deploy

## Known issues
- 2 moderate npm audit warnings on initial scaffold (transitive, not actionable yet — revisit if they affect anything user-facing)

## Deferred (intentionally, with rationale)
- **Real SMS provider for phone OTP** → Phase 6. Indian SMS requires DLT/TRAI registration; not worth burning Phase 1 on it when dogfooding only needs a fixed dev OTP.
- **NSE/Yahoo market data integration** → Phase 3. Schedule risk (NSE blocks scrapers, Yahoo unofficial API is flaky) — flag and pick provider then.
