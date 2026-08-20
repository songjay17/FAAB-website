import { and, asc, desc, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLog, books, markets, wagers, wallets } from "@/lib/db/schema";
import { SELF_CANCEL_WINDOW_MS, WAGER_REFERENCE_PREFIX } from "@/lib/betting-constants";
import { effectiveMarketStatus, hasRealLockTime, isPastLockTime } from "@/lib/market-lock";
import { calculatePayout, calculateProfit } from "@/lib/odds";
import type { LeagueData } from "@/lib/sleeper/load-league-data";
import { generateMarkets } from "@/lib/state/generate-markets";
import {
  reconcileWaiverSpend,
  settleWagersForWeek,
  voidWager as voidWagerPure,
  type SettlementResult,
} from "@/lib/state/settlement";
import type {
  BettingMarket,
  Book,
  FaabWallet,
  MarketStatus,
  Wager,
  WagerStatus,
} from "@/lib/types";

// The server side of the shared book. Every money path runs in one Postgres
// transaction with the touched wallet rows locked (select ... for update),
// so two simultaneous requests can't overdraw a wallet or double-settle a
// wager — the guarantee localStorage never gave. The actual betting math
// stays in the same pure functions the client used (settlement.ts,
// generate-markets.ts); this module is persistence and locking around them.

type WalletRow = typeof wallets.$inferSelect;
type MarketRow = typeof markets.$inferSelect;
type WagerRow = typeof wagers.$inferSelect;

const round2 = (n: number) => Math.round(n * 100) / 100;

function toWallet(row: WalletRow): FaabWallet {
  return {
    memberId: row.memberId,
    totalBudget: row.totalBudget,
    availableFaab: row.availableFaab,
    reservedFaab: row.reservedFaab,
    weeklyProfitLoss: row.weeklyProfitLoss,
    seasonProfitLoss: row.seasonProfitLoss,
    sleeperWaiverSpend: row.sleeperWaiverSpend,
  };
}

function toMarket(row: MarketRow): BettingMarket {
  const lockAt = row.lockAt?.toISOString();
  return {
    id: row.id,
    matchupId: row.matchupId,
    // The clock is applied as the book is served, so a market past its
    // deadline reads as locked everywhere without waiting for a write (see
    // lockExpiredMarkets, which persists the same transition).
    status: effectiveMarketStatus(row.status as MarketStatus, lockAt),
    odds: {
      homeMoneyline: row.homeMoneyline,
      awayMoneyline: row.awayMoneyline,
      updatedAt: row.oddsUpdatedAt.toISOString(),
    },
    totalFaabHome: row.totalFaabHome,
    totalFaabAway: row.totalFaabAway,
    lockAt: hasRealLockTime(lockAt) ? lockAt : undefined,
  };
}

function toWager(row: WagerRow): Wager {
  return {
    id: row.id,
    reference: row.reference,
    memberId: row.memberId,
    marketId: row.marketId,
    matchupId: row.matchupId,
    week: row.week,
    selectedTeamId: row.selectedTeamId,
    opponentTeamId: row.opponentTeamId,
    moneylineAtBet: row.moneylineAtBet,
    stakeFaab: row.stakeFaab,
    potentialProfit: row.potentialProfit,
    potentialPayout: row.potentialPayout,
    finalPayout: row.finalPayout ?? undefined,
    status: row.status as WagerStatus,
    placedAt: row.placedAt.toISOString(),
    settledAt: row.settledAt?.toISOString(),
  };
}

function walletPatch(wallet: FaabWallet) {
  return {
    availableFaab: wallet.availableFaab,
    reservedFaab: wallet.reservedFaab,
    weeklyProfitLoss: wallet.weeklyProfitLoss,
    seasonProfitLoss: wallet.seasonProfitLoss,
    sleeperWaiverSpend: wallet.sleeperWaiverSpend,
  };
}

export type BookActionError = { ok: false; error: string };

/**
 * Idempotent bootstrap + upkeep, run on every book read: creates the book
 * row and full-budget wallets on first sight of a league, prices markets for
 * any matchup that doesn't have one yet (the league-wide odds snapshot —
 * a line is priced once, here, and never recomputed), enforces the
 * season-phase lock, and reconciles wallets against real Sleeper waiver
 * spend. Everything is insert-if-absent or a no-op re-run, so concurrent
 * first loads are safe.
 */
