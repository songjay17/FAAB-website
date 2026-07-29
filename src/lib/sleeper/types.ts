// Shapes verified live against api.sleeper.app (2025 "JHU Lads" season,
// league_id 1230632258184957952) — only the fields this app actually reads.

export type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  status: string;
  previous_league_id: string | null;
  roster_positions: string[];
  settings: {
    playoff_week_start: number;
    last_scored_leg: number;
  };
};

export type SleeperRosterSettings = {
  wins: number;
  losses: number;
  ties: number;
  fpts: number;
  fpts_decimal: number;
  fpts_against: number;
  fpts_against_decimal: number;
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  players: string[] | null;
  starters: string[] | null;
  settings: SleeperRosterSettings;
};

export type SleeperUser = {
  user_id: string;
  display_name: string;
  is_owner: boolean | null;
  metadata: {
    team_name?: string;
  } | null;
};

export type SleeperMatchupEntry = {
  roster_id: number;
  matchup_id: number | null;
  points: number;
  starters: string[];
  players_points: Record<string, number>;
};

// Keyed by player_id in the /players/nfl response. Team defenses (e.g. "DEN")
// have a null full_name — first_name/last_name are present instead (e.g.
// "Denver"/"Broncos").
export type SleeperPlayer = {
  player_id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  team: string | null;
};

export type SleeperPlayersById = Record<string, SleeperPlayer>;
