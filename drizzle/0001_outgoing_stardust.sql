CREATE TABLE "member_auth" (
	"league_id" text NOT NULL,
	"member_id" text NOT NULL,
	"pin_hash" text NOT NULL,
	"is_commissioner" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	CONSTRAINT "member_auth_league_id_member_id_pk" PRIMARY KEY("league_id","member_id")
);
