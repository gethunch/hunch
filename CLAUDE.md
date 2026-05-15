@AGENTS.md

# Hunch — Project Context for Claude Code

## What we're building
Hunch is a skill-rated stock prediction platform for Indian retail traders. Users pick 5 stocks from NIFTY 50 each week, compete in a weekly contest, and earn a portable rating that tracks their skill at picking stocks. Think Codeforces or chess.com, but for retail trading.

Tagline: **"Got a hunch? Prove it."**

## How we work together — read this first
The product owner directs the project; Claude is the engineer. The product owner:

- Approves direction and scope
- Tests things end-to-end as a user
- Makes product decisions when asked
- Provides credentials, env vars, API keys, deploy access when needed
- Flags when something is wrong from a user perspective

Claude:

- Writes every line of code
- Runs every command, with approval for anything destructive
- Maintains its own context across sessions (see "Persistent context")
- Decomposes work into small, verifiable steps
- Asks before making decisions that aren't already specified here
- Pushes back on scope creep or premature optimization
- Defaults to the simplest thing that works

**Working cadence:** full-time project, ship continuously. Plan work in chunks that fit a single working session. Always end a session with the project in a working state — never leave broken code overnight.

## Persistent context — critical
Claude maintains its own memory across sessions on disk, because the product owner is not reading code day-to-day:

- `/docs/STATE.md` — Current state. What's built, deployed, broken, next. Update at end of every session.
- `/docs/DECISIONS.md` — Architectural decisions log. One entry per decision: date, what was decided, why. **Append-only.** Read at the start of every session before suggesting changes.
- `/docs/SPEC.md` — Canonical product spec. Data model, rating formula, auth flow, cron jobs, build order. Update only when the product owner explicitly approves a spec change.
- `/docs/RUNBOOK.md` — How to run things. Local dev, env vars, deploys, manual cron triggers, contest seeding, DB inspection. Update when any of those change.
- `/docs/SESSIONS.md` — Append-only log. One entry per session: date, work done, shipped, punted, open questions.

**Start of session:** read STATE.md, last 2-3 SESSIONS.md entries, and DECISIONS.md. Propose what to work on. Don't start coding until the product owner confirms.

**End of session:** update STATE.md, append to SESSIONS.md, commit and push. Summarize in chat: what shipped, what's deployed, what's next, open questions.

If context drifts mid-session, stop and re-read STATE.md and SPEC.md.

## Incremental delivery — non-negotiable
Build one thing at a time. Ship it. Verify it works end-to-end. Then move on.

- Never bundle multiple features into one commit
- Never refactor and add features in the same commit
- After every feature, deploy to production (Vercel preview is fine for in-progress; `main` = prod)
- Tell the product owner exactly how to test what was just built ("open this URL, click this, expect this") before moving on
- If a step has more than one user-visible piece, break it down further

If writing more than ~150 lines without anyone having tested, stop and ship.

## Asking for input
Default to acting, not asking. If something is specified here, follow it. If it's not specified but the answer is obvious, pick the obvious one and note the choice in `DECISIONS.md`.

Ask only when:

- A genuine product decision is needed (UX flow, content, naming)
- Credentials, API keys, or access are needed
- Pushing back when the product owner is wrong
- A spec ambiguity could be resolved two reasonable ways

Don't ask about: library choices, file structure, naming conventions, code style, test framework setup, error message wording — anything that's purely engineering judgment. Decide and move on.

## Core loop

- Every Monday 9:15 AM IST, a new contest opens
- Users pick 5 stocks from NIFTY 50 (equal weight, no shorts, no allocation)
- Contest runs Monday open to Friday close
- Friday close, contest resolves on portfolio return (real market data)
- Users get a final rank and a rating delta
- Repeat next week

## Deliberate v1 choices — do not deviate

- No real money, no prizes. The rating IS the reward.
- No mobile app. Web-only, mobile-responsive.
- v1 ships a single contest format: weekly 5-stock equal-weight pick. Schema leaves room for future formats (daily, fixed-allocation, variable N) — but those are post-v1.
- No tiers, badges, or avatars.
- Simple percentile-based rating (Glicko-2 is v2).
- No founder names or parent company branding anywhere.

