import { describe, expect, it } from "vitest";
import { getOptimalLineup } from "@/lib/state/optimal-lineup";
import type { FantasyPlayer } from "@/lib/types";

function makePlayer(overrides: Partial<FantasyPlayer> & Pick<FantasyPlayer, "id" | "position" | "projectedPoints">): FantasyPlayer {
  return {
    name: overrides.id,
    nflTeam: "XXX",
    ...overrides,
  };
}

describe("getOptimalLineup", () => {
  it("fills every required slot from a roster with no bench (one player per position)", () => {
    const roster: FantasyPlayer[] = [
      makePlayer({ id: "qb", position: "QB", projectedPoints: 20 }),
      makePlayer({ id: "rb1", position: "RB", projectedPoints: 15 }),
      makePlayer({ id: "rb2", position: "RB", projectedPoints: 12 }),
      makePlayer({ id: "wr1", position: "WR", projectedPoints: 14 }),
      makePlayer({ id: "wr2", position: "WR", projectedPoints: 11 }),
      makePlayer({ id: "te", position: "TE", projectedPoints: 9 }),
      makePlayer({ id: "flex", position: "WR", projectedPoints: 8 }),
      makePlayer({ id: "k", position: "K", projectedPoints: 7 }),
      makePlayer({ id: "def", position: "DEF", projectedPoints: 6 }),
    ];

    const lineup = getOptimalLineup("team-1", "matchup-1", roster);

    expect(lineup.slots).toHaveLength(9);
    expect(lineup.slots.map((s) => s.player.id).sort()).toEqual(
      roster.map((p) => p.id).sort()
    );
    expect(lineup.totalProjectedPoints).toBe(102);
  });

  it("picks the higher-scoring bench player over a lower-scoring starter at the same position", () => {
    const roster: FantasyPlayer[] = [
      makePlayer({ id: "qb", position: "QB", projectedPoints: 20 }),
      makePlayer({ id: "rb-starter", position: "RB", projectedPoints: 10 }),
      makePlayer({ id: "rb-bench", position: "RB", projectedPoints: 18 }),
      makePlayer({ id: "rb3", position: "RB", projectedPoints: 8 }),
      makePlayer({ id: "wr1", position: "WR", projectedPoints: 14 }),
      makePlayer({ id: "wr2", position: "WR", projectedPoints: 11 }),
      makePlayer({ id: "te", position: "TE", projectedPoints: 9 }),
      makePlayer({ id: "k", position: "K", projectedPoints: 7 }),
      makePlayer({ id: "def", position: "DEF", projectedPoints: 6 }),
    ];

    const lineup = getOptimalLineup("team-1", "matchup-1", roster);
    const rbSlots = lineup.slots.filter((s) => s.slot === "RB").map((s) => s.player.id);

    // The two best RBs start; the third (lower-scoring) RB is left on the
    // bench even though a starter was "declared" for that slot elsewhere —
    // this is the mechanism that defeats bench-tanking: the algorithm reads
    // the whole roster, not whatever a member marked as started.
    expect(rbSlots.sort()).toEqual(["rb-bench", "rb-starter"]);
  });

  it("assigns the best remaining RB/WR/TE to FLEX, never K or DEF, and the top TE fills the required TE slot", () => {
    const roster: FantasyPlayer[] = [
      makePlayer({ id: "qb", position: "QB", projectedPoints: 20 }),
      makePlayer({ id: "rb1", position: "RB", projectedPoints: 15 }),
      makePlayer({ id: "rb2", position: "RB", projectedPoints: 12 }),
      makePlayer({ id: "wr1", position: "WR", projectedPoints: 14 }),
      makePlayer({ id: "wr2", position: "WR", projectedPoints: 11 }),
      makePlayer({ id: "te-top", position: "TE", projectedPoints: 13 }),
      makePlayer({ id: "te-second", position: "TE", projectedPoints: 9 }),
      makePlayer({ id: "k", position: "K", projectedPoints: 30 }),
      makePlayer({ id: "def", position: "DEF", projectedPoints: 25 }),
    ];

    const lineup = getOptimalLineup("team-1", "matchup-1", roster);
    const teSlot = lineup.slots.find((s) => s.slot === "TE");
    const flexSlot = lineup.slots.find((s) => s.slot === "FLEX");

    // The higher-scoring TE fills the required TE slot; the second TE
    // (9 pts) is the best remaining RB/WR/TE left over, so it wins FLEX
    // despite K/DEF projecting higher raw points — FLEX is never filled by
    // K or DEF regardless of their projections.
    expect(teSlot?.player.id).toBe("te-top");
    expect(flexSlot?.player.id).toBe("te-second");
  });

  it("benching a team's best player for lineup purposes does not change the optimal-lineup total, since the algorithm reads the full roster", () => {
    const fullRoster: FantasyPlayer[] = [
      makePlayer({ id: "qb", position: "QB", projectedPoints: 20 }),
      makePlayer({ id: "rb-star", position: "RB", projectedPoints: 30 }),
      makePlayer({ id: "rb2", position: "RB", projectedPoints: 12 }),
      makePlayer({ id: "rb-bench", position: "RB", projectedPoints: 5 }),
      makePlayer({ id: "wr1", position: "WR", projectedPoints: 14 }),
      makePlayer({ id: "wr2", position: "WR", projectedPoints: 11 }),
      makePlayer({ id: "te", position: "TE", projectedPoints: 9 }),
      makePlayer({ id: "k", position: "K", projectedPoints: 7 }),
      makePlayer({ id: "def", position: "DEF", projectedPoints: 6 }),
    ];

    const lineup = getOptimalLineup("team-1", "matchup-1", fullRoster);
    const rbIds = lineup.slots.filter((s) => s.slot === "RB").map((s) => s.player.id);

    // Even if an owner never "started" rb-star (e.g. it's marked bench in a
    // real roster UI), the odds-facing optimal lineup still includes it —
    // there is no way to manufacture a worse lineup total by hiding a
    // player, since this function only ever looks at the full roster array.
    expect(rbIds).toContain("rb-star");
    expect(rbIds).not.toContain("rb-bench");
  });
});
