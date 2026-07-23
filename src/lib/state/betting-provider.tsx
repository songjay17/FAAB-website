"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { BettingMarket, FaabWallet, Wager } from "@/lib/types";
import { calculatePayout, calculateProfit } from "@/lib/odds";
import { currentMemberId } from "@/lib/mock-data/league";
import { mockMatchups } from "@/lib/mock-data/matchups";
import { mockWallets } from "@/lib/mock-data/wallets";
import { mockWagers } from "@/lib/mock-data/wagers";
import { settleWagersForWeek, type SettlementResult } from "./settlement";

const STORAGE_KEY = "jhulads:betting-state";

type BettingState = {
  wallet: FaabWallet;
  wagers: Wager[];
};

type BettingAction = { type: "HYDRATE"; payload: BettingState };

function seedState(): BettingState {
  return {
    wallet: mockWallets.find((w) => w.memberId === currentMemberId)!,
    wagers: mockWagers.filter((w) => w.memberId === currentMemberId),
  };
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
        const parsed = JSON.parse(raw) as BettingState;
        dispatch({ type: "HYDRATE", payload: parsed });
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

  function openWagerForMatchup(matchupId: string) {
    return state.wagers.find((w) => w.matchupId === matchupId && w.status === "open");
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
        wallet: {
          ...state.wallet,
          availableFaab: state.wallet.availableFaab - stakeFaab,
          reservedFaab: state.wallet.reservedFaab + stakeFaab,
        },
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
    const result = settleWagersForWeek({
      week,
      wallet: state.wallet,
      wagers: state.wagers,
      matchups: mockMatchups,
    });

    if (result.updatedWagers) {
      dispatch({
        type: "HYDRATE",
        payload: {
          wallet: result.updatedWallet,
          wagers: state.wagers.map(
            (w) => result.updatedWagers!.find((u) => u.id === w.id) ?? w
          ),
        },
      });
    }

    return result;
  }

  return (
    <BettingContext.Provider
      value={{
        wallet: state.wallet,
        wagers: state.wagers,
        openWagerForMatchup,
        placeWager,
        resetDemoData,
        settleWeek,
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
