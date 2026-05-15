# Hunch — Session Log

Append-only. One entry per session.

---

## 2026-05-15 — Phase 1 kickoff: scaffold + `/docs`
**Worked on:** Phase 1 kickoff. Established the autonomy contract (Claude writes all code, product owner tests as user, directs scope). Scaffolded the Next.js project and persistent-context docs.

**Shipped:**
- `npx create-next-app@latest` with TypeScript, Tailwind v4, App Router, no `/src`, `@/*` alias. Next 16.2.6, React 19.2.4.
- `CLAUDE.md` at repo root — full project brief (autonomy model, stack, data model, rating spec, build order, ground rules) so future sessions auto-load it.
- `/docs/STATE.md`, `/docs/DECISIONS.md`, `/docs/SPEC.md`, `/docs/RUNBOOK.md`, `/docs/SESSIONS.md` initialized.
- `.claude/settings.local.json` added to `.gitignore`.
- GitHub repo `gethunch/hunch` (private) created in the new `gethunch` org; initial commit pushed.

**Spec changes this session:**
- Dropped "solo founder / weekends only / 6-weekend cap" framing across all project docs. Hunch is a full-time project; team being built. Build phases renamed Weekend N → Phase N. Product owner referred to by role, not name.
- Multi-format vision acknowledged. Schema is now multi-format-ready: `contests.format` text column, `week_start` → `period_start`, `unique(format, period_start)`. v1 still ships a single format (`weekly_pick_5`). No new features added — just left the door open for daily / fixed-allocation / variable-N formats later. See DECISIONS.md.

**Punted:**
- Supabase setup — blocked on creds (project URL, anon key, service_role key, pooled DB URL).
- Real SMS provider for phone OTP → deferred to Phase 6 (DLT/TRAI registration not worth Phase 1 time).

**Open questions for next time:**
- Once creds land, confirm Supabase region is `ap-south-1` (Mumbai) for latency.
- Confirm there's a Vercel account linked to the same GitHub account; we'll import the repo there mid-Phase 1.

**Risks flagged:**
- Indian phone OTP via Supabase needs an SMS provider — Twilio is expensive, MSG91 needs a custom hook. Don't be surprised in Phase 6.
- NSE / Yahoo unofficial price endpoints are flaky and can break the cron path. Will be evaluated in Phase 3.

---

### Continued: schema applied
**Shipped (continued):**
- Supabase project provisioned (`viftdarjgkrpeahxzosg`, Mumbai). New `sb_publishable_*` / `sb_secret_*` keys (not legacy anon/service_role JWTs).
- `.env.local` / `.env.example`; new key naming `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY`. `CRON_SECRET` generated.
- Drizzle 0.45 + postgres.js 3.4 installed. `drizzle-kit` 0.31 + `dotenv-cli` for migration tooling.
- Schema written (`lib/db/schema.ts`) and applied: 5 tables + `contest_status` enum live in Supabase public schema. Multi-format-ready (`contests.format` + `unique(format, period_start)`).
- Migration SQL committed at `lib/db/migrations/0000_lean_quicksilver.sql` so future deployments can rebuild deterministically.
- `lib/db/index.ts` exports the Drizzle client (postgres.js with `prepare: false` for the Transaction-mode pooler).

**Risks flagged (continued):**
- `drizzle-kit push` has an introspection crash on subsequent runs (drizzle-kit 0.31 bug in check-constraint handling). The first push worked. Going forward we'll use the `db:generate` → commit-migration → apply flow, not `db:push`. See DECISIONS.md.

**Blocked on:**
- Test phone + OTP pair to smoke-test sign-in. Once that lands, auth UI + middleware + `/api/me`.
