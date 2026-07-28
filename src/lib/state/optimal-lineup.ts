import type { FantasyPlayer, LineupSlot, ProjectedLineup } from "@/lib/types";

const FLEX_ELIGIBLE = new Set<FantasyPlayer["position"]>(["RB", "WR", "TE"]);

/**
 * Picks each team's highest-scoring legal lineup from its full roster —
 * QB, RB, RB, WR, WR, TE, FLEX (RB/WR/TE), K, DEF. Used to price odds so a
 * member can't manufacture worse odds on themselves by benching a starter
 * right before betting opens: the odds always assume the roster's best
 * possible lineup, not whatever's actually been set.
 *
 * Greedy fill (best remaining player per required slot, then best remaining
 * RB/WR/TE for FLEX) is optimal here because there's a single flex slot and
 * no cost constraint — taking the single best leftover skill player for
 * FLEX can never be beaten by holding one back for a slot it doesn't fill.
 */
export function getOptimalLineup(
  teamId: string,
  matchupId: string,
  roster: FantasyPlayer[]
): ProjectedLineup {
  const remaining = [...roster].sort((a, b) => b.projectedPoints - a.projectedPoints);
  const slots: LineupSlot[] = [];

  function take(position: FantasyPlayer["position"]): FantasyPlayer | undefined {
    const index = remaining.findIndex((p) => p.position === position);
    if (index === -1) return undefined;
    return remaining.splice(index, 1)[0];
  }

  function fill(slot: string, position: FantasyPlayer["position"]) {
    const player = take(position);
    if (player) slots.push({ slot, player });
  }

  fill("QB", "QB");
  fill("RB", "RB");
  fill("RB", "RB");
  fill("WR", "WR");
  fill("WR", "WR");
  fill("TE", "TE");

  const flexIndex = remaining.findIndex((p) => FLEX_ELIGIBLE.has(p.position));
  if (flexIndex !== -1) {
    slots.push({ slot: "FLEX", player: remaining.splice(flexIndex, 1)[0] });
  }

  fill("K", "K");
  fill("DEF", "DEF");

  const totalProjectedPoints =
    Math.round(slots.reduce((sum, s) => sum + s.player.projectedPoints, 0) * 10) / 10;

  return { teamId, matchupId, slots, totalProjectedPoints };
}
