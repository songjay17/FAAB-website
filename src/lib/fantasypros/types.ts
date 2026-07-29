// Shape verified live against api.fantasypros.com/public/v2 with a real
// free-tier key (week 1, 2025 season). Free tier hard-caps every position
// query at the top 10 players by projected points, regardless of the
// `count` field in the response — no pagination param exists. `scoring` in
// the response always echoes "STD" even when a scoring query param is
// passed, so `points_ppr` (not `scoring`/`points`) is the field to trust.
// `players` can be `null` with `count: "0"` on an otherwise-200 response —
// verified live (a week/position combo with no cached data) — treat as an
// empty result, not a hard failure.
export type FantasyProsPlayer = {
  fpid: number;
  name: string;
  position_id: string;
  team_id: string | null;
  stats: {
    points: number;
    points_ppr: number;
    points_half: number;
  };
};

export type FantasyProsProjectionsResponse = {
  season: string;
  week: string;
  count: string;
  positions: string;
  players: FantasyProsPlayer[] | null;
  limit?: number;
  tier?: string;
};

export const FANTASYPROS_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DST"] as const;
