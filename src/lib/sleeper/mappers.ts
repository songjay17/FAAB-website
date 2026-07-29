import type {
  FantasyPlayer,
  FantasyTeam,
  League,
  LeagueMember,
  PlayerPosition,
  WeeklyMatchup,
} from "@/lib/types";
import type { ProjectionLookup } from "@/lib/fantasypros/mappers";
import { getProjectedPoints } from "@/lib/fantasypros/projections-service";
import type {
  SleeperLeague,
  SleeperMatchupEntry,
  SleeperPlayersById,
  SleeperRoster,
  SleeperUser,
} from "./types";

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

export function mapLeague(league: SleeperLeague): League {
  return {
    id: league.league_id,
    name: league.name,
    season: Number(league.season),
    currentWeek: league.settings.last_scored_leg,
    totalWeeks: 17,
    scoringFormat: "PPR",
  };
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

/** Sleeper's matchup_id is only unique per-week, so the app-level id is namespaced by week. */
export function mapMatchups(
  week: number,
  entries: SleeperMatchupEntry[],
  lockAt: string
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
      status: "final",
      homeScore: home.points,
      awayScore: away.points,
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
