"use client";

import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import type { BettingMarket, FaabWallet, FantasyPlayer, MarketStatus, Wager, WeeklyMatchup } from "@/lib/types";
import { calculatePayout, calculateProfit } from "@/lib/odds";
import { DEMO_CURRENT_USER_ID as currentMemberId } from "@/lib/sleeper/config";
import { mockWallets } from "@/lib/mock-data/wallets";
import { mockWagers } from "@/lib/mock-data/wagers";
import { useSleeperData } from "./sleeper-data-provider";
import { generateMarkets } from "./generate-markets";
import {
  reconcileWaiverSpend,
  settleWagersForWeek,
  voidWager as voidWagerPure,
  type SettlementResult,
} from "./settlement";

const STORAGE_KEY = "jhulads:betting-state";

// How long a member can self-cancel a just-placed bet for a full refund —
// misclick protection, not a way to back out once the market's moved.
// Real sportsbooks don't let you unwind a bet just because you regret it or
// news breaks (e.g. a player gets hurt) — that risk is exactly what the odds
// already price in. Once this window passes, only a commissioner void can
// undo a wager.
export const SELF_CANCEL_WINDOW_MS = 5 * 60 * 1000;

// Holds every member's wallet and wager history, not just the signed-in
// member's — the leaderboard needs the whole league to rank members against
// each other. `wallet`/`wagers` on the context stay scoped to the current
// member (see below) so every existing consumer is unaffected. `markets`
// lives here too (rather than staying static mock data) so a commissioner
// can lock/unlock a market and have every page that gates on
// `market.status` reflect it immediately.
type BettingState = {
  wallets: FaabWallet[];
  wagers: Wager[];
  markets: BettingMarket[];
};

type BettingAction = { type: "HYDRATE"; payload: BettingState };

/**
 * Outside a live season there is nothing to bet on — every market is forced
 * locked, both freshly generated ones and any left open in a persisted
 * session from before the season ended. Applied on every seed/hydrate; a
 * commissioner can still manually unlock afterward via setMarketStatus.
 */
function lockMarketsWhenClosed(markets: BettingMarket[], bettingOpen: boolean): BettingMarket[] {
  if (bettingOpen) return markets;
  return markets.map((m) => (m.status === "open" ? { ...m, status: "locked" } : m));
}

function seedState(
  allMatchups: WeeklyMatchup[],
  playersByTeam: Record<string, FantasyPlayer[]>,
  waiverSpendByMemberId: Record<string, number>,
  bettingOpen: boolean
): BettingState {
  return {
    wallets: reconcileWallets(mockWallets, waiverSpendByMemberId),
    wagers: mockWagers,
    markets: lockMarketsWhenClosed(generateMarkets(allMatchups, playersByTeam), bettingOpen),
  };
}

/**
 * Applies reconcileWaiverSpend to every wallet against real current Sleeper
 * spend. Runs once per app load (see initState) rather than on a poll/
 * websocket — a waiver claim made mid-session won't be picked up until the
 * next full reload. Acceptable for a league where claims process on a
 * weekly waiver schedule, not something happening every minute.
 */
function reconcileWallets(
  wallets: FaabWallet[],
  waiverSpendByMemberId: Record<string, number>
): FaabWallet[] {
  return wallets.map((wallet) => {
    const currentSpend = waiverSpendByMemberId[wallet.memberId];
    return currentSpend === undefined ? wallet : reconcileWaiverSpend(wallet, currentSpend);
  });
}

/** Guards against a pre-existing localStorage entry saved by an older shape of this state. */
function isValidBettingState(value: unknown): value is BettingState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BettingState>;
  return (
    Array.isArray(candidate.wallets) &&
    Array.isArray(candidate.wagers) &&
    Array.isArray(candidate.markets) &&
    candidate.wallets.some((w) => w.memberId === currentMemberId) &&
    candidate.wallets.every((w) => typeof w.sleeperWaiverSpend === "number")
  );
}

/**
 * Reads any persisted state synchronously in the reducer's lazy initializer
 * rather than via a post-mount effect + ref-guard. That older pattern raced
 * with React Strict Mode's dev-only double-invocation of effects: the
 * hydration ref survives Strict Mode's throwaway first mount, so on the
 * second (real) mount the write-effect's "already hydrated" guard was
 * already true and could flush fresh seed state to storage before that
 * mount's own hydration dispatch had propagated — silently discarding a
 * just-placed bet on navigation. Reading synchronously here means there's
 * only ever one state value for the whole first render, no race possible.
 */
