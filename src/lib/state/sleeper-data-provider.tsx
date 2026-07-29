"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadLeagueData, type LeagueData } from "@/lib/sleeper/load-league-data";

type SleeperDataState =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: LeagueData };

const SleeperDataContext = createContext<SleeperDataState | null>(null);

/**
 * Loads real league/team/roster data from Sleeper (+ FantasyPros
 * projections) once on mount and gates children on it being ready — every
 * other provider/page can assume real data is present rather than
 * re-handling a loading state itself.
 */
export function SleeperDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SleeperDataState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    loadLeagueData()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", error: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading league data from Sleeper...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-destructive">
        Couldn&apos;t load league data: {state.error}
      </div>
    );
  }

  return (
    <SleeperDataContext.Provider value={state}>{children}</SleeperDataContext.Provider>
  );
}

export function useSleeperData(): LeagueData {
  const ctx = useContext(SleeperDataContext);
  if (!ctx || ctx.status !== "ready") {
    throw new Error("useSleeperData must be used within a ready SleeperDataProvider");
  }
  return ctx.data;
}
