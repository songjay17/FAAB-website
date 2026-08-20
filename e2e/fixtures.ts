import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WAGER_REFERENCE_PREFIX, SELF_CANCEL_WINDOW_MS } from "../src/lib/betting-constants";
import { calculatePayout, calculateProfit } from "../src/lib/odds";
import { MAX_FAAB_ADJUSTMENT } from "../src/lib/server/book";
import { effectiveMarketStatus, isPastLockTime } from "../src/lib/market-lock";
import { mockWallets } from "../src/lib/mock-data/wallets";
import { mockWagers } from "../src/lib/mock-data/wagers";
import { generateMarkets } from "../src/lib/state/generate-markets";
import {
  settleWagersForWeek,
  voidWager as voidWagerPure,
  type SettlementResult,
} from "../src/lib/state/settlement";
import { buildProjectionLookup, type ProjectionLookup } from "../src/lib/fantasypros/mappers";
import { mapMatchups, mapRosterPlayers } from "../src/lib/sleeper/mappers";
import type {
  BettingMarket,
  Book,
  FaabWallet,
  FantasyPlayer,
  MarketStatus,
  Wager,
  WeeklyMatchup,
} from "../src/lib/types";
import type { SleeperMatchupEntry, SleeperPlayersById, SleeperRoster } from "../src/lib/sleeper/types";

// Every spec imports { test, expect } from "./fixtures" instead of
// "@playwright/test". The extended `test` intercepts two kinds of traffic:
//
// 1. Sleeper API + /api/projections — served from recorded JSON in
//    e2e/fixtures/, patched to a frozen mid-season snapshot (current week 7,
//    weeks 1–6 settled, zero real waiver spend, nfl-state pinned to
//    regular-season week 7). The browser still loads league/team/matchup
//    data itself (SleeperDataProvider), so these stubs keep that
//    deterministic.
//
// 2. The app's own book API (/api/book, /api/wagers, /api/commissioner/*) —
//    the book lives server-side in Postgres now, so each test context gets a
//    StubBook: an in-memory engine seeded with the old demo wallets/wagers
//    and markets priced by the real pricing code from the same fixtures. It
//    mirrors the server's validation and settlement (same pure functions),
//    so specs exercise the UI against realistic API behavior with no
//    database involved.

const FIXTURES_DIR = join(__dirname, "fixtures");

/** Weeks with a recorded matchups fixture — matches last_scored_leg in league.json. */
const RECORDED_WEEKS = 7;

const LEAGUE_ID = "1230632258184957952";

// Specs run as the league's real commissioner (jdawnso, Sleeper is_owner) —
// they exercise both member flows (place/cancel) and commissioner flows
// (void/settle/lock), and the server gates the latter on this flag. The
// /api/auth/session stub below reports this identity as already signed in,
// so specs don't each have to walk the claim/login screen; sign-in itself
// is covered by its own spec (e2e/sign-in.spec.ts) which overrides these
// routes.
const SESSION_MEMBER_ID = "975162996680945664";

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), "utf-8")) as T;
}

function fixture(name: string) {
  return {
    status: 200,
    contentType: "application/json",
    body: readFileSync(join(FIXTURES_DIR, name), "utf-8"),
  };
}

// ---------------------------------------------------------------------------
// Build the frozen league's matchups + market lines once, from the same
// fixtures the browser sees, using the app's real mapping/pricing code — so
// the stub's odds are exactly what the client-side book used to compute.

const rosters = readJson<SleeperRoster[]>("rosters.json");
const allPlayers = readJson<SleeperPlayersById>("players.json");

const projectionLookup: ProjectionLookup = new Map();
for (const position of ["QB", "RB", "WR", "TE", "K", "DST"]) {
  const response = readJson<{ players: Parameters<typeof buildProjectionLookup>[0] }>(
    `projections-${position}.json`
  );
  for (const [key, points] of buildProjectionLookup(response.players)) {
    projectionLookup.set(key, points);
  }
}

const playersByTeam: Record<string, FantasyPlayer[]> = {};
for (const roster of rosters) {
  playersByTeam[`roster-${roster.roster_id}`] = mapRosterPlayers(
    roster,
    allPlayers,
    projectionLookup
  );
}

