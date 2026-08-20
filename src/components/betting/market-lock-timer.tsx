"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatCountdown, isPastLockTime, msUntilLock } from "@/lib/market-lock";
import type { BettingMarket } from "@/lib/types";

/** Inside this window the deadline is imminent enough to show a live countdown instead of a date. */
const COUNTDOWN_WINDOW_MS = 24 * 60 * 60 * 1000;

function formatLockTime(iso: string, verbose: boolean) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: verbose ? "long" : "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * The market's betting deadline: a date while it's far off, a live
 * countdown in the final day, and "Betting closed" once it passes. The
 * server is what actually enforces the lock (placeWager re-checks inside
 * its transaction) — this only makes the deadline visible, and re-renders
 * on a timer so an open page doesn't keep claiming a market is open after
 * kickoff.
 */
export function MarketLockTimer({
  market,
  verbose = false,
}: {
  market: BettingMarket;
  verbose?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  const remaining = msUntilLock(market.status, market.lockAt, now);
  const ticking = remaining !== null && remaining <= COUNTDOWN_WINDOW_MS;

  useEffect(() => {
    if (!market.lockAt || market.status !== "open") return;
    // Only tick while the deadline is close (once a minute is plenty for a
    // d/h/m countdown); otherwise a single check keeps the page from going
    // stale without a timer running all session.
    const interval = ticking ? 30_000 : 5 * 60_000;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [market.lockAt, market.status, ticking]);

  if (!market.lockAt) return null;

  const passed = isPastLockTime(market.lockAt, now);

  return (
    <span className="flex items-center gap-1">
      <Clock className="size-3" />
      {passed ? (
        "Betting closed"
      ) : ticking ? (
        <span className="font-medium text-foreground">
          Locks in {formatCountdown(remaining!)}
        </span>
      ) : (
        `Locks ${formatLockTime(market.lockAt, verbose)}`
      )}
    </span>
  );
}