export async function syncBook(data: LeagueData): Promise<void> {
  const db = getDb();
  const leagueId = data.league.id;
  const bettingOpen = data.league.seasonPhase === "in_season";
  const allMatchups = Array.from(data.matchupsByWeek.values()).flat();

  await db.transaction(async (tx) => {
    await tx
      .insert(books)
      .values({ leagueId, season: data.league.season })
      .onConflictDoNothing();

    if (data.members.length > 0) {
      await tx
        .insert(wallets)
        .values(
          data.members.map((member) => ({
            leagueId,
            memberId: member.id,
            totalBudget: data.league.waiverBudget,
            availableFaab: data.league.waiverBudget,
            reservedFaab: 0,
            weeklyProfitLoss: 0,
            seasonProfitLoss: 0,
            sleeperWaiverSpend: 0,
          }))
        )
        .onConflictDoNothing();
    }

    const priced = await tx
      .select({ matchupId: markets.matchupId })
      .from(markets)
      .where(eq(markets.leagueId, leagueId));
    const pricedSet = new Set(priced.map((p) => p.matchupId));
    const newMatchups = allMatchups.filter((m) => !pricedSet.has(m.id));
    if (newMatchups.length > 0) {
      const matchupById = new Map(newMatchups.map((m) => [m.id, m]));
      await tx
        .insert(markets)
        .values(
          generateMarkets(newMatchups, data.playersByTeam).map((market) => {
            const matchup = matchupById.get(market.matchupId)!;
            return {
              leagueId,
              id: market.id,
              matchupId: market.matchupId,
              week: matchup.week,
              homeTeamId: matchup.homeTeamId,
              awayTeamId: matchup.awayTeamId,
              status: bettingOpen ? market.status : "locked",
              homeMoneyline: market.odds.homeMoneyline,
              awayMoneyline: market.odds.awayMoneyline,
              totalFaabHome: market.totalFaabHome,
              totalFaabAway: market.totalFaabAway,
              oddsUpdatedAt: new Date(market.odds.updatedAt),
              lockAt: hasRealLockTime(matchup.lockAt) ? new Date(matchup.lockAt) : null,
            };
          })
        )
        .onConflictDoNothing();
    }

    if (!bettingOpen) {
      await tx
        .update(markets)
        .set({ status: "locked" })
        .where(and(eq(markets.leagueId, leagueId), eq(markets.status, "open")));
    }

    // Backfill deadlines onto markets priced before lock times existed (and
    // onto any priced while the schedule lookup was failing), so the clock
    // applies to them too rather than only to newly-priced markets.
    const missingLockAt = await tx
      .select({ id: markets.id, matchupId: markets.matchupId })
      .from(markets)
      .where(and(eq(markets.leagueId, leagueId), isNull(markets.lockAt)));
    if (missingLockAt.length > 0) {
      const lockAtByMatchupId = new Map(
        allMatchups
          .filter((m) => hasRealLockTime(m.lockAt))
          .map((m) => [m.id, new Date(m.lockAt)])
      );
      for (const row of missingLockAt) {
        const lockAt = lockAtByMatchupId.get(row.matchupId);
        if (!lockAt) continue;
        await tx
          .update(markets)
          .set({ lockAt })
          .where(and(eq(markets.leagueId, leagueId), eq(markets.id, row.id)));
      }
    }

    // Persist the clock-driven transition so the stored status matches what
    // readers already see (toMarket applies the same rule). Doing it here
    // rather than on a cron keeps it dependency-free: the book is synced on
    // every read, which for a weekly-cadence league is often enough.
    await tx
      .update(markets)
      .set({ status: "locked" })
      .where(
        and(
          eq(markets.leagueId, leagueId),
          eq(markets.status, "open"),
          isNotNull(markets.lockAt),
          lte(markets.lockAt, new Date())
        )
      );

    const walletRows = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.leagueId, leagueId))
      .orderBy(asc(wallets.memberId))
      .for("update");
    for (const row of walletRows) {
      const spend = data.waiverSpendByMemberId[row.memberId];
      if (spend === undefined) continue;
      const reconciled = reconcileWaiverSpend(toWallet(row), spend);
      if (reconciled.sleeperWaiverSpend !== row.sleeperWaiverSpend) {
        await tx
          .update(wallets)
          .set(walletPatch(reconciled))
          .where(and(eq(wallets.leagueId, leagueId), eq(wallets.memberId, row.memberId)));
      }
    }
  });
}

