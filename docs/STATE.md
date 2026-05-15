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
- Nothing yet

## In progress
- **Phase 1: Skeleton + auth** — auth code done; awaiting Rishi's browser smoke test, then Vercel deploy.

## Next (in order)
1. Smoke test in browser (sign-in flow end-to-end)
2. Deploy to Vercel, set env vars there, verify the same flow in prod

## Blocked on product owner
- Browser test of the sign-in flow at http://localhost:3000
- Vercel account import (a Vercel team under the same email is recommended; not blocking yet)

## Known issues
- 2 moderate npm audit warnings on initial scaffold (transitive, not actionable yet — revisit if they affect anything user-facing)

## Deferred (intentionally, with rationale)
- **Real SMS provider for phone OTP** → Phase 6. Indian SMS requires DLT/TRAI registration; not worth burning Phase 1 on it when dogfooding only needs a fixed dev OTP.
- **NSE/Yahoo market data integration** → Phase 3. Schedule risk (NSE blocks scrapers, Yahoo unofficial API is flaky) — flag and pick provider then.