// The recorded 2025 schedule is in the past, which would auto-lock every
// market and break the betting specs. The frozen snapshot is "mid-week 7,
// betting open", so lock times are rebased into the future — far enough out
// that the UI shows a date rather than a countdown, keeping assertions
// stable. lock-timing.spec.ts overrides this per-test to exercise the
// deadline itself.
const STUB_LOCK_AT = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

const allMatchups: WeeklyMatchup[] = [];
for (let week = 1; week <= RECORDED_WEEKS; week++) {
  const entries = readJson<SleeperMatchupEntry[]>(`matchups-${week}.json`);
  allMatchups.push(...mapMatchups(week, entries, STUB_LOCK_AT, true));
}
const matchupById = new Map(allMatchups.map((m) => [m.id, m]));

const baseMarkets = generateMarkets(allMatchups, playersByTeam).map((market) => ({
  ...market,
  lockAt: STUB_LOCK_AT,
}));

const round2 = (n: number) => Math.round(n * 100) / 100;

function highestReference(wagers: Wager[]): number {
  return wagers.reduce((max, w) => {
    if (!w.reference.startsWith(WAGER_REFERENCE_PREFIX)) return max;
    const n = Number(w.reference.slice(WAGER_REFERENCE_PREFIX.length));
    return Number.isFinite(n) && n > max ? n : max;
  }, 1000);
}

type StubAuditEntry = {
  id: string;
  actor: string;
  action: string;
  subject: string | null;
  reason: string | null;
  createdAt: string;
};

const users = readJson<Array<{ user_id: string; display_name: string }>>("users.json");

/** In-memory stand-in for the server book (src/lib/server/book.ts) — same rules, no database. */
class StubBook {
  wallets: FaabWallet[] = [];
  wagers: Wager[] = [];
  markets: BettingMarket[] = [];
  private audit: StubAuditEntry[] = [];
  private nextReference = 1001;
  private nextId = 1;

  constructor() {
    this.reset();
  }

  reset() {
    this.wallets = structuredClone(mockWallets);
    this.wagers = structuredClone(mockWagers);
    this.markets = structuredClone(baseMarkets);
    this.audit = [];
    this.nextReference = highestReference(this.wagers) + 1;
  }

  /** Mirrors the server's audit_log writes for commissioner actions. */
  private log(action: string, subject: string | null, reason: string | null = null) {
    this.audit.unshift({
      id: `stub-audit-${this.audit.length + 1}`,
      actor: users.find((u) => u.user_id === SESSION_MEMBER_ID)?.display_name ?? SESSION_MEMBER_ID,
      action,
      subject,
      reason,
      createdAt: new Date().toISOString(),
    });
  }

  auditEntries(): StubAuditEntry[] {
    return this.audit;
  }

  /** Mirrors the server's adjustWalletFaab: available balance only, reason required, audit-logged. */
  adjustFaab(
    memberId: string,
    amount: number,
    reason: string
  ): { ok: true } | { ok: false; error: string } {
    const rounded = round2(amount);
    if (!Number.isFinite(rounded) || rounded === 0) {
      return { ok: false, error: "Enter a non-zero adjustment amount." };
    }
    if (Math.abs(rounded) > MAX_FAAB_ADJUSTMENT) {
      return {
        ok: false,
        error: `Adjustments are capped at ${MAX_FAAB_ADJUSTMENT} FAAB per correction.`,
      };
    }
    if (!reason.trim()) return { ok: false, error: "A reason is required." };
    const wallet = this.wallets.find((w) => w.memberId === memberId);
    if (!wallet) return { ok: false, error: "Member wallet not found." };
    const next = round2(wallet.availableFaab + rounded);
    if (next < 0) {
      return {
        ok: false,
        error: `That would take the balance below zero (available: ${wallet.availableFaab}).`,
      };
    }
    wallet.availableFaab = next;
    this.log("adjust-faab", memberId, `${rounded > 0 ? "+" : ""}${rounded} FAAB — ${reason.trim()}`);
    return { ok: true };
  }

