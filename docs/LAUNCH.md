# Hunch — Launch Checklist

Living checklist for v1 launch. Nothing here is automated.

## Engineering — done

- [x] All 6 phases shipped (skeleton → auth → contests → rating → leaderboard/profile → polish → cron schedules)
- [x] Prod deployed at https://hunch-seven.vercel.app
- [x] Vercel cron schedules wired (`vercel.json`): Mon 03:45 UTC, Fri 10:05 UTC
- [x] Rating math tested (Vitest, 28 tests)
- [x] End-to-end cron cycle manually verified on dev (`seed:test-contest`)

## Engineering — TODO before public launch

- [ ] **First production cron cycle observed.** After the next Monday 03:45 UTC, check Vercel logs for the open-contest cron success. Then Friday 10:05 UTC for resolve-contest.
- [ ] **Verify production seed.** Make sure there's an open `weekly_pick_5` contest in prod DB for the first real Monday (run `npm run seed:contest` against a prod env if needed, or insert via Supabase SQL editor — the resolve cron auto-seeds going forward).
- [ ] **Real SMS provider.** Currently using Supabase test phone OTP only. To accept real users:
  - Twilio: sign up, get Account SID + Auth Token + Messaging Service SID, set in Supabase Auth → Providers → Phone. **DLT registration required for Indian numbers** (TRAI mandate) — sender ID, template approval, entity registration. ~₹0.50–0.70 per SMS.
  - MSG91 (cheaper for India): not first-class in Supabase. Needs a custom "Send SMS" hook via Supabase Auth Hooks.
- [ ] **Test the first real user signup end-to-end** with a real phone number once SMS is wired.
- [ ] **Custom domain.** Currently `hunch-seven.vercel.app`. When there's a brand decision, point a real domain at the Vercel deployment.
- [ ] **NIFTY 50 list freshness.** The hardcoded list in `lib/constants.ts` is current as of 2026-05-15 (post-Tata Motors demerger). Verify against NSE's official list before launch and after each rebalance (semi-annually). Run `npm run probe:market` to validate every symbol fetches.

## Operations — once live

- [ ] **Weekly dogfood.** Submit your own picks before every Monday open until at least 10 real users are playing.
- [ ] **Cron health monitoring.** Vercel logs are the only observability for now. After 2–3 weeks of clean runs, consider adding Sentry / Logtail if pain accumulates.
- [ ] **Yahoo Finance failure plan.** It's unofficial. If it goes down, the resolve-contest cron will throw. Migration path: swap `fetchOne` in `lib/market/index.ts` to a different source. Stash a second source as a fallback in the future.

## Explicitly NOT v1

- Real money / prizes
- Mobile app
- Multiple contest formats (schema is ready; UI/cron isn't)
- Tiers / badges / avatars
- Glicko-2 (current rating is the locked spec)
- Market-cap weighting
- Email notifications
- Admin panel