function initState(
  allMatchups: WeeklyMatchup[],
  playersByTeam: Record<string, FantasyPlayer[]>,
  waiverSpendByMemberId: Record<string, number>,
  bettingOpen: boolean
): BettingState {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isValidBettingState(parsed)) {
          // A previous session's persisted wallets may be stale relative to
          // real Sleeper waiver spend that happened since the last visit —
          // reconcile every time state is loaded from storage, not just on
          // first-ever seed.
          return {
            ...parsed,
            wallets: reconcileWallets(parsed.wallets, waiverSpendByMemberId),
            markets: lockMarketsWhenClosed(parsed.markets, bettingOpen),
          };
        }
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore corrupt/unavailable storage (e.g. private browsing) and fall through to seed state.
    }
  }
  return seedState(allMatchups, playersByTeam, waiverSpendByMemberId, bettingOpen);
}

const WAGER_REFERENCE_PREFIX = "JHL-";
const WAGER_REFERENCE_START = 1000;

/**
 * Derived from persisted wagers rather than a module-level counter — a
 * counter reset to its initial value on every page load and could reissue a
 * reference already taken by a wager sitting in localStorage from an earlier
 * session.
 */
function nextWagerReference(existingWagers: Wager[]) {
  const highest = existingWagers.reduce((max, w) => {
    if (!w.reference.startsWith(WAGER_REFERENCE_PREFIX)) return max;
    const n = Number(w.reference.slice(WAGER_REFERENCE_PREFIX.length));
    return Number.isFinite(n) && n > max ? n : max;
  }, WAGER_REFERENCE_START);
  return `${WAGER_REFERENCE_PREFIX}${highest + 1}`;
}

function bettingReducer(state: BettingState, action: BettingAction): BettingState {
  switch (action.type) {
    case "HYDRATE":
      return action.payload;
    default:
      return state;
  }
}

type BettingContextValue = {
  wallet: FaabWallet;
  wagers: Wager[];
  allWallets: FaabWallet[];
  allWagers: Wager[];
  allMarkets: BettingMarket[];
  openWagerForMatchup: (matchupId: string) => Wager | undefined;
  placeWager: (
    market: BettingMarket,
    selectedTeamId: string,
    opponentTeamId: string,
    week: number,
    moneyline: number,
    stakeFaab: number
  ) => Wager;
  resetDemoData: () => void;
  settleWeek: (week: number) => SettlementResult;
  /** Manually refunds a single open wager league-wide, independent of weekly settlement. */
  voidWager: (wagerId: string, reason: string) => { ok: true } | { ok: false; error: string };
  /** Lets the signed-in member cancel their own wager for a full refund within a short grace window after placing it (misclick protection only). */
  cancelWager: (wagerId: string) => { ok: true } | { ok: false; error: string };
  /** Commissioner override: manually open/lock a matchup's market, independent of settlement. */
  setMarketStatus: (matchupId: string, status: MarketStatus) => void;
};

const BettingContext = createContext<BettingContextValue | null>(null);