  /** Moves one matchup's betting deadline (and optionally its stored status) — see lock-timing.spec.ts. */
  setLockAt(matchupId: string, lockAt: string, status?: MarketStatus) {
    const market = this.markets.find((m) => m.matchupId === matchupId);
    if (!market) throw new Error(`No stub market for matchup ${matchupId}`);
    market.lockAt = lockAt;
    if (status) market.status = status;
  }

  /** Every member counts as claimed — specs run against an established league. */
  memberClaims() {
    return this.wallets.map((wallet) => ({
      memberId: wallet.memberId,
      displayName:
        users.find((u) => u.user_id === wallet.memberId)?.display_name ?? wallet.memberId,
      claimed: true,
    }));
  }

  book(): Book {
    return {
      leagueId: LEAGUE_ID,
      wallets: this.wallets,
      wagers: this.wagers,
      // The clock is applied as the book is served, mirroring toMarket on
      // the server: a market past its deadline reads as locked.
      markets: this.markets.map((m) => ({
        ...m,
        status: effectiveMarketStatus(m.status, m.lockAt),
      })),
    };
  }

  place(input: {
    memberId: string;
    marketId: string;
    selectedTeamId: string;
    stakeFaab: number;
  }): { ok: true; wager: Wager } | { ok: false; error: string } {
    const market = this.markets.find((m) => m.id === input.marketId);
    if (!market) return { ok: false, error: "Market not found." };
    if (market.status !== "open") {
      return { ok: false, error: "This market is no longer accepting bets." };
    }
    // Mirrors the server's in-transaction deadline check.
    if (isPastLockTime(market.lockAt)) {
      return {
        ok: false,
        error: "Betting for this matchup closed when the week's games kicked off.",
      };
    }
    const matchup = matchupById.get(market.matchupId);
    if (
      !matchup ||
      (input.selectedTeamId !== matchup.homeTeamId && input.selectedTeamId !== matchup.awayTeamId)
    ) {
      return { ok: false, error: "Selected team is not part of this matchup." };
    }
    const stake = round2(input.stakeFaab);
    if (!Number.isFinite(stake) || stake <= 0) {
      return { ok: false, error: "Stake must be a positive FAAB amount." };
    }
    const wallet = this.wallets.find((w) => w.memberId === input.memberId);
    if (!wallet) return { ok: false, error: "Member wallet not found." };
    if (stake > wallet.availableFaab) {
      return { ok: false, error: "Stake exceeds available FAAB." };
    }

    const isHome = input.selectedTeamId === matchup.homeTeamId;
    const moneyline = isHome ? market.odds.homeMoneyline : market.odds.awayMoneyline;
    const wager: Wager = {
      id: `stub-wager-${this.nextId++}`,
      reference: `${WAGER_REFERENCE_PREFIX}${this.nextReference++}`,
      memberId: input.memberId,
      marketId: market.id,
      matchupId: market.matchupId,
      week: matchup.week,
      selectedTeamId: input.selectedTeamId,
      opponentTeamId: isHome ? matchup.awayTeamId : matchup.homeTeamId,
      moneylineAtBet: moneyline,
      stakeFaab: stake,
      potentialProfit: round2(calculateProfit(stake, moneyline)),
      potentialPayout: round2(calculatePayout(stake, moneyline)),
      status: "open",
      placedAt: new Date().toISOString(),
    };
    wallet.availableFaab = round2(wallet.availableFaab - stake);
    wallet.reservedFaab = round2(wallet.reservedFaab + stake);
    this.wagers.unshift(wager);
    return { ok: true, wager };
  }

  cancel(memberId: string, wagerId: string): { ok: true } | { ok: false; error: string } {
    const wager = this.wagers.find((w) => w.id === wagerId);
    if (!wager || wager.memberId !== memberId) return { ok: false, error: "Wager not found." };
    if (wager.status !== "open") {
      return { ok: false, error: "Only open wagers can be cancelled." };
    }
    if (Date.now() - new Date(wager.placedAt).getTime() > SELF_CANCEL_WINDOW_MS) {
      return {
        ok: false,
        error: "The self-cancel window has passed — ask the commissioner to void it instead.",
      };
    }
    return this.applyVoid(wager);
  }

