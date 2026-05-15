# Hunch — Current State

_Last updated: 2026-05-15_

## Built
- Next.js 16 + TypeScript + Tailwind v4 scaffold (`create-next-app`, App Router, no `/src`, `@/*` alias)
- ESLint configured
- `/docs` initialized (STATE, DECISIONS, SPEC, RUNBOOK, SESSIONS)
- `CLAUDE.md` at repo root with full project brief

## Deployed
- Nothing yet

## In progress
- **Phase 1: Skeleton + auth**

## Next (in order)
1. Receive Supabase creds from product owner (URL, anon key, service_role key, pooled DB URL)
2. Drizzle setup, schema for all 5 tables, run migrations
3. Supabase Auth clients (server + browser) via `@supabase/ssr`
4. Phone OTP sign-in page using Supabase test phone numbers
5. Middleware protecting `/app/(app)/*`
6. `/api/me` + first-time user row creation
7. Deploy to Vercel and verify end-to-end

## Blocked on product owner
- Supabase project: create at supabase.com (region `ap-south-1`), provide URL + anon key + service_role key + pooled DB URL
- Supabase phone provider toggle + test phone number with fixed OTP
- Vercel account + import repo when we're ready to deploy

## Known issues
- 2 moderate npm audit warnings on initial scaffold (transitive, not actionable yet — revisit if they affect anything user-facing)

## Deferred (intentionally, with rationale)
- **Real SMS provider for phone OTP** → Phase 6. Indian SMS requires DLT/TRAI registration; not worth burning Phase 1 on it when dogfooding only needs a fixed dev OTP.
- **NSE/Yahoo market data integration** → Phase 3. Schedule risk (NSE blocks scrapers, Yahoo unofficial API is flaky) — flag and pick provider then.
