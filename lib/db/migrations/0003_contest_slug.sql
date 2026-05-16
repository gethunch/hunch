-- Add a human-readable slug to contests.
--
-- Three-step approach so we don't fail on existing rows:
--   1. Add column as nullable
--   2. Backfill from (format, period_start)
--   3. Tighten to NOT NULL + unique index
--
-- Slug derivation matches lib/constants.ts:contestSlug() exactly:
--   weekly_pick_5 + 2026-05-18 → weekly-pick-5-18-may-26

ALTER TABLE "contests" ADD COLUMN "slug" text;--> statement-breakpoint

UPDATE "contests"
SET "slug" = lower(
  replace("format", '_', '-') || '-' ||
  to_char("period_start", 'DD-Mon-YY')
)
WHERE "slug" IS NULL;--> statement-breakpoint

ALTER TABLE "contests" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "contests_slug_unique" ON "contests" USING btree ("slug");
