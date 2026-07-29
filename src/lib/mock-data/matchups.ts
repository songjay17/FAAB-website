import type { ProjectedLineup, WeeklyMatchup } from "@/lib/types";
import { getOptimalLineup } from "@/lib/state/optimal-lineup";
import { mockPlayersByTeam } from "./teams";

function buildLineup(teamId: string, matchupId: string): ProjectedLineup {
  return getOptimalLineup(teamId, matchupId, mockPlayersByTeam[teamId]);
}

// Week 7 matchups (the current week).
export const mockMatchups: WeeklyMatchup[] = [
  {
    id: "matchup-w7-1",
    week: 7,
    homeTeamId: "roster-1",
    awayTeamId: "roster-2",
    lockAt: "2026-07-26T17:00:00.000Z",
    status: "upcoming",
  },
  {
    id: "matchup-w7-2",
    week: 7,
    homeTeamId: "roster-3",
    awayTeamId: "roster-4",
    lockAt: "2026-07-26T17:00:00.000Z",
    status: "upcoming",
  },
  {
    id: "matchup-w7-3",
    week: 7,
    homeTeamId: "roster-5",
    awayTeamId: "roster-6",
    lockAt: "2026-07-26T17:00:00.000Z",
    status: "upcoming",
  },
  {
    id: "matchup-w7-4",
    week: 7,
    homeTeamId: "roster-7",
    awayTeamId: "roster-8",
    lockAt: "2026-07-26T20:05:00.000Z",
    status: "upcoming",
  },
  // Week 6 (final, for "recent results" surfaces).
  {
    id: "matchup-w6-1",
    week: 6,
    homeTeamId: "roster-1",
    awayTeamId: "roster-4",
    lockAt: "2026-07-19T17:00:00.000Z",
    status: "final",
    homeScore: 128.4,
    awayScore: 101.2,
  },
  {
    id: "matchup-w6-2",
    week: 6,
    homeTeamId: "roster-3",
    awayTeamId: "roster-2",
    lockAt: "2026-07-19T17:00:00.000Z",
    status: "final",
    homeScore: 96.8,
    awayScore: 110.5,
  },
  {
    id: "matchup-w6-3",
    week: 6,
    homeTeamId: "roster-6",
    awayTeamId: "roster-7",
    lockAt: "2026-07-19T17:00:00.000Z",
    status: "final",
    homeScore: 88.1,
    awayScore: 94.6,
  },
  {
    id: "matchup-w6-4",
    week: 6,
    homeTeamId: "roster-5",
    awayTeamId: "roster-8",
    lockAt: "2026-07-19T17:00:00.000Z",
    status: "final",
    homeScore: 119.3,
    awayScore: 92.0,
  },
  // Week 8 (not yet posted odds — used for "matchups not posted" empty state).
  {
    id: "matchup-w8-1",
    week: 8,
    homeTeamId: "roster-2",
    awayTeamId: "roster-5",
    lockAt: "2026-08-02T17:00:00.000Z",
    status: "upcoming",
  },
  {
    id: "matchup-w8-2",
    week: 8,
    homeTeamId: "roster-4",
    awayTeamId: "roster-6",
    lockAt: "2026-08-02T17:00:00.000Z",
    status: "upcoming",
  },
];

export const mockLineups: ProjectedLineup[] = mockMatchups
  .filter((m) => m.week === 7)
  .flatMap((m) => [buildLineup(m.homeTeamId, m.id), buildLineup(m.awayTeamId, m.id)]);
