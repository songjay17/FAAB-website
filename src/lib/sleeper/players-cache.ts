import { fetchAllPlayers } from "./client";
import type { SleeperPlayersById } from "./types";

const TTL_MS = 24 * 60 * 60 * 1000;

let cached: SleeperPlayersById | null = null;
let cachedAt = 0;
let pending: Promise<SleeperPlayersById> | null = null;

/**
 * Module-level singleton, not localStorage — the ~14.6MB blob is too large
 * to persist, and Sleeper's own guidance is to refetch at most once/day.
 * Concurrent callers within the same page load share one in-flight request.
 */
export function getAllPlayers(): Promise<SleeperPlayersById> {
  if (cached && Date.now() - cachedAt < TTL_MS) {
    return Promise.resolve(cached);
  }
  if (pending) return pending;

  pending = fetchAllPlayers()
    .then((players) => {
      cached = players;
      cachedAt = Date.now();
      pending = null;
      return players;
    })
    .catch((err) => {
      pending = null;
      throw err;
    });

  return pending;
}
