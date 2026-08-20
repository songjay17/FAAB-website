import type {
  FantasyPlayer,
  FantasyTeam,
  League,
  LeagueMember,
  PlayerPosition,
  SeasonPhase,
  WeeklyMatchup,
} from "@/lib/types";
import type { ProjectionLookup } from "@/lib/fantasypros/mappers";
import { getProjectedPoints } from "@/lib/fantasypros/projections-service";
import type {
  SleeperLeague,
  SleeperMatchupEntry,
  SleeperNflState,
  SleeperPlayersById,
  SleeperRoster,
  SleeperUser,
} from "./types";

export const TOTAL_WEEKS = 17;

const FANTASY_POSITIONS = new Set<PlayerPosition>(["QB", "RB", "WR", "TE", "K", "DEF"]);

function isFantasyPosition(position: string | null): position is PlayerPosition {
  return !!position && FANTASY_POSITIONS.has(position as PlayerPosition);
}

// Deterministic so server/client render identically — same pattern as
// seededPoolAmount in mock-data/markets.ts.
const LOGO_EMOJIS = ["🏈", "🦅", "🐻", "🦁", "🐯", "🐺", "🦈", "🐉", "🔥", "⚡", "🌪️", "🥊", "🎯", "🚀"];
function logoEmojiForRoster(rosterId: number): string {
  return LOGO_EMOJIS[rosterId % LOGO_EMOJIS.length];
}

function clampWeek(week: number): number {
  return Math.min(Math.max(week, 1), TOTAL_WEEKS);
}

export function mapSeasonPhase(league: SleeperLeague): SeasonPhase {
  if (league.status === "complete") return "complete";
  if (league.status === "pre_draft" || league.status === "drafting") return "upcoming";
  return "in_season";
}

/**
 * The week the app should treat as "now". last_scored_leg alone can't do
 * this: it pins to 17 forever on a completed season and is null/0 on one
 * that hasn't kicked off, and mid-season it names the last *finished* week,
 * not the one being bet on. The NFL calendar (/v1/state/nfl) is the real
 * clock — the league's own status just decides whether that clock applies.
 */
export function deriveCurrentWeek(league: SleeperLeague, state: SleeperNflState): number {
  const lastScored = league.settings.last_scored_leg ?? 0;
  if (league.status === "complete") return clampWeek(lastScored || TOTAL_WEEKS);
  if (mapSeasonPhase(league) === "upcoming") return 1;
  // In-season: trust the NFL state while it's describing this league's season.
  if (state.league_season === league.season) {
    // display_week counts preseason weeks during the preseason — a drafted
    // league waiting on kickoff is heading into week 1, not "pre week 2".
    if (state.season_type === "pre" || state.season_type === "off") return 1;
    return clampWeek(state.display_week || state.leg || lastScored || 1);
  }
  return clampWeek(lastScored || 1);
}

export function mapLeague(
  league: SleeperLeague,
  currentWeek: number,
  upcomingSeason?: number
): League {
  const seasonPhase = mapSeasonPhase(league);
  const championRosterId = league.metadata?.latest_league_winner_roster_id;
  return {
    id: league.league_id,
    name: league.name,
    season: Number(league.season),
    currentWeek,
    totalWeeks: TOTAL_WEEKS,
    scoringFormat: "PPR",
    waiverBudget: league.settings.waiver_budget,
    seasonPhase,
    // latest_league_winner_roster_id names *last* season's champion until
    // this one finishes, so it's only this league's champion when complete.
    championTeamId:
      seasonPhase === "complete" && championRosterId ? `roster-${championRosterId}` : undefined,
    upcomingSeason,
  };
}

/** Keyed by owner_id (LeagueMember.id) — real FAAB spent on waiver claims this season. */
export function mapWaiverSpend(rosters: SleeperRoster[]): Record<string, number> {
  const spend: Record<string, number> = {};
  for (const roster of rosters) {
    if (!roster.owner_id) continue;
    spend[roster.owner_id] = roster.settings.waiver_budget_used;
  }
  return spend;
}

/** teamId is set to `roster-${roster_id}` — LeagueMember.teamId join key. */
export function mapMembers(users: SleeperUser[], rosters: SleeperRoster[]): LeagueMember[] {
  return rosters
    .filter((r) => r.owner_id)
    .map((roster) => {
      const user = users.find((u) => u.user_id === roster.owner_id);
      return {
        id: roster.owner_id!,
        displayName: user?.display_name ?? `Team ${roster.roster_id}`,
        teamId: `roster-${roster.roster_id}`,
      } satisfies LeagueMember;
    });
}