  void(wagerId: string, reason: string): { ok: true } | { ok: false; error: string } {
    if (!reason.trim()) return { ok: false, error: "A reason is required." };
    const wager = this.wagers.find((w) => w.id === wagerId);
    if (!wager) return { ok: false, error: "Wager not found." };
    if (wager.status !== "open") {
      return { ok: false, error: "Only open wagers can be voided." };
    }
    const result = this.applyVoid(wager);
    if (result.ok) this.log("void-wager", wager.reference, reason.trim());
    return result;
  }

  private applyVoid(wager: Wager): { ok: true } | { ok: false; error: string } {
    const wallet = this.wallets.find((w) => w.memberId === wager.memberId);
    if (!wallet) return { ok: false, error: "Member wallet not found." };
    const { updatedWallet, updatedWager } = voidWagerPure(wallet, wager);
    this.wallets = this.wallets.map((w) => (w.memberId === wallet.memberId ? updatedWallet : w));
    this.wagers = this.wagers.map((w) => (w.id === wager.id ? updatedWager : w));
    return { ok: true };
  }

  settle(actorMemberId: string, week: number): SettlementResult {
    const aggregate: SettlementResult = {
      week,
      processed: 0,
      won: 0,
      lost: 0,
      refunded: 0,
      totalPaidOut: 0,
      skipped: [],
      updatedWallet:
        this.wallets.find((w) => w.memberId === actorMemberId) ?? this.wallets[0],
      updatedWagers: null,
    };
    for (const wallet of [...this.wallets]) {
      const result = settleWagersForWeek({
        week,
        wallet,
        wagers: this.wagers.filter((w) => w.memberId === wallet.memberId),
        matchups: allMatchups,
      });
      aggregate.processed += result.processed;
      aggregate.won += result.won;
      aggregate.lost += result.lost;
      aggregate.refunded += result.refunded;
      aggregate.totalPaidOut = round2(aggregate.totalPaidOut + result.totalPaidOut);
      aggregate.skipped.push(...result.skipped);
      if (result.updatedWagers) {
        this.wallets = this.wallets.map((w) =>
          w.memberId === wallet.memberId ? result.updatedWallet : w
        );
        this.wagers = this.wagers.map(
          (w) => result.updatedWagers!.find((u) => u.id === w.id) ?? w
        );
        if (wallet.memberId === actorMemberId) {
          aggregate.updatedWallet = result.updatedWallet;
        }
      }
    }
    if (aggregate.processed > 0) this.log("settle-week", `week-${week}`);
    return aggregate;
  }

  setMarketStatus(matchupId: string, status: MarketStatus): { ok: true } | { ok: false; error: string } {
    const market = this.markets.find((m) => m.matchupId === matchupId);
    if (!market) return { ok: false, error: "Market not found." };
    market.status = status;
    this.log(`market-${status}`, matchupId);
    return { ok: true };
  }
}

// ---------------------------------------------------------------------------

