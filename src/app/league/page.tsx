"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatFaab } from "@/lib/odds";
import { mockLeague, mockMembers, mockTeams } from "@/lib/mock-data";
import { mockMatchups } from "@/lib/mock-data/matchups";

export default function LeagueOverviewPage() {
  const standings = [...mockTeams].sort((a, b) => {
    if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
    return b.pointsFor - a.pointsFor;
  });

  const currentWeekSchedule = mockMatchups.filter((m) => m.week === mockLeague.currentWeek);
  const recentResults = mockMatchups.filter((m) => m.status === "final");

  const teamById = (id: string) => mockTeams.find((t) => t.id === id)!;
  const ownerByTeamId = (teamId: string) => mockMembers.find((m) => m.teamId === teamId);

  return (
    <div className="space-y-6">
      <PageHeader title="League Overview" description={mockLeague.scoringFormat} />

      <Card>
        <CardContent>
          <h2 className="mb-3 font-semibold">Standings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Team</th>
                  <th className="py-2 pr-4 font-medium">Owner</th>
                  <th className="py-2 pr-4 font-medium">Record</th>
                  <th className="py-2 pr-4 font-medium">PF</th>
                  <th className="py-2 pr-4 font-medium">PA</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((team, i) => (
                  <tr key={team.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="py-2.5 pr-4 font-medium">
                      {team.logoEmoji} {team.name}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {ownerByTeamId(team.id)?.displayName}
                    </td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums">
                      {team.record.wins}-{team.record.losses}
                    </td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-muted-foreground">
                      {team.pointsFor.toFixed(1)}
                    </td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-muted-foreground">
                      {team.pointsAgainst.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <h2 className="mb-3 font-semibold">Week {mockLeague.currentWeek} Schedule</h2>
            <ul className="space-y-2">
              {currentWeekSchedule.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/matchups/${m.id}`}
                    className="flex items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <span>
                      {teamById(m.homeTeamId).name} vs {teamById(m.awayTeamId).name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="mb-3 font-semibold">Recent Results</h2>
            <ul className="space-y-2">
              {recentResults.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-2 py-2 text-sm">
                  <span>
                    {teamById(m.homeTeamId).name} vs {teamById(m.awayTeamId).name}
                  </span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {formatFaab(m.homeScore ?? 0)}-{formatFaab(m.awayScore ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