export function BettingProvider({ children }: { children: ReactNode }) {
  const { league, matchupsByWeek, playersByTeam, waiverSpendByMemberId } = useSleeperData();
  const allMatchups = Array.from(matchupsByWeek.values()).flat();
  const bettingOpen = league.seasonPhase === "in_season";
  const [state, dispatch] = useReducer(
    bettingReducer,
    undefined,
    () => initState(allMatchups, playersByTeam, waiverSpendByMemberId, bettingOpen)
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage write failures.
    }
  }, [state]);

  const wallet = state.wallets.find((w) => w.memberId === currentMemberId)!;
  const wagers = state.wagers.filter((w) => w.memberId === currentMemberId);

  function openWagerForMatchup(matchupId: string) {
    return wagers.find((w) => w.matchupId === matchupId && w.status === "open");
  }

  function placeWager(
    market: BettingMarket,
    selectedTeamId: string,
    opponentTeamId: string,
    week: number,
    moneyline: number,
    stakeFaab: number
  ): Wager {
    const profit = Math.round(calculateProfit(stakeFaab, moneyline) * 100) / 100;
    const payout = Math.round(calculatePayout(stakeFaab, moneyline) * 100) / 100;
    const newWager: Wager = {
      id: `wager-${Date.now()}`,
      reference: nextWagerReference(state.wagers),
      memberId: currentMemberId,
      marketId: market.id,
      matchupId: market.matchupId,
      week,
      selectedTeamId,
      opponentTeamId,
      moneylineAtBet: moneyline,
      stakeFaab,
      potentialProfit: profit,
      potentialPayout: payout,
      status: "open",
      placedAt: new Date().toISOString(),
    };

    dispatch({
      type: "HYDRATE",
      payload: {
        ...state,
        wallets: state.wallets.map((w) =>
          w.memberId === currentMemberId
            ? {
                ...w,
                availableFaab: w.availableFaab - stakeFaab,
                reservedFaab: w.reservedFaab + stakeFaab,
              }
            : w
        ),
        wagers: [newWager, ...state.wagers],
      },
    });

    return newWager;
  }

  function resetDemoData() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    dispatch({
      type: "HYDRATE",
      payload: seedState(allMatchups, playersByTeam, waiverSpendByMemberId, bettingOpen),
    });
  }

  function settleWeek(week: number): SettlementResult {
    // Settlement is a league-wide commissioner action: it resolves every
    // member's open wagers for the week, not just the signed-in member's.
    // The returned summary aggregates across all members; per-member wallet
    // updates are applied directly to state rather than surfaced here.
    let combinedWallets = state.wallets;
    let combinedWagers = state.wagers;
    let anyUpdated = false;

    const aggregate: SettlementResult = {
      week,
      processed: 0,
      won: 0,
      lost: 0,
      refunded: 0,
      totalPaidOut: 0,
      skipped: [],
      updatedWallet: wallet,
      updatedWagers: null,
    };

    for (const memberWallet of state.wallets) {
      const memberWagers = combinedWagers.filter((w) => w.memberId === memberWallet.memberId);
      const result = settleWagersForWeek({
        week,
        wallet: memberWallet,
        wagers: memberWagers,
        matchups: allMatchups,
      });

      aggregate.processed += result.processed;
      aggregate.won += result.won;
      aggregate.lost += result.lost;
      aggregate.refunded += result.refunded;
      aggregate.totalPaidOut = Math.round((aggregate.totalPaidOut + result.totalPaidOut) * 100) / 100;
      aggregate.skipped.push(...result.skipped);

      if (result.updatedWagers) {
        anyUpdated = true;
        combinedWallets = combinedWallets.map((w) =>
          w.memberId === memberWallet.memberId ? result.updatedWallet : w
        );
        combinedWagers = combinedWagers.map(
          (w) => result.updatedWagers!.find((u) => u.id === w.id) ?? w
        );
        if (memberWallet.memberId === currentMemberId) {
          aggregate.updatedWallet = result.updatedWallet;
        }
      }
    }

    if (anyUpdated) {
      dispatch({
        type: "HYDRATE",
        payload: { ...state, wallets: combinedWallets, wagers: combinedWagers },
      });
    }

    return aggregate;
  }

  function voidWager(wagerId: string, reason: string): { ok: true } | { ok: false; error: string } {
    const wager = state.wagers.find((w) => w.id === wagerId);
    if (!wager) {
      return { ok: false, error: "Wager not found." };
    }
    if (wager.status !== "open") {
      return { ok: false, error: "Only open wagers can be voided." };
    }
    if (!reason.trim()) {
      return { ok: false, error: "A reason is required." };
    }

    const memberWallet = state.wallets.find((w) => w.memberId === wager.memberId);
    if (!memberWallet) {
      return { ok: false, error: "Member wallet not found." };
    }

    const { updatedWallet, updatedWager } = voidWagerPure(memberWallet, wager);

    dispatch({
      type: "HYDRATE",
      payload: {
        ...state,
        wallets: state.wallets.map((w) => (w.memberId === wager.memberId ? updatedWallet : w)),
        wagers: state.wagers.map((w) => (w.id === wagerId ? updatedWager : w)),
      },
    });

    return { ok: true };
  }

  function cancelWager(wagerId: string): { ok: true } | { ok: false; error: string } {
    const wager = state.wagers.find((w) => w.id === wagerId);
    if (!wager || wager.memberId !== currentMemberId) {
      return { ok: false, error: "Wager not found." };
    }
    if (wager.status !== "open") {
      return { ok: false, error: "Only open wagers can be cancelled." };
    }
    const placedAgoMs = Date.now() - new Date(wager.placedAt).getTime();
    if (placedAgoMs > SELF_CANCEL_WINDOW_MS) {
      return {
        ok: false,
        error: "The self-cancel window has passed — ask the commissioner to void it instead.",
      };
    }

    const { updatedWallet, updatedWager } = voidWagerPure(wallet, wager);

    dispatch({
      type: "HYDRATE",
      payload: {
        ...state,
        wallets: state.wallets.map((w) => (w.memberId === currentMemberId ? updatedWallet : w)),
        wagers: state.wagers.map((w) => (w.id === wagerId ? updatedWager : w)),
      },
    });

    return { ok: true };
  }

  function setMarketStatus(matchupId: string, status: MarketStatus) {
    dispatch({
      type: "HYDRATE",
      payload: {
        ...state,
        markets: state.markets.map((m) => (m.matchupId === matchupId ? { ...m, status } : m)),
      },
    });
  }

  return (
    <BettingContext.Provider
      value={{
        wallet,
        wagers,
        allWallets: state.wallets,
        allWagers: state.wagers,
        allMarkets: state.markets,
        openWagerForMatchup,
        placeWager,
        resetDemoData,
        settleWeek,
        voidWager,
        cancelWager,
        setMarketStatus,
      }}
    >
      {children}
    </BettingContext.Provider>
  );
}

export function useBetting() {
  const ctx = useContext(BettingContext);
  if (!ctx) {
    throw new Error("useBetting must be used within a BettingProvider");
  }
  return ctx;
}
