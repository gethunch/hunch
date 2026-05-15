import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const contestStatus = pgEnum("contest_status", [
  "open",
  "live",
  "resolved",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  displayName: text("display_name").notNull().unique(),
  rating: integer("rating").notNull().default(1500),
  contestsPlayed: integer("contests_played").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contests = pgTable(
  "contests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    format: text("format").notNull(),
    periodStart: date("period_start").notNull(),
    opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
    locksAt: timestamp("locks_at", { withTimezone: true }).notNull(),
    resolvesAt: timestamp("resolves_at", { withTimezone: true }).notNull(),
    status: contestStatus("status").notNull().default("open"),
    entryCount: integer("entry_count").notNull().default(0),
  },
  (t) => [
    uniqueIndex("contests_format_period_unique").on(t.format, t.periodStart),
  ],
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contestId: uuid("contest_id")
      .notNull()
      .references(() => contests.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finalReturn: numeric("final_return", {
      precision: 8,
      scale: 4,
      mode: "number",
    }),
    finalRank: integer("final_rank"),
    ratingDelta: integer("rating_delta"),
  },
  (t) => [
    uniqueIndex("entries_contest_user_unique").on(t.contestId, t.userId),
  ],
);

export const entryPicks = pgTable(
  "entry_picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    entryPrice: numeric("entry_price", {
      precision: 10,
      scale: 2,
      mode: "number",
    }),
    exitPrice: numeric("exit_price", {
      precision: 10,
      scale: 2,
      mode: "number",
    }),
  },
  (t) => [
    uniqueIndex("entry_picks_entry_symbol_unique").on(t.entryId, t.symbol),
  ],
);

export const ratingHistory = pgTable("rating_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  contestId: uuid("contest_id")
    .notNull()
    .references(() => contests.id),
  ratingBefore: integer("rating_before").notNull(),
  ratingAfter: integer("rating_after").notNull(),
  delta: integer("delta").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
