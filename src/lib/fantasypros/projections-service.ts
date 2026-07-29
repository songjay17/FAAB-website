import type { PlayerPosition } from "@/lib/types";
import type { SleeperPlayer } from "@/lib/sleeper/types";
import { fetchProjections } from "./client";
import { buildProjectionLookup, findProjection, type ProjectionLookup } from "./mappers";

// FantasyPros calls the defense position "DST"; this app's PlayerPosition
// type (and Sleeper) calls it "DEF".
const POSITION_TO_FANTASYPROS: Record<PlayerPosition, string> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  DEF: "DST",
};

const ALL_POSITIONS: PlayerPosition[] = ["QB", "RB", "WR", "TE", "K", "DEF"];

/**
 * One real FantasyPros lookup per position for a given week, merged into a
 * single name+team-keyed map. The free-tier key caps each position query at
 * its top 10 players (verified live — no pagination available), so this
 * covers the studs/starters that matter most for odds; getProjectedPoints
 * falls back to a positional average for everyone else.
 */
export async function loadProjectionLookup(
  season: number,
  week: number
): Promise<ProjectionLookup> {
  const merged: ProjectionLookup = new Map();
  const results = await Promise.allSettled(
    ALL_POSITIONS.map((pos) => fetchProjections(season, week, POSITION_TO_FANTASYPROS[pos]))
  );
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const lookup = buildProjectionLookup(result.value.players);
    for (const [key, points] of lookup) {
      merged.set(key, points);
    }
  }
  return merged;
}

const POSITIONAL_AVERAGE_FALLBACK: Record<PlayerPosition, number> = {
  QB: 16,
  RB: 9,
  WR: 8,
  TE: 6,
  K: 7,
  DEF: 6,
};

/**
 * Real FantasyPros projection when the name+team join finds one; otherwise a
 * positional-average fallback. Rosters aren't filtered down to only-projected
 * players — getOptimalLineup needs full rosters to price odds correctly, so
 * every real player needs *some* projectedPoints value.
 */
export function getProjectedPoints(
  lookup: ProjectionLookup,
  player: SleeperPlayer,
  position: PlayerPosition
): number {
  const real = findProjection(lookup, player);
  return real ?? POSITIONAL_AVERAGE_FALLBACK[position];
}
