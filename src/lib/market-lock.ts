// Shared by the client UI and the server book — lives outside any
// "use client" module so route handlers can import it too.

import type { MarketStatus } from "@/lib/types";

/**
 * `lockAt` placeholder used when the NFL schedule lookup fails (see
 * load-league-data). A matchup with no real kickoff date must not read as
 * "locked since 1970" — it has no deadline at all, and falls back to
 * season-phase and commissioner control.
 */
const EPOCH_PLACEHOLDER_MS = 0;

export function hasRealLockTime(lockAt: string | null | undefined): boolean {
  if (!lockAt) return false;
  const ms = new Date(lockAt).getTime();
  return Number.isFinite(ms) && ms !== EPOCH_PLACEHOLDER_MS;
}

/** True once the week's betting deadline has passed. */
export function isPastLockTime(lockAt: string | null | undefined, now: number = Date.now()): boolean {
  return hasRealLockTime(lockAt) && new Date(lockAt!).getTime() <= now;
}

/**
 * The status a market should present, given the clock. An open market whose
 * deadline has passed reads as locked everywhere — no commissioner action
 * required, and a stale page can't keep showing an open line. Deliberately
 * one-directional: it never re-opens a market the commissioner locked, and
 * it never touches a settled one.
 */
export function effectiveMarketStatus(
  status: MarketStatus,
  lockAt: string | null | undefined,
  now: number = Date.now()
): MarketStatus {
  return status === "open" && isPastLockTime(lockAt, now) ? "locked" : status;
}

/**
 * Milliseconds until a market's deadline, or null when there's nothing to
 * count down to (no real lock time, already passed, or not open).
 */
export function msUntilLock(
  status: MarketStatus,
  lockAt: string | null | undefined,
  now: number = Date.now()
): number | null {
  if (status !== "open" || !hasRealLockTime(lockAt)) return null;
  const remaining = new Date(lockAt!).getTime() - now;
  return remaining > 0 ? remaining : null;
}

/**
 * Short human countdown ("2d 4h", "3h 12m", "8m"). Coarse on purpose: the
 * deadline is a weekly cadence, so second-by-second precision would be
 * noise — and it only gets minute-accurate inside the final hour, which is
 * when it actually matters.
 */
export function formatCountdown(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${Math.max(1, minutes)}m`;
}