export async function readBook(leagueId: string): Promise<Book> {
  const db = getDb();
  const [walletRows, wagerRows, marketRows] = await Promise.all([
    db.select().from(wallets).where(eq(wallets.leagueId, leagueId)).orderBy(asc(wallets.memberId)),
    db.select().from(wagers).where(eq(wagers.leagueId, leagueId)).orderBy(desc(wagers.placedAt)),
    db
      .select()
      .from(markets)
      .where(eq(markets.leagueId, leagueId))
      .orderBy(asc(markets.week), asc(markets.id)),
  ]);
  return {
    leagueId,
    wallets: walletRows.map(toWallet),
    wagers: wagerRows.map(toWager),
    markets: marketRows.map(toMarket),
  };
}

export async function placeWager(input: {
  leagueId: string;
  memberId: string;
  marketId: string;
  selectedTeamId: string;
  stakeFaab: number;
}): Promise<{ ok: true; wager: Wager } | BookActionError> {
  const db = getDb();
  const { leagueId, memberId, marketId, selectedTeamId } = input;
  const stake = round2(input.stakeFaab);

  return db.transaction(async (tx) => {
    if (!Number.isFinite(stake) || stake <= 0) {
      return { ok: false as const, error: "Stake must be a positive FAAB amount." };
    }

    const [marketRow] = await tx
      .select()
      .from(markets)
      .where(and(eq(markets.leagueId, leagueId), eq(markets.id, marketId)))
      .for("update");
    if (!marketRow) {
      return { ok: false as const, error: "Market not found." };
    }
    if (marketRow.status !== "open") {
      return { ok: false as const, error: "This market is no longer accepting bets." };
    }
    // Checked inside the transaction against the row's own deadline, so a
    // page that loaded while the market was open can't sneak a bet in after
    // kickoff — the client's view of `status` is never trusted here.
    if (isPastLockTime(marketRow.lockAt?.toISOString())) {
      return {
        ok: false as const,
        error: "Betting for this matchup closed when the week's games kicked off.",
      };
    }
    if (selectedTeamId !== marketRow.homeTeamId && selectedTeamId !== marketRow.awayTeamId) {
      return { ok: false as const, error: "Selected team is not part of this matchup." };
    }

    const [walletRow] = await tx
      .select()
      .from(wallets)
      .where(and(eq(wallets.leagueId, leagueId), eq(wallets.memberId, memberId)))
      .for("update");
    if (!walletRow) {
      return { ok: false as const, error: "Member wallet not found." };
    }
    if (stake > walletRow.availableFaab) {
      return { ok: false as const, error: "Stake exceeds available FAAB." };
    }

    // The line comes from the stored market, never from the client — the
    // snapshot the whole league sees is the one every bet is priced at.
    const isHome = selectedTeamId === marketRow.homeTeamId;
    const moneyline = isHome ? marketRow.homeMoneyline : marketRow.awayMoneyline;
    const opponentTeamId = isHome ? marketRow.awayTeamId : marketRow.homeTeamId;

    const refRows = (await tx.execute(
      sql`select nextval('wager_reference_seq') as n`
    )) as unknown as Array<{ n: string | number }>;
    const reference = `${WAGER_REFERENCE_PREFIX}${Number(refRows[0].n)}`;

    const [wagerRow] = await tx
      .insert(wagers)
      .values({
        leagueId,
        reference,
        memberId,
        marketId: marketRow.id,
        matchupId: marketRow.matchupId,
        week: marketRow.week,
        selectedTeamId,
        opponentTeamId,
        moneylineAtBet: moneyline,
        stakeFaab: stake,
        potentialProfit: round2(calculateProfit(stake, moneyline)),
        potentialPayout: round2(calculatePayout(stake, moneyline)),
        status: "open",
        placedAt: new Date(),
      })
      .returning();

    await tx
      .update(wallets)
      .set({
        availableFaab: round2(walletRow.availableFaab - stake),
        reservedFaab: round2(walletRow.reservedFaab + stake),
      })
      .where(and(eq(wallets.leagueId, leagueId), eq(wallets.memberId, memberId)));

    return { ok: true as const, wager: toWager(wagerRow) };
  });
}

