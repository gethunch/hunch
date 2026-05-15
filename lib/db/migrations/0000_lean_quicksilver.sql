CREATE TYPE "public"."contest_status" AS ENUM('open', 'live', 'resolved');--> statement-breakpoint
CREATE TABLE "contests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"format" text NOT NULL,
	"period_start" date NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"locks_at" timestamp with time zone NOT NULL,
	"resolves_at" timestamp with time zone NOT NULL,
	"status" "contest_status" DEFAULT 'open' NOT NULL,
	"entry_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contest_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"final_return" numeric(8, 4),
	"final_rank" integer,
	"rating_delta" integer
);
--> statement-breakpoint
CREATE TABLE "entry_picks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"symbol" text NOT NULL,
	"entry_price" numeric(10, 2),
	"exit_price" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "rating_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contest_id" uuid NOT NULL,
	"rating_before" integer NOT NULL,
	"rating_after" integer NOT NULL,
	"delta" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"display_name" text NOT NULL,
	"rating" integer DEFAULT 1500 NOT NULL,
	"contests_played" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_display_name_unique" UNIQUE("display_name")
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_contest_id_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."contests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_picks" ADD CONSTRAINT "entry_picks_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_contest_id_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."contests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contests_format_period_unique" ON "contests" USING btree ("format","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "entries_contest_user_unique" ON "entries" USING btree ("contest_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_picks_entry_symbol_unique" ON "entry_picks" USING btree ("entry_id","symbol");