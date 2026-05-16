-- Add indices on hot-path filter columns identified in the code audit.
--
-- entries(user_id, submitted_at): the profile page's "recent entries" reads
-- WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 10. The existing unique
-- (contest_id, user_id) doesn't help — user_id is the trailing column, so
-- leftmost-prefix rules out using it. Without this, the query degrades to
-- a sequential scan of entries as the table grows.
--
-- rating_history(user_id, created_at): both getRatingHistory and
-- getUserRatingAggregates filter by user_id and sort by created_at. The
-- table has only an implicit PK index today.

CREATE INDEX IF NOT EXISTS "entries_user_submitted_idx"
  ON "entries" ("user_id", "submitted_at");

CREATE INDEX IF NOT EXISTS "rating_history_user_created_idx"
  ON "rating_history" ("user_id", "created_at");