export async function cancelWager(input: {
  leagueId: string;
  memberId: string;
  wagerId: string;
}): Promise<{ ok: true } | BookActionError> {
  const db = getDb();
  const { leagueId, memberId, wagerId } = input;

  return db.transaction(async (tx) => {
    const [wagerRow] = await tx
      .select()
      .from(wagers)
      .where(and(eq(wagers.leagueId, leagueId), eq(wagers.id, wagerId)))
      .for("update");
    if (!wagerRow || wagerRow.memberId !== memberId) {
      return { ok: false as const, error: "Wager not found." };
    }
    if (wagerRow.status !== "open") {
      return { ok: false as const, error: "Only open wagers can be cancelled." };
    }
    if (Date.now() - wagerRow.placedAt.getTime() > SELF_CANCEL_WINDOW_MS) {
      return {
        ok: false as const,
        error: "The self-cancel window has passed — ask the commissioner to void it instead.",
      };
    }

    const [walletRow] = await tx
      .select()
      .from(wallets)
      .where(and(eq(wallets.leagueId, leagueId), eq(wallets.memberId, memberId)))
      .for("update");
    if (!walletRow) {
      return { ok: false as const, error: "Member wallet not found." };
    }

    const { updatedWallet, updatedWager } = voidWagerPure(toWallet(walletRow), toWager(wagerRow));
    await persistVoid(tx, leagueId, updatedWallet, updatedWager);
    return { ok: true as const };
  });
}

export async function voidWagerAdmin(input: {
  leagueId: string;
  actorMemberId: string;
  wagerId: string;
  reason: string;
}): Promise<{ ok: true } | BookActionError> {
  const db = getDb();
  const { leagueId, actorMemberId, wagerId } = input;
  const reason = input.reason.trim();

  return db.transaction(async (tx) => {
    if (!reason) {
      return { ok: false as const, error: "A reason is required." };
    }
    const [wagerRow] = await tx
      .select()
      .from(wagers)
      .where(and(eq(wagers.leagueId, leagueId), eq(wagers.id, wagerId)))
      .for("update");
    if (!wagerRow) {
      return { ok: false as const, error: "Wager not found." };
    }
    if (wagerRow.status !== "open") {
      return { ok: false as const, error: "Only open wagers can be voided." };
    }

    const [walletRow] = await tx
      .select()
      .from(wallets)
      .where(and(eq(wallets.leagueId, leagueId), eq(wallets.memberId, wagerRow.memberId)))
      .for("update");
    if (!walletRow) {
      return { ok: false as const, error: "Member wallet not found." };
    }

    const { updatedWallet, updatedWager } = voidWagerPure(toWallet(walletRow), toWager(wagerRow));
    await persistVoid(tx, leagueId, updatedWallet, updatedWager);
    await tx.insert(auditLog).values({
      leagueId,
      actorMemberId,
      action: "void-wager",
      subjectId: wagerRow.reference,
      reason,
    });
    return { ok: true as const };
  });
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function persistVoid(tx: Tx, leagueId: string, wallet: FaabWallet, wager: Wager) {
  await tx
    .update(wallets)
    .set(walletPatch(wallet))
    .where(and(eq(wallets.leagueId, leagueId), eq(wallets.memberId, wallet.memberId)));
  await tx
    .update(wagers)
    .set({
      status: wager.status,
      finalPayout: wager.finalPayout ?? null,
      settledAt: wager.settledAt ? new Date(wager.settledAt) : null,
    })
    .where(and(eq(wagers.leagueId, leagueId), eq(wagers.id, wager.id)));
}

/**
 * League-wide weekly settlement — resolves every member's open wagers for
 * the week against final matchup scores, all inside one transaction with
 * every wallet locked up front (in member-id order, so concurrent settles
 * can't deadlock; the second one finds no open wagers left and no-ops).
 */
export async function settleWeek(input: {
  data: LeagueData;
  actorMemberId: string;
  week: number;
}): Promise<SettlementResult> {
  const db = getDb();
  const { data, actorMemberId, week } = input;
  const leagueId = data.league.id;
  const allMatchups = Array.from(data.matchupsByWeek.values()).flat();

  return db.transaction(async (tx) => {
    const walletRows = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.leagueId, leagueId))
      .orderBy(asc(wallets.memberId))
      .for("update");
    const wagerRows = await tx.select().from(wagers).where(eq(wagers.leagueId, leagueId));
    const allWagers = wagerRows.map(toWager);

    const aggregate: SettlementResult = {
      week,
      processed: 0,
      won: 0,
      lost: 0,
      refunded: 0,
      totalPaidOut: 0,
      skipped: [],
      updatedWallet: toWallet(
        walletRows.find((w) => w.memberId === actorMemberId) ?? walletRows[0]
      ),
      updatedWagers: null,
    };

    let anySettled = false;
    for (const walletRow of walletRows) {
      const memberWallet = toWallet(walletRow);
      const result = settleWagersForWeek({
        week,
        wallet: memberWallet,
        wagers: allWagers.filter((w) => w.memberId === walletRow.memberId),
        matchups: allMatchups,
      });

      aggregate.processed += result.processed;
      aggregate.won += result.won;
      aggregate.lost += result.lost;
      aggregate.refunded += result.refunded;
      aggregate.totalPaidOut = round2(aggregate.totalPaidOut + result.totalPaidOut);
      aggregate.skipped.push(...result.skipped);

      if (result.updatedWagers) {
        anySettled = true;
        await tx
          .update(wallets)
          .set(walletPatch(result.updatedWallet))
          .where(and(eq(wallets.leagueId, leagueId), eq(wallets.memberId, walletRow.memberId)));
        for (const settled of result.updatedWagers) {
          await tx
            .update(wagers)
            .set({
              status: settled.status,
              finalPayout: settled.finalPayout ?? null,
              settledAt: settled.settledAt ? new Date(settled.settledAt) : null,
            })
            .where(and(eq(wagers.leagueId, leagueId), eq(wagers.id, settled.id)));
        }
        if (walletRow.memberId === actorMemberId) {
          aggregate.updatedWallet = result.updatedWallet;
        }
      }
    }

    if (anySettled) {
      await tx.insert(auditLog).values({
        leagueId,
        actorMemberId,
        action: "settle-week",
        subjectId: `week-${week}`,
        reason: null,
      });
    }

    return aggregate;
  });
}

