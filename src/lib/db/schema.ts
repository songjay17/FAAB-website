import {
  doublePrecision,
  integer,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// The whole book is keyed by league_id: a Sleeper season rollover mints a new
// league id, and a new id simply has no rows yet — the new season's book
// bootstraps clean without touching the old one (same semantics the
// localStorage version had, but shared).

/** JHL-#### wager references, issued by the database so they're unique league-wide. */
export const wagerReferenceSeq = pgSequence("wager_reference_seq", { startWith: 1001 });

/** One row per bootstrapped league book — marks seeding as done and records when. */
export const books = pgTable("books", {
  leagueId: text("league_id").primaryKey(),
  season: integer("season").notNull(),
  seededAt: timestamp("seeded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wallets = pgTable(
  "wallets",
  {
    leagueId: text("league_id").notNull(),
    memberId: text("member_id").notNull(),
    totalBudget: doublePrecision("total_budget").notNull(),
    availableFaab: doublePrecision("available_faab").notNull(),
    reservedFaab: doublePrecision("reserved_faab").notNull(),
    weeklyProfitLoss: doublePrecision("weekly_profit_loss").notNull(),
    seasonProfitLoss: doublePrecision("season_profit_loss").notNull(),
    sleeperWaiverSpend: doublePrecision("sleeper_waiver_spend").notNull(),
  },
  (t) => [primaryKey({ columns: [t.leagueId, t.memberId] })]
);

export const markets = pgTable(
  "markets",
  {
    leagueId: text("league_id").notNull(),
    /** App-level id: `market-${matchupId}`. */
    id: text("id").notNull(),
    matchupId: text("matchup_id").notNull(),
    week: integer("week").notNull(),
    // home/away denormalized from the matchup at pricing time so wager
    // placement can validate team choice and pick the right line without a
    // Sleeper fetch.
    homeTeamId: text("home_team_id").notNull(),
    awayTeamId: text("away_team_id").notNull(),
    status: text("status").notNull(),
    homeMoneyline: integer("home_moneyline").notNull(),
    awayMoneyline: integer("away_moneyline").notNull(),
    totalFaabHome: doublePrecision("total_faab_home").notNull(),
    totalFaabAway: doublePrecision("total_faab_away").notNull(),
    /** When the line was priced — the odds-snapshot moment. */
    oddsUpdatedAt: timestamp("odds_updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.leagueId, t.id] })]
);

export const wagers = pgTable("wagers", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: text("league_id").notNull(),
  reference: text("reference").notNull().unique(),
  memberId: text("member_id").notNull(),
  marketId: text("market_id").notNull(),
  matchupId: text("matchup_id").notNull(),
  week: integer("week").notNull(),
  selectedTeamId: text("selected_team_id").notNull(),
  opponentTeamId: text("opponent_team_id").notNull(),
  moneylineAtBet: integer("moneyline_at_bet").notNull(),
  stakeFaab: doublePrecision("stake_faab").notNull(),
  potentialProfit: doublePrecision("potential_profit").notNull(),
  potentialPayout: doublePrecision("potential_payout").notNull(),
  finalPayout: doublePrecision("final_payout"),
  status: text("status").notNull(),
  placedAt: timestamp("placed_at", { withTimezone: true }).notNull(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

/**
 * Server-side record of privileged actions (void, settle, market lock,
 * reset). Written from PR 1 on; the commissioner UI still shows its local
 * session log — wiring it to read this table comes with identity (PR 2),
 * when actor ids become trustworthy.
 */
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: text("league_id").notNull(),
  actorMemberId: text("actor_member_id").notNull(),
  action: text("action").notNull(),
  subjectId: text("subject_id"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
