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
| Key                            | Where used         | Where to get it                                                |
|--------------------------------|--------------------|----------------------------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`     | Client + server    | Supabase dashboard → Project Settings → API → Project URL      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Client + server    | Supabase dashboard → Project Settings → API → anon public key  |
| `SUPABASE_SERVICE_ROLE_KEY`    | Server only        | Supabase dashboard → Project Settings → API → service_role key |
| `DATABASE_URL`                 | Drizzle migrations | Supabase dashboard → Settings → Database → Connection string → **Transaction mode (pooled, port 6543)** |
| `CRON_SECRET`                  | Server only        | Generate locally (`openssl rand -base64 32`); set same value in Vercel env |

`.env.local` is gitignored. Don't commit secrets.

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

Both cron endpoints require `Authorization: Bearer ${CRON_SECRET}`.

### Trigger manually (smoke test)
```bash
curl -X POST https://<deployment-url>/api/cron/open-contest \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST https://<deployment-url>/api/cron/resolve-contest \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Schedule (Vercel)
Set in `vercel.json` (added in W6):
- `open-contest`: Monday 09:15 IST = `45 3 * * 1` UTC
- `resolve-contest`: Friday 15:35 IST = `5 10 * * 5` UTC

---

## DB

### Inspect data
Supabase dashboard → SQL Editor. Or psql with the **direct** connection string (port 5432) from Settings → Database.

### Run migrations
```bash
npm run db:push        # apply Drizzle schema to Supabase (W1)
npm run db:generate    # emit migration SQL files (optional)
```

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