export function mapTeams(rosters: SleeperRoster[], users: SleeperUser[]): FantasyTeam[] {
  return rosters.map((roster) => {
    const user = users.find((u) => u.user_id === roster.owner_id);
    const fpts = roster.settings.fpts + roster.settings.fpts_decimal / 100;
    const fptsAgainst = roster.settings.fpts_against + roster.settings.fpts_against_decimal / 100;
    return {
      id: `roster-${roster.roster_id}`,
      ownerMemberId: roster.owner_id ?? `roster-${roster.roster_id}`,
      name: user?.metadata?.team_name ?? user?.display_name ?? `Team ${roster.roster_id}`,
      logoEmoji: logoEmojiForRoster(roster.roster_id),
      record: {
        wins: roster.settings.wins,
        losses: roster.settings.losses,
        ties: roster.settings.ties,
      },
      pointsFor: Math.round(fpts * 10) / 10,
      pointsAgainst: Math.round(fptsAgainst * 10) / 10,
      recentForm: [],
    } satisfies FantasyTeam;
  });
}

/** Walks matchup history up to (and including) `throughWeek` to build a W/L form list, oldest-first. */
export function computeRecentForm(
  rosterId: number,
  matchupsByWeek: Map<number, SleeperMatchupEntry[]>,
  throughWeek: number
): Array<"W" | "L"> {
  const form: Array<"W" | "L"> = [];
  for (let week = 1; week <= throughWeek; week++) {
    const weekMatchups = matchupsByWeek.get(week);
    if (!weekMatchups) continue;
    const mine = weekMatchups.find((m) => m.roster_id === rosterId);
    if (!mine || mine.matchup_id == null) continue;
    const opponent = weekMatchups.find(
      (m) => m.matchup_id === mine.matchup_id && m.roster_id !== rosterId
    );
    if (!opponent) continue;
    if (mine.points === opponent.points) continue; // ties don't fit W/L
    form.push(mine.points > opponent.points ? "W" : "L");
  }
  return form;
}

/**
 * Sleeper's matchup_id is only unique per-week, so the app-level id is
 * namespaced by week. `isFinal` = the week has been scored (week <=
 * last_scored_leg); an unscored week's 0–0 Sleeper points are the absence of
 * scores, not a result, so they aren't carried over.
 */
export function mapMatchups(
  week: number,
  entries: SleeperMatchupEntry[],
  lockAt: string,
  isFinal: boolean
): WeeklyMatchup[] {
  const pairs = new Map<number, SleeperMatchupEntry[]>();
  for (const entry of entries) {
    if (entry.matchup_id == null) continue;
    const group = pairs.get(entry.matchup_id) ?? [];
    group.push(entry);
    pairs.set(entry.matchup_id, group);
  }

  const matchups: WeeklyMatchup[] = [];
  for (const [sleeperMatchupId, [home, away]] of pairs) {
    if (!home || !away) continue; // bye week or incomplete pairing
    matchups.push({
      id: `${week}-${sleeperMatchupId}`,
      week,
      homeTeamId: `roster-${home.roster_id}`,
      awayTeamId: `roster-${away.roster_id}`,
      lockAt,
      status: isFinal ? "final" : "upcoming",
      homeScore: isFinal ? home.points : undefined,
      awayScore: isFinal ? away.points : undefined,
    });
  }
  return matchups;
}

/** Real players on a roster with a known fantasy position, mapped to FantasyPlayer with a real-or-fallback projection. */
export function mapRosterPlayers(
  roster: SleeperRoster,
  allPlayers: SleeperPlayersById,
  projectionLookup: ProjectionLookup
): FantasyPlayer[] {
  const players: FantasyPlayer[] = [];
  for (const playerId of roster.players ?? []) {
    const sleeperPlayer = allPlayers[playerId];
    if (!sleeperPlayer || !isFantasyPosition(sleeperPlayer.position)) continue;
    const position = sleeperPlayer.position;
    const name =
      sleeperPlayer.full_name ??
      [sleeperPlayer.first_name, sleeperPlayer.last_name].filter(Boolean).join(" ");
    players.push({
      id: playerId,
      name: name || playerId,
      position,
      nflTeam: sleeperPlayer.team ?? "FA",
      projectedPoints: getProjectedPoints(projectionLookup, sleeperPlayer, position),
    });
  }
  return players;
}
