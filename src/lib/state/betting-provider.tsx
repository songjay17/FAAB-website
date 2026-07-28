"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { BettingMarket, FaabWallet, MarketStatus, Wager } from "@/lib/types";
import { calculatePayout, calculateProfit } from "@/lib/odds";
import { currentMemberId } from "@/lib/mock-data/league";
import { mockMatchups } from "@/lib/mock-data/matchups";
import { mockMarkets } from "@/lib/mock-data/markets";
import { mockWallets } from "@/lib/mock-data/wallets";
import { mockWagers } from "@/lib/mock-data/wagers";
import { settleWagersForWeek, voidWager as voidWagerPure, type SettlementResult } from "./settlement";

const STORAGE_KEY = "jhulads:betting-state";

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

function seedState(): BettingState {
  return {
    wallets: mockWallets,
    wagers: mockWagers,
    markets: mockMarkets,
  };
}

/** Guards against a pre-existing localStorage entry saved by an older shape of this state. */
function isValidBettingState(value: unknown): value is BettingState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<BettingState>;
  return (
    Array.isArray(candidate.wallets) &&
    Array.isArray(candidate.wagers) &&
    Array.isArray(candidate.markets) &&
    candidate.wallets.some((w) => w.memberId === currentMemberId)
  );
}

let wagerCounter = 1000;
function nextWagerReference() {
  wagerCounter += 1;
  return `JHL-${wagerCounter}`;
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
  /** Lets the signed-in member cancel their own open wager for a full refund, before its matchup locks. */
  cancelWager: (wagerId: string) => { ok: true } | { ok: false; error: string };
  /** Commissioner override: manually open/lock a matchup's market, independent of settlement. */
  setMarketStatus: (matchupId: string, status: MarketStatus) => void;
};

const BettingContext = createContext<BettingContextValue | null>(null);

export function BettingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bettingReducer, undefined, seedState);
  const hydrated = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isValidBettingState(parsed)) {
          dispatch({ type: "HYDRATE", payload: parsed });
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // Ignore corrupt/unavailable storage (e.g. private browsing) and keep seed state.
    } finally {
      hydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated.current) return;
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
      reference: nextWagerReference(),
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
    dispatch({ type: "HYDRATE", payload: seedState() });
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
        matchups: mockMatchups,
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
    const market = state.markets.find((m) => m.matchupId === wager.matchupId);
    if (market && market.status !== "open") {
      return { ok: false, error: "This matchup has already locked — ask the commissioner to void it instead." };
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
