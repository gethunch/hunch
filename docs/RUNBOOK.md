# Hunch — Runbook

How to run, deploy, debug, and operate Hunch.
Update whenever any of these change.

---

## Local development

### Prerequisites
- Node 20+ (we're on v24 locally as of 2026-05-15)
- npm 11+
- A Supabase project (see "Env vars" below for what to plug in)

### First-time setup
```bash
git clone git@github.com:gethunch/hunch.git
cd hunch
npm install
cp .env.example .env.local   # then fill in values — see "Env vars"
npm run dev
```

Open http://localhost:3000.

### Env vars
| Key                                       | Where used         | Where to get it                                                                                         |
|-------------------------------------------|--------------------|---------------------------------------------------------------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`                | Client + server    | Supabase → Settings → API → Project URL (or via dashboard URL `.../project/<ref>`)                      |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`    | Client + server    | Supabase → Settings → API → publishable key (`sb_publishable_*`; legacy projects: `anon` JWT)           |
| `SUPABASE_SECRET_KEY`                     | Server only        | Supabase → Settings → API → secret key (`sb_secret_*`; legacy projects: `service_role` JWT) — **secret** |
| `DATABASE_URL`                            | Drizzle migrations | Supabase → Settings → Database → Connection string → **Transaction pooler (port 6543)**                 |
| `CRON_SECRET`                             | Server only        | Generate locally (`openssl rand -base64 32`); set same value in Vercel env                              |

`.env.local` is gitignored. Don't commit secrets. `.env.example` (committed) has placeholders.

### Useful npm scripts
```bash
npm run dev      # Next.js dev server on :3000
npm run build    # Production build
npm run start    # Run production build locally
npm run lint     # ESLint
```

_Drizzle and Vitest scripts will be added when those tools land (W1 / W3)._

---

## Deploy

### Production
- Hosting: Vercel.
- `main` branch → production. Pushes to `main` auto-deploy.
- Preview deploys: every PR/branch gets a Vercel preview URL.
- Env vars: set in Vercel dashboard (Production, Preview, Development scopes as appropriate). Service role and CRON_SECRET are server-only.

### First-time Vercel setup
1. Import the GitHub repo in Vercel.
2. Framework preset: Next.js (auto-detected).
3. Set env vars (see table above).
4. Deploy.

---

## Cron

Both cron endpoints require `Authorization: Bearer ${CRON_SECRET}`. Vercel attaches this header automatically to scheduled cron requests when `CRON_SECRET` is set as an env var.

### Schedule (`vercel.json`)
- `open-contest`: Monday 09:15 IST = `45 3 * * 1` UTC
- `resolve-contest`: Friday 15:35 IST = `5 10 * * 5` UTC

### Trigger manually (smoke test)
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://hunch-seven.vercel.app/api/cron/open-contest

curl -H "Authorization: Bearer $CRON_SECRET" \
  https://hunch-seven.vercel.app/api/cron/resolve-contest
```

Or locally:
```bash
CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2-)
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/open-contest
```

### Check that a scheduled cron fired
Vercel dashboard → Project → **Logs** → filter by path `/api/cron/...`. Successful runs return `{"ok": true, ...}` JSON. Failed runs surface the stack trace.

### Seed a test contest for local cron testing
```bash
npm run seed:test-contest  # inserts backdated contest with 5 synthetic users
```
Cleanup SQL is at the top of `scripts/seed-test-contest.ts`.

---

## DB

### Inspect data
Supabase dashboard → SQL Editor. Or psql with the **direct** connection string (port 5432) from Settings → Database.

### Run migrations
```bash
npm run db:push        # apply Drizzle schema to Supabase (fast path during dev)
npm run db:generate    # emit migration SQL files into lib/db/migrations (commit these)
npm run db:studio      # open Drizzle Studio (web UI for inspecting DB)
```
Behind the scenes these are `dotenv-cli` wrappers around `drizzle-kit` that load `.env.local`.

For hand-written migrations (e.g. `0001_onboarding_fields.sql`, `0002_avatars_bucket.sql`), apply via psql:
```bash
set -a && source .env.local && set +a
psql "$DATABASE_URL" -f lib/db/migrations/0001_onboarding_fields.sql
psql "$DATABASE_URL" -f lib/db/migrations/0002_avatars_bucket.sql
```
`db:generate` requires a TTY for rename conflict resolution and is awkward in this environment — keep hand-rolled migrations as the default for non-trivial schema changes.

### Seed a contest manually
A seed script lands in Phase 2. Until then, insert via SQL editor:
```sql
insert into contests (format, period_start, opens_at, locks_at, resolves_at, status)
values ('weekly_pick_5', '2026-05-18',
        '2026-05-18 09:15:00+05:30', '2026-05-18 09:15:00+05:30',
        '2026-05-22 15:30:00+05:30', 'open');
```

---

## Auth (phone OTP)

### Dev
Supabase dashboard → Authentication → Phone → enable, then add test phone numbers with fixed OTPs (Authentication → Phone Auth → Test phone numbers).

Sign in with the test number → enter the fixed OTP → session created. No real SMS sent.

### Prod
TBD — real SMS provider decision deferred to W6. Likely Twilio or MSG91 (custom Supabase SMS hook).

---

## Email verification (Supabase confirmation link)

Onboarding fires `auth.updateUser({ email })`, which makes Supabase send a confirmation email. The link in that email redirects back to `/auth/confirm-email?code=...` on this app, which exchanges the code for a session and stamps `users.email_verified_at`.

For this to work, the redirect URL must be on Supabase's allowlist:

1. Supabase dashboard → **Authentication** → **URL Configuration**.
2. **Site URL**: set to the production URL (e.g. `https://hunch-seven.vercel.app`).
3. **Redirect URLs** (additional): add both of these:
   - `http://localhost:3000/auth/confirm-email`
   - `https://hunch-seven.vercel.app/auth/confirm-email`

The email template (Authentication → Email Templates → "Change Email Address") uses the Supabase default. Customise later for branding.

---

## Avatar storage (Supabase Storage)

A public `avatars` bucket holds user-uploaded profile pictures. RLS allows public read; writes are scoped to objects under `avatars/<user_id>/`.

Setup is one-off — apply via `lib/db/migrations/0002_avatars_bucket.sql` (see "Run migrations" above). Idempotent: re-running drops + recreates policies.

Inspect / debug:
```sql
select * from storage.buckets where id = 'avatars';
select policyname, cmd, qual, with_check from pg_policies where tablename = 'objects' and policyname like '%avatar%';
```

Uploaded objects are listed in Supabase dashboard → Storage → `avatars` → `<user_id>/avatar.<ext>`.