export async function setMarketStatus(input: {
  leagueId: string;
  actorMemberId: string;
  matchupId: string;
  status: MarketStatus;
}): Promise<{ ok: true } | BookActionError> {
  const db = getDb();
  const { leagueId, actorMemberId, matchupId, status } = input;
  if (status !== "open" && status !== "locked") {
    return { ok: false, error: "Market status can only be set to open or locked." };
  }

  const [existing] = await db
    .select({ lockAt: markets.lockAt })
    .from(markets)
    .where(and(eq(markets.leagueId, leagueId), eq(markets.matchupId, matchupId)));
  if (!existing) {
    return { ok: false, error: "Market not found." };
  }
  // Reopening a market whose kickoff has passed would be undone on the next
  // read anyway; refusing it outright is clearer than a toggle that appears
  // to work and silently reverts.
  if (status === "open" && isPastLockTime(existing.lockAt?.toISOString())) {
    return {
      ok: false,
      error: "This matchup's games have already kicked off — its market can't be reopened.",
    };
  }

  await db
    .update(markets)
    .set({ status })
    .where(and(eq(markets.leagueId, leagueId), eq(markets.matchupId, matchupId)));

  await getDb().insert(auditLog).values({
    leagueId,
    actorMemberId,
    action: `market-${status}`,
    subjectId: matchupId,
    reason: null,
  });
  return { ok: true };
}

/**
 * Demo/commissioner utility mirroring the old "Reset demo data" button:
 * wipes the league's book and reseeds it clean. Audit history is deliberately
 * kept.
 */
export async function resetBook(data: LeagueData, actorMemberId: string): Promise<void> {
  const db = getDb();
  const leagueId = data.league.id;
  await db.transaction(async (tx) => {
    await tx.delete(wagers).where(eq(wagers.leagueId, leagueId));
    await tx.delete(markets).where(eq(markets.leagueId, leagueId));
    await tx.delete(wallets).where(eq(wallets.leagueId, leagueId));
    await tx.delete(books).where(eq(books.leagueId, leagueId));
    await tx.insert(auditLog).values({
      leagueId,
      actorMemberId,
      action: "reset-book",
      subjectId: null,
      reason: null,
    });
  });
  await syncBook(data);
}