## Stack — locked

- **Framework:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Database:** Supabase Postgres
- **ORM:** Drizzle
- **Auth:** Supabase Auth, phone OTP provider, via `@supabase/ssr`
- **Hosting:** Vercel (frontend + API routes + cron)
- **Cron:** Vercel Cron
- **UI components:** shadcn/ui
- **Charts:** Recharts
- **Testing:** Vitest
- **Market data:** NSE public endpoints or Yahoo Finance unofficial API (free, no key)

**Explicitly rejected:** Go, Bazel, protos, gRPC, Firestore, Cloud Run, separate backend service. REST + JSON via Next.js routes is the entire backend.

## Code organization
```
/app
  /(marketing)          Public landing
  /(app)                Authed routes: contest, leaderboard, profile
  /api
    /cron               Vercel Cron endpoints (open-contest, resolve-contest)
    /me                 Current user
/lib
  /db                   Drizzle schema + client
  /supabase             Auth client setup (server + browser)
  /rating               Pure rating math + tests
  /market               Price fetching (open + close)
  /repository           Data access layer — one file per entity
  constants.ts          NIFTY 50 list, contest timing constants
/components
  /ui                   shadcn primitives
  ...                   App-specific components
/docs
  STATE.md
  DECISIONS.md
  SPEC.md
  RUNBOOK.md
  SESSIONS.md
```

Rules:

- All DB access goes through `/lib/repository`. Routes and server actions never call Drizzle directly.
- Rating math is a pure function. Imports only types. No DB calls inside it.
- Market data module is called only from cron endpoints, never from request paths.
- Server-only secrets (Supabase service role key, CRON_SECRET) never imported in client components.

## Data model
5 tables. Drizzle schema. NIFTY 50 symbols hardcoded in a constants file, not a DB table.

**users**
- id (uuid, pk, mirrors Supabase auth user id)
- phone (text, unique)
- display_name (text, unique)
- rating (int, default 1500)
- contests_played (int, default 0)
- created_at (timestamptz)

