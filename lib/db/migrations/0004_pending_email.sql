-- Add pending_email column to users.
--
-- Separates "wish to verify" (no claim on the address) from users.email,
-- which carries a unique-lower index and represents a verified claim.
--
-- Why: previously updateEmail wrote the requested address straight to
-- users.email + cleared emailVerifiedAt. The unique index then blocked
-- anyone else from ever registering that address, even if the original
-- requester never verified. An attacker could squat victim@example.com
-- on day 1 and prevent the real owner from ever signing up.
--
-- New flow: updateEmail and completeOnboarding write to pending_email.
-- /auth/confirm-email promotes pending_email -> email + sets
-- email_verified_at when Supabase's confirmation succeeds. No unique
-- index on pending_email — two users can stage the same address, and
-- whoever verifies first wins (Supabase auth's own unique-email
-- constraint enforces the race).

ALTER TABLE "users" ADD COLUMN "pending_email" text;
