"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { BettingMarket, Book, FaabWallet, MarketStatus, Wager } from "@/lib/types";
import { DEMO_CURRENT_USER_ID as currentMemberId } from "@/lib/sleeper/config";
import type { SettlementResult } from "./settlement";

// The betting book lives on the server now (see src/lib/server/book.ts) —
// one shared, transactional truth for the whole league instead of a
// per-browser localStorage seed. This provider is a thin client for it:
// fetch the book on mount and window focus, send mutations, and hydrate
// from the book every response carries back. Refetch-on-focus (not
// realtime) is a deliberate choice for weekly-cadence betting — see
// docs/shared-persistence-plan.md.

type BookState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; book: Book };

type ActionResult = { ok: true } | { ok: false; error: string };
type PlaceWagerResult = { ok: true; wager: Wager } | { ok: false; error: string };

async function requestJson(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; body: Record<string, unknown> }> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, body };
}

function errorMessage(body: Record<string, unknown>): string {
  return typeof body.error === "string" ? body.error : "Request failed.";
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
    stakeFaab: number
  ) => Promise<PlaceWagerResult>;
  resetDemoData: () => Promise<void>;
  settleWeek: (week: number) => Promise<SettlementResult>;
  /** Manually refunds a single open wager league-wide, independent of weekly settlement. */
  voidWager: (wagerId: string, reason: string) => Promise<ActionResult>;
  /** Lets the signed-in member cancel their own wager for a full refund within a short grace window after placing it (misclick protection only). */
  cancelWager: (wagerId: string) => Promise<ActionResult>;
  /** Commissioner override: manually open/lock a matchup's market, independent of settlement. */
  setMarketStatus: (matchupId: string, status: MarketStatus) => Promise<void>;
};

const BettingContext = createContext<BettingContextValue | null>(null);

export function BettingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookState>({ status: "loading" });
  // Focus refetches must not clobber the book a concurrent mutation just
  // returned — while any mutation is in flight, background refreshes are
  // dropped (the mutation response is always the newer state).
  const pendingMutations = useRef(0);

  const applyBook = useCallback((book: Book) => {
    setState({ status: "ready", book });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      requestJson("/api/book").then(({ ok, body }) => {
        if (cancelled || pendingMutations.current > 0) return;
        if (ok) {
          applyBook(body as unknown as Book);
        } else {
          setState((prev) =>
            prev.status === "ready" ? prev : { status: "error", error: errorMessage(body) }
          );
        }
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
    };
  }, [applyBook]);

  const mutate = useCallback(
    async (url: string, payload: Record<string, unknown>) => {
      pendingMutations.current += 1;
      try {
        const { ok, body } = await requestJson(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...payload, memberId: currentMemberId }),
        });
        if (ok && body.book) {
          applyBook(body.book as unknown as Book);
        }
        return { ok, body };
      } finally {
        pendingMutations.current -= 1;
      }
    },
    [applyBook]
  );

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading the league book...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-destructive">
        Couldn&apos;t load the league book: {state.error}
      </div>
    );
  }

  const { book } = state;
  const wallet = book.wallets.find((w) => w.memberId === currentMemberId)!;
  const wagers = book.wagers.filter((w) => w.memberId === currentMemberId);

  function openWagerForMatchup(matchupId: string) {
    return wagers.find((w) => w.matchupId === matchupId && w.status === "open");
  }

  async function placeWager(
    market: BettingMarket,
    selectedTeamId: string,
    stakeFaab: number
  ): Promise<PlaceWagerResult> {
    const { ok, body } = await mutate("/api/wagers", {
      marketId: market.id,
      selectedTeamId,
      stakeFaab,
    });
    if (!ok) return { ok: false, error: errorMessage(body) };
    return { ok: true, wager: body.wager as Wager };
  }

  async function cancelWager(wagerId: string): Promise<ActionResult> {
    const { ok, body } = await mutate(`/api/wagers/${wagerId}/cancel`, {});
    return ok ? { ok: true } : { ok: false, error: errorMessage(body) };
  }

  async function voidWager(wagerId: string, reason: string): Promise<ActionResult> {
    const { ok, body } = await mutate("/api/commissioner/void", { wagerId, reason });
    return ok ? { ok: true } : { ok: false, error: errorMessage(body) };
  }

  async function settleWeek(week: number): Promise<SettlementResult> {
    const { ok, body } = await mutate("/api/commissioner/settle", { week });
    if (!ok) throw new Error(errorMessage(body));
    return body.result as SettlementResult;
  }

  async function setMarketStatus(matchupId: string, status: MarketStatus): Promise<void> {
    const { ok, body } = await mutate("/api/commissioner/market-status", { matchupId, status });
    if (!ok) throw new Error(errorMessage(body));
  }

  async function resetDemoData(): Promise<void> {
    const { ok, body } = await mutate("/api/book/reset", {});
    if (!ok) throw new Error(errorMessage(body));
  }

  return (
    <BettingContext.Provider
      value={{
        wallet,
        wagers,
        allWallets: book.wallets,
        allWagers: book.wagers,
        allMarkets: book.markets,
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
