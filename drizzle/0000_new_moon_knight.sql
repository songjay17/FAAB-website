CREATE SEQUENCE "public"."wager_reference_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1;--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" text NOT NULL,
	"actor_member_id" text NOT NULL,
	"action" text NOT NULL,
	"subject_id" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"league_id" text PRIMARY KEY NOT NULL,
	"season" integer NOT NULL,
	"seeded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"league_id" text NOT NULL,
	"id" text NOT NULL,
	"matchup_id" text NOT NULL,
	"week" integer NOT NULL,
	"home_team_id" text NOT NULL,
	"away_team_id" text NOT NULL,
	"status" text NOT NULL,
	"home_moneyline" integer NOT NULL,
	"away_moneyline" integer NOT NULL,
	"total_faab_home" double precision NOT NULL,
	"total_faab_away" double precision NOT NULL,
	"odds_updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "markets_league_id_id_pk" PRIMARY KEY("league_id","id")
);
--> statement-breakpoint
CREATE TABLE "wagers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" text NOT NULL,
	"reference" text NOT NULL,
	"member_id" text NOT NULL,
	"market_id" text NOT NULL,
	"matchup_id" text NOT NULL,
	"week" integer NOT NULL,
	"selected_team_id" text NOT NULL,
	"opponent_team_id" text NOT NULL,
	"moneyline_at_bet" integer NOT NULL,
	"stake_faab" double precision NOT NULL,
	"potential_profit" double precision NOT NULL,
	"potential_payout" double precision NOT NULL,
	"final_payout" double precision,
	"status" text NOT NULL,
	"placed_at" timestamp with time zone NOT NULL,
	"settled_at" timestamp with time zone,
	CONSTRAINT "wagers_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"league_id" text NOT NULL,
	"member_id" text NOT NULL,
	"total_budget" double precision NOT NULL,
	"available_faab" double precision NOT NULL,
	"reserved_faab" double precision NOT NULL,
	"weekly_profit_loss" double precision NOT NULL,
	"season_profit_loss" double precision NOT NULL,
	"sleeper_waiver_spend" double precision NOT NULL,
	CONSTRAINT "wallets_league_id_member_id_pk" PRIMARY KEY("league_id","member_id")
);