**contests**
- id (uuid, pk)
- format (text — v1 only uses `'weekly_pick_5'`; reserved for future formats like `daily_pick_5`, `weekly_alloc_10k`)
- period_start (date — start of the contest's period; for weekly = Monday IST)
- opens_at (timestamptz — Monday 9:15 IST)
- locks_at (timestamptz — Monday 9:15 IST; entries close when market opens)
- resolves_at (timestamptz — Friday 15:30 IST)
- status (text — 'open' | 'live' | 'resolved')
- entry_count (int, default 0)
- unique(format, period_start)

**entries**
- id (uuid, pk)
- contest_id (uuid, fk → contests)
- user_id (uuid, fk → users)
- submitted_at (timestamptz)
- final_return (numeric(8,4), nullable until resolution)
- final_rank (int, nullable until resolution)
- rating_delta (int, nullable until resolution)
- unique(contest_id, user_id)

**entry_picks**
- id (uuid, pk)
- entry_id (uuid, fk → entries, on delete cascade)
- symbol (text — 'RELIANCE', 'TCS', etc.)
- entry_price (numeric(10,2))
- exit_price (numeric(10,2), nullable until resolution)
- unique(entry_id, symbol)

**rating_history**
- id (uuid, pk)
- user_id (uuid, fk → users)
- contest_id (uuid, fk → contests)
- rating_before (int)
- rating_after (int)
- delta (int)
- created_at (timestamptz)

## Rating system — locked spec

- New users start at 1500
- Per-contest delta cap: ±50
- Piecewise curve from percentile finish:
  - Top 1%: +50
  - Top 5%: +35
  - Top 10%: +25
  - Top 25%: +12
  - Median (50%): 0
  - Bottom 25%: −12
  - Bottom 10%: −25
  - Bottom 5%: −35
  - Bottom 1%: −50
- Contests with fewer than 20 entries: multiply delta by 0.5
- Asymmetric soft floor/ceiling via gain/loss factors:
  - gain_factor = max(0.2, 1 - (rating - 1500) / 1000) when delta > 0
  - loss_factor = max(0.2, 1 - (1500 - rating) / 1000) when delta < 0
- No hard floor, no ceiling, no decay
- Display rating with contest count: e.g. "1,623 · 4 contests"

Implement as a pure function: `(currentRating: number, percentile: number, contestSize: number) => delta: number`. Cover with Vitest tests including edge cases (rating at 800, rating at 2200, contest of 5, contest of 1000, all percentile buckets).

## Auth flow

- Supabase phone OTP for sign-in
- `@supabase/ssr` for App Router-compatible session handling
- Middleware protects `/app/(app)/*` routes
- On first authed request, a server action checks if a row exists in `users` for the Supabase auth user id; if not, insert with rating = 1500
- Service role key used only in server contexts; never in client components

## Cron security
Both cron endpoints verify `Authorization: Bearer ${CRON_SECRET}` header before running. `CRON_SECRET` set as an env var in Vercel.

## Cron jobs

**`/api/cron/open-contest`** — Mondays at 9:15 IST
- Operates on contests where `format = 'weekly_pick_5'` AND status = `open` AND `opens_at` ≤ now
- Fetches NIFTY 50 open prices
- Updates `entry_price` on every pick in every entry for the current contest
- Updates contest status to `live`

**`/api/cron/resolve-contest`** — Fridays at 15:35 IST
- Operates on contests where `format = 'weekly_pick_5'` AND status = `live` AND `resolves_at` ≤ now
- Fetches NIFTY 50 close prices
- Updates `exit_price` on every pick
- Computes `final_return` per entry (equal-weight average of stock returns)
- Ranks entries, assigns percentiles
- Calls rating engine, updates `users.rating` and `users.contests_played`
- Inserts `rating_history` rows
- Marks contest as `resolved`
- Creates next week's contest row in `open` status (same format)

## Aesthetic direction
Cred / Linear / Stripe minimalism.

- Near-black background, off-white text
- Single accent color: green (used sparingly — only rating-up and primary CTAs)
- Font: Inter or Geist
- Tabular numbers (`font-feature-settings: 'tnum'`) everywhere financial data appears
- Generous spacing
- Restraint is the entire vibe — no gradients, no shadows, no illustrations, no emoji

## Build order — phased

**Phase 1: Skeleton + auth**
- `create-next-app` with TypeScript, Tailwind, App Router
- Supabase project, enable phone auth, get keys
- Drizzle setup, schema for all 5 tables, run migrations
- Supabase Auth client setup (server + browser)
- Phone OTP sign-in page
- Middleware to protect authed routes
- `/api/me` route + first-time user row creation
- Deploy to Vercel, verify end-to-end
- Initialize `/docs` folder

**Phase 2: Contest seeding + entry submission**
- Script to insert next Monday's contest row
- `/contest` page: list NIFTY 50, multi-select 5, submit
- Server action validates and writes entry + 5 `entry_picks`
- Confirmation state

**Phase 3: Resolution + rating engine**
- Pure rating function with full Vitest coverage
- Market data module (open + close price fetchers)
- Both cron endpoints
- Manual test: seed a contest, fake entries, run open + resolve, verify ratings update

**Phase 4: Leaderboard + profile**
- `/leaderboard` page
- `/profile/[id]` page with rating chart (Recharts) + recent entries

**Phase 5: Polish + contest page UX**
- Apply aesthetic across all pages
- Empty states for leaderboard (3 users) and profile (0 contests)
- Countdown timer on contest page

**Phase 6: Cron wiring + launch**
- Configure Vercel Cron schedules
- Run full automated cycle for one week as dogfood
- Launch

## Ground rules

- Prioritize shipping over architecture
- Push back on scope creep and premature optimization
- Don't add libraries unless they save real time
- Don't add features outside the v1 list above
- If something can be a SQL query, don't make it a table or a service
- The product owner is not reading code — explain choices in plain English in chat and in `DECISIONS.md`