async function stubLeagueApis(context: BrowserContext, book: StubBook) {
  await context.route("https://api.sleeper.app/**", (route) => {
    const { pathname } = new URL(route.request().url());

    const matchups = pathname.match(/^\/v1\/league\/\d+\/matchups\/(\d+)$/);
    if (matchups) {
      const week = Number(matchups[1]);
      if (week >= 1 && week <= RECORDED_WEEKS) {
        return route.fulfill(fixture(`matchups-${week}.json`));
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (/^\/v1\/league\/\d+\/rosters$/.test(pathname)) {
      return route.fulfill(fixture("rosters.json"));
    }
    if (/^\/v1\/league\/\d+\/users$/.test(pathname)) {
      return route.fulfill(fixture("users.json"));
    }
    if (/^\/v1\/league\/\d+$/.test(pathname)) {
      return route.fulfill(fixture("league.json"));
    }
    if (pathname === "/v1/players/nfl") {
      return route.fulfill(fixture("players.json"));
    }
    if (pathname === "/v1/state/nfl") {
      return route.fulfill(fixture("nfl-state.json"));
    }
    if (/^\/schedule\/nfl\/regular\/\d+$/.test(pathname)) {
      return route.fulfill(fixture("schedule.json"));
    }
    // League-rollover successor lookups (resolve-league.ts) — the frozen
    // in-season league has no successor, so any user-leagues query is empty.
    if (/^\/v1\/user\/\d+\/leagues\/nfl\/\d+$/.test(pathname)) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    // Fail loudly on anything unstubbed rather than silently hitting the
    // live API — the app surfaces the error state and the test fails there.
    return route.fulfill({ status: 500, body: `No fixture for ${pathname}` });
  });

  await context.route("**/api/**", (route) => {
    const { pathname, searchParams } = new URL(route.request().url());
    const method = route.request().method();
    const json = (data: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    const body = (): Record<string, unknown> =>
      (route.request().postDataJSON() ?? {}) as Record<string, unknown>;

    if (pathname === "/api/projections") {
      return route.fulfill(fixture(`projections-${searchParams.get("position")}.json`));
    }
    if (pathname === "/api/auth/session") {
      if (method === "DELETE") return json({ ok: true });
      return json({
        session: { leagueId: LEAGUE_ID, memberId: SESSION_MEMBER_ID, isCommissioner: true },
        members: book.memberClaims(),
      });
    }
    if (pathname === "/api/commissioner/audit" && method === "GET") {
      return json({ entries: book.auditEntries() });
    }
    if (pathname === "/api/commissioner/reset-pin" && method === "POST") {
      return json({ members: book.memberClaims() });
    }
    if (pathname === "/api/book" && method === "GET") {
      return json(book.book());
    }
    if (pathname === "/api/book/reset" && method === "POST") {
      book.reset();
      return json({ book: book.book() });
    }
    if (pathname === "/api/wagers" && method === "POST") {
      const b = body();
      const result = book.place({
        // Actor comes from the session, never the request body — mirrors the
        // server, which derives it from the signed cookie.
        memberId: SESSION_MEMBER_ID,
        marketId: String(b.marketId),
        selectedTeamId: String(b.selectedTeamId),
        stakeFaab: Number(b.stakeFaab),
      });
      return result.ok
        ? json({ wager: result.wager, book: book.book() })
        : json({ error: result.error }, 400);
    }
    const cancelMatch = pathname.match(/^\/api\/wagers\/([^/]+)\/cancel$/);
    if (cancelMatch && method === "POST") {
      const result = book.cancel(SESSION_MEMBER_ID, cancelMatch[1]);
      return result.ok ? json({ book: book.book() }) : json({ error: result.error }, 400);
    }
    if (pathname === "/api/commissioner/adjust-faab" && method === "POST") {
      const b = body();
      const result = book.adjustFaab(
        String(b.memberId),
        Number(b.amount),
        String(b.reason ?? "")
      );
      return result.ok ? json({ book: book.book() }) : json({ error: result.error }, 400);
    }
    if (pathname === "/api/commissioner/void" && method === "POST") {
      const b = body();
      const result = book.void(String(b.wagerId), String(b.reason ?? ""));
      return result.ok ? json({ book: book.book() }) : json({ error: result.error }, 400);
    }
    if (pathname === "/api/commissioner/settle" && method === "POST") {
      const b = body();
      const result = book.settle(SESSION_MEMBER_ID, Number(b.week));
      return json({ result, book: book.book() });
    }
    if (pathname === "/api/commissioner/market-status" && method === "POST") {
      const b = body();
      const result = book.setMarketStatus(String(b.matchupId), String(b.status) as MarketStatus);
      return result.ok ? json({ book: book.book() }) : json({ error: result.error }, 400);
    }
    return route.fulfill({ status: 500, body: `No stub for ${method} ${pathname}` });
  });
}

export const test = base.extend<{ book: StubBook }>({
  // Exposed so a spec can adjust the book before/while it drives the UI —
  // e.g. lock-timing.spec.ts moves a market's deadline around. Most specs
  // never touch it and just get the seeded state.
  book: async ({}, use) => {
    await use(new StubBook());
  },
  context: async ({ context, book }, use) => {
    await stubLeagueApis(context, book);
    await use(context);
  },
});

export { expect, type Page, StubBook };
