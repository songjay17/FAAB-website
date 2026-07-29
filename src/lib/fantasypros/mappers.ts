import type { SleeperPlayer } from "@/lib/sleeper/types";
import type { FantasyProsPlayer } from "./types";

// FantasyPros and Sleeper occasionally disagree on team abbreviation for the
// same real team (verified live: FantasyPros uses "JAC", Sleeper uses "JAX").
const TEAM_CODE_ALIASES: Record<string, string> = {
  JAC: "JAX",
};

function normalizeTeam(team: string | null | undefined): string {
  if (!team) return "";
  return TEAM_CODE_ALIASES[team] ?? team;
}

// Strips suffixes like "II"/"Jr."/periods so "Patrick Mahomes II" (FantasyPros)
// matches "Patrick Mahomes" (Sleeper) — verified needed live for at least one
// real player (Mahomes).
function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type ProjectionLookup = Map<string, number>;

/** Keyed by `${normalizedName}|${normalizedTeam}`. */
export function buildProjectionLookup(players: FantasyProsPlayer[]): ProjectionLookup {
  const lookup: ProjectionLookup = new Map();
  for (const p of players) {
    const key = `${normalizeName(p.name)}|${normalizeTeam(p.team_id)}`;
    lookup.set(key, p.stats.points_ppr);
  }
  return lookup;
}

function sleeperPlayerName(player: SleeperPlayer): string {
  if (player.full_name) return player.full_name;
  return [player.first_name, player.last_name].filter(Boolean).join(" ");
}

export function findProjection(
  lookup: ProjectionLookup,
  player: SleeperPlayer
): number | undefined {
  const key = `${normalizeName(sleeperPlayerName(player))}|${normalizeTeam(player.team)}`;
  return lookup.get(key);
}
