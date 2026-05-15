# Hunch — Decisions Log

Append-only. Each entry: date, decision, why.
Read this at the start of every session before suggesting changes.

---

## 2026-05-15 — Stack: Next.js + Supabase + Vercel
Earlier sketch was Go + Firestore + Cloud Run + Bazel. Replaced with a single Next.js app on Vercel, Supabase Postgres for data, Drizzle ORM, Supabase Auth for phone OTP, Vercel Cron for scheduling.

**Why:** One deploy target. No backend/frontend split. SQL beats NoSQL for the rating/leaderboard workload. Phone OTP is a managed service we don't have to build. Fastest path from zero to a usable v1.

## 2026-05-15 — App Router, no `/src` directory
`/app`, `/lib`, `/components` live at repo root. `--no-src-dir` flag to `create-next-app`.

**Why:** Matches the locked layout in the project brief; less nesting.

## 2026-05-15 — `CLAUDE.md` at repo root mirrors the full project brief
The onboarding doc is saved verbatim in `CLAUDE.md` so every future Claude Code session loads it automatically as context. `AGENTS.md` is included for non-Claude agent tooling (currently just the Next.js "don't trust training data" warning).

**Why:** Persistent context across sessions is non-negotiable per the brief.

## 2026-05-15 — Dev phone OTP via Supabase test phone numbers; defer real SMS provider to Phase 6
Production SMS for Indian numbers needs TRAI/DLT registration (sender ID, template approval, entity registration) and either Twilio (~₹0.50–0.70/SMS) or MSG91 (not first-class on Supabase — needs a custom SMS hook).

**Why:** Regulatory paperwork doesn't ship product. Test phone numbers unblock dogfooding. Pick a provider in Phase 6 when we open to real users.

## 2026-05-15 — Tailwind v4 (Next 16 default)
`create-next-app` shipped Tailwind v4 with the `@tailwindcss/postcss` plugin.

**Why:** Default of the scaffold; v4 is stable. Not relitigating for marginal benefit.

## 2026-05-15 — Repo is private from day one
GitHub repo created as `--private`.

**Why:** No reason for it to be public during early build. Flip later if/when we want to open-source or onboard external contributors.

## 2026-05-15 — Contest schema is multi-format-ready from day one
Added `format` text column and renamed `week_start` → `period_start` on `contests`, with `unique(format, period_start)`. v1 only ever writes `format = 'weekly_pick_5'`. Cron endpoints and queries filter explicitly by format.

**Why:** The eventual vision includes multiple contest formats (daily, fixed-allocation, variable N stocks). Baking a format column in now is a 2-line schema change; doing it later means a migration on live data. v1 still ships a single format — no daily cron, no allocation columns, no format registry. Just enough to leave the door open.

**Explicitly NOT doing in v1:** Strategy-pattern format abstraction. Per-format cron schedules. Weight/quantity on `entry_picks`. Multiple format strings live at once. UI for selecting a contest format.

## 2026-05-15 — Repo lives under `gethunch` GitHub org, not personal account
GitHub org `gethunch` created. Repo will be `gethunch/hunch`.

**Why:** Project is full-time, team being built. Org seats and clean separation from personal account beat migrating later (which breaks webhooks, integrations, PR refs).

## 2026-05-15 — `.claude/settings.local.json` is gitignored
This file is auto-generated local Claude Code permission state. Not project state.

**Why:** Local-only; would generate noise commits.

