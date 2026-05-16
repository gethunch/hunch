# Hunch — Canonical Spec

Canonical product spec. Update only when the product owner explicitly approves a spec change.
For autonomy/process rules and aesthetic direction, see `/CLAUDE.md`.

---

## Product summary
Weekly skill-rated stock-prediction contest on NIFTY 50. Users pick 5 stocks each Monday. Contest runs Monday open → Friday close. Equal-weight portfolio return determines rank. Rank determines rating delta. No real money.

## Core loop
1. **Monday 9:15 IST** — `open-contest` cron fires. Captures NIFTY 50 open prices, freezes entry prices, status → `live`. Entry window closed (users had to submit before 9:15).
2. **Mon–Fri** — contest is live, no new entries.
3. **Friday 15:35 IST** — `resolve-contest` cron fires. Captures close prices, computes returns, ranks entries, applies rating deltas, writes `rating_history`, marks `resolved`, seeds next week's contest as `open`.
4. New week's `open` contest accepts entries until Monday 9:15 IST.

## Data model (5 tables)
See `/CLAUDE.md` for full column definitions. Summary:

- **users** — Supabase auth id mirror, phone (unique), first_name, last_name, email (unique on `lower(email)`), username (unique on `lower(username)`, immutable post-onboarding), avatar_url, email_verified_at, onboarded (default false), rating (default 1500), contests_played.
- **contests** — format (v1: `weekly_pick_5`), period_start (Monday IST for weekly), `slug` (human-readable, unique; derived as `<format-with-hyphens>-<DD-mon-YY>` e.g. `weekly-pick-5-18-may-26`), opens_at, locks_at, resolves_at, status (`open`|`live`|`resolved`), entry_count. `unique(format, period_start)`, `unique(slug)`.
- **entries** — (contest_id, user_id) unique. Final return, rank, rating_delta populated at resolution.
- **entry_picks** — 5 rows per entry (`unique(entry_id, symbol)`). Entry/exit prices.
- **rating_history** — append-only log of per-contest rating changes.

NIFTY 50 symbols hardcoded in `/lib/constants.ts`. Not a table.

## Rating function — pure
Signature: `(currentRating: number, percentile: number, contestSize: number) => delta: number`

Algorithm:
1. **Base delta** from piecewise percentile curve (symmetric, capped ±50):
   - 1% → ±50, 5% → ±35, 10% → ±25, 25% → ±12, 50% → 0
2. **Contest size adjustment:** if `contestSize < 20`, multiply by 0.5.
3. **Asymmetric soft-cap factor:**
   - If `delta > 0`: `gain_factor = max(0.2, 1 - (rating - 1500) / 1000)`
   - If `delta < 0`: `loss_factor = max(0.2, 1 - (1500 - rating) / 1000)`
4. Return `delta * factor`, rounded.

No hard floor/ceiling, no decay. New users start at 1500.

Test coverage required (Vitest):
- Every percentile bucket (1, 5, 10, 25, 50, 75, 90, 95, 99)
- Edge ratings: 800, 1500, 2200
- Edge contest sizes: 1, 5, 19, 20, 1000
- Verify `gain_factor`/`loss_factor` floor at 0.2

## Auth
- Supabase phone OTP, `@supabase/ssr` clients (server + browser).
- Middleware protects `/app/(app)/*`.
- First authed request: server action looks up `users` by Supabase auth id; if missing, inserts row with `rating=1500`, `contests_played=0`, `onboarded=false`.
- Not-onboarded users are funneled to `/onboarding` by `app/(app)/layout.tsx`, where they pick first/last name, email (verified async via Supabase confirmation link), username (immutable, unique case-insensitive), avatar. `completeOnboarding` server action persists and flips `onboarded=true`.
- Service role key: server only. Never imported in client components.

## Cron jobs
Both endpoints verify `Authorization: Bearer ${CRON_SECRET}`.

### `/api/cron/open-contest` — Mondays 9:15 IST
1. Load the `open` contest for this week where `format = 'weekly_pick_5'`.
2. Fetch NIFTY 50 open prices.
3. Update `entry_price` on every pick (every `entry_picks` row for every `entries` row in this contest).
4. Update contest status → `live`.

### `/api/cron/resolve-contest` — Fridays 15:35 IST
1. Load the `live` contest for this week where `format = 'weekly_pick_5'`.
2. Fetch NIFTY 50 close prices.
3. Update `exit_price` on every pick.
4. Compute `final_return` per entry = mean of `(exit-entry)/entry` across its 5 picks.
5. Rank entries (descending `final_return`); assign `final_rank`. Tie-break: earlier `submitted_at` wins.
6. For each entry: compute percentile, call rating function with `users.rating` and contest size, update `users.rating += delta`, increment `users.contests_played`, set `entries.rating_delta`, insert `rating_history` row.
7. Mark contest `resolved`.
8. Insert next week's contest row as `open` (same format).

## Build order
Phase 1 skeleton+auth → Phase 2 entry submission → Phase 3 rating+resolution → Phase 4 leaderboard+profile → Phase 5 polish → Phase 6 cron+launch. Detail in `/CLAUDE.md`.

## Non-goals for v1 (do not build)
Real money. Prizes. Mobile app. Tiers/badges/avatars. Glicko-2. Market-cap weighting. Email notifications. Admin panel. Founder/parent branding.

**Additional contest formats (daily, fixed-allocation, variable N) are post-v1.** Schema has a `format` column to accommodate them later; v1 only ever writes `'weekly_pick_5'`.
