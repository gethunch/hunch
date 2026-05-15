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