## 2026-05-15 — Env vars use Supabase's new key naming (`PUBLISHABLE_KEY` / `SECRET_KEY`)
Supabase rolled out new API key formats: `sb_publishable_*` (replaces anon JWT) and `sb_secret_*` (replaces service_role JWT). Our env vars match: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`. `@supabase/ssr` accepts either format.

**Why:** New project, new naming. Avoid drifting documentation. Functionally identical (publishable respects RLS, secret bypasses it — same as anon/service_role).

## 2026-05-15 — postgres.js driver (not `pg`), `prepare: false` for the pooled connection
Drizzle pairs cleanly with `postgres` (porsager/postgres) over `pg` for Supabase. `prepare: false` is required because the Transaction-mode pooler on port 6543 doesn't support prepared statements.

**Why:** Matches Drizzle's documented Supabase setup. Single-file client setup; no connection pool to manage on top of Supabase's pooler.

## 2026-05-15 — Drizzle workflow: `db:generate` → commit SQL → apply, not `db:push`
`drizzle-kit push` crashes on the introspection pass against this Supabase schema (drizzle-kit 0.31 bug: `TypeError: Cannot read properties of undefined (reading 'replace')` while parsing check constraints — happens even with `schemaFilter: ["public"]`). The first push DID create everything correctly; the crash is on the comparison pass for subsequent runs.

Going forward: edit `lib/db/schema.ts` → `npm run db:generate` (creates a migration SQL file under `lib/db/migrations/`) → commit the SQL → apply with a migration runner (TBD; for now we can apply manually via psql or revisit `db:push` if drizzle-kit patches the bug). Migration files in version control are the production-grade flow anyway.

**Why:** Working around a tool bug without going off-stack, while landing on the right flow for prod deploys.

## 2026-05-15 — `schemaFilter: ["public"]` in `drizzle.config.ts`
Drizzle should never touch Supabase-owned schemas (`auth`, `storage`, `realtime`, `pgsodium`, etc.).

**Why:** Hygiene. Avoids accidentally diffing or modifying anything Supabase manages, and reduces drizzle-kit's introspection surface area.

## 2026-05-15 — Cron timeout: 60s set, hobby tier caps at 10s
Both cron routes set `export const maxDuration = 60`. On Vercel's hobby tier this is capped at 10s anyway; the value is forward-looking for Pro.

**Why:** The open-contest cron fetches 50 prices (~3–5s on Yahoo) plus DB writes. Should fit in 10s for small N. The resolve-contest cron does the same plus per-entry work. For N < ~50 entries, fits in 10s. If a contest grows beyond that, either bump to Pro or refactor the cron to fan out via background jobs. **Not solving until we hit it.**

## 2026-05-15 — Sign-out: server action, no separate route
`signOut()` in `app/(app)/actions.ts` calls `supabase.auth.signOut()` and redirects to `/`. Wired into the nav via a tiny form.

**Why:** No need for a dedicated `/sign-out` route or page when a server action handles it inline. One less file.

## 2026-05-15 — Display-name validation: client + server, server is source of truth
Client editor disables Save until the trimmed value is ≥ 2 chars and changed. Server action re-validates length, charset, and uniqueness with a try/catch on the unique index to handle races.

**Why:** Client check is for UX (don't bother the server with obvious invalid inputs); server check is for correctness. Trusting only client validation is a known antipattern.

## 2026-05-15 — Drop `display_name` in favour of `username` + `first_name`/`last_name`
The earlier ad-hoc `display_name` field is removed. Users now have an immutable `username` (handle), plus editable `first_name` + `last_name`. Profile displays "First Last (@username)".

**Why:** Real-name identity + a stable handle is the de facto standard for social/competitive products. `display_name` muddled the two roles. Username immutability avoids leaderboard impersonation by people swapping into someone else's handle.

## 2026-05-15 — Username + email uniqueness via `lower()` functional unique indices
Both `username` and `email` are unique case-insensitively, enforced by `CREATE UNIQUE INDEX … (lower(col))`. Values stored case-preserved for display.

**Why:** Prevents homoglyph-ish impersonation (`Anthropic` vs `anthropic`) and the standard "is `Foo@x.com` already taken if I sign up with `foo@x.com`?" footgun. Functional indices are postgres-native and don't require the `citext` extension.

## 2026-05-15 — Onboarded gate lives in the `(app)` layout, not in `proxy.ts`
The not-onboarded redirect runs inside `app/(app)/layout.tsx` (which already calls `getCurrentUser`), reading the current pathname via an `x-pathname` request header set by `proxy.ts`.

**Why:** The proxy runs at the edge and shouldn't open a DB connection per request. The `(app)` layout already does the user lookup we need; piggybacking on it costs nothing extra. The `x-pathname` header is needed because Next 16 server components don't expose the current pathname natively.

## 2026-05-15 — Username format `^[a-zA-Z0-9_]{3,20}$`
ASCII only, alphanumerics + underscore, 3–20 chars.

**Why:** Trades flexibility for safety against homoglyph attacks and URL-encoding edge cases. Matches the de facto conventions of GitHub, Twitter, Discord. Documented; can relax later if real users complain.

## 2026-05-15 — Email verification via Supabase's built-in confirmation link
`auth.updateUser({ email })` sends Supabase's confirmation email; user clicks the link, callback at `/auth/confirm-email` flips `users.email_verified_at`. Onboarding can complete with email unverified — verification status surfaces on the profile.

**Why:** Free and supported out of the box; rolling our own would require picking an SMTP provider (Resend, Mailgun, etc.) and is not blocking v1. Email template can be customised later in Supabase Studio.

## 2026-05-15 — Phone change UI deferred
v1 enforces phone uniqueness at signup, but the profile shows phone as read-only. Changing phone requires OTP-to-new-number + Supabase auth sync + `users.phone` update — non-trivial, low-frequency, and not needed for launch.
