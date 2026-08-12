"use client";

import { Suspense, useEffect, useState } from "react";
import { Swords } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MatchupCard } from "@/components/matchups/matchup-card";
import { BetSlip, type BetSlipSelection } from "@/components/betting/bet-slip";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { WeekNav } from "@/components/shared/week-nav";
import { useWeekParam } from "@/lib/hooks/use-week-param";
import { getMatchupsByWeek, getAvailableWeeks } from "@/lib/services/matchup-service";
import { getTeams } from "@/lib/services/team-service";
import { useBetting } from "@/lib/state/betting-provider";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";
import { getOptimalLineup } from "@/lib/state/optimal-lineup";
import type { FantasyTeam, WeeklyMatchup } from "@/lib/types";

function MatchupsPageContent() {
  const { allMarkets } = useBetting();
  const { league, members, teams: sleeperTeams, matchupsByWeek, playersByTeam } = useSleeperData();
  const { week, goToWeek } = useWeekParam("/matchups", league.currentWeek);

  const [matchups, setMatchups] = useState<WeeklyMatchup[]>([]);
  const [teams, setTeams] = useState<FantasyTeam[]>([]);
  const [weeks, setWeeks] = useState<number[]>([]);
  const [loadedWeek, setLoadedWeek] = useState<number | null>(null);
  const [slipOpen, setSlipOpen] = useState(false);
  const [selection, setSelection] = useState<BetSlipSelection | null>(null);
  const loading = loadedWeek !== week;

  useEffect(() => {
    (async () => {
      const [weekMatchups, teamList, availableWeeks] = await Promise.all([
        getMatchupsByWeek(matchupsByWeek, week),
        getTeams(sleeperTeams),
        getAvailableWeeks(matchupsByWeek),
      ]);
      setMatchups(weekMatchups);
      setTeams(teamList);
      setWeeks(availableWeeks);
      setLoadedWeek(week);
    })();
  }, [week, sleeperTeams, matchupsByWeek]);

  const markets = allMarkets.filter((m) => matchups.some((matchup) => matchup.id === m.matchupId));

  function handlePlaceBet(matchup: WeeklyMatchup, teamId: string, opponentTeamId: string) {
    const market = markets.find((m) => m.matchupId === matchup.id);
    const team = teams.find((t) => t.id === teamId);
    const opponentTeam = teams.find((t) => t.id === opponentTeamId);
    if (!market || !team || !opponentTeam) return;
    const moneyline =
      teamId === matchup.homeTeamId ? market.odds.homeMoneyline : market.odds.awayMoneyline;
    setSelection({ market, week: matchup.week, team, opponentTeam, moneyline, lockAt: matchup.lockAt });
    setSlipOpen(true);
  }

  const teamById = (id: string) => teams.find((t) => t.id === id)!;
  const ownerByTeamId = (teamId: string) =>
    members.find((m) => m.teamId === teamId) ?? members[0];
  const projectedFor = (teamId: string, matchupId: string) => {
    const roster = playersByTeam[teamId];
    if (!roster) return 0;
    return getOptimalLineup(teamId, matchupId, roster).totalProjectedPoints;
  };

  return (
    <div>
      <PageHeader
        title="Matchups"
        description={league.scoringFormat}
        actions={<WeekNav week={week} availableWeeks={weeks} onNavigate={goToWeek} />}
      />

      {loading ? (
        <LoadingSkeleton variant="card" count={4} />
      ) : markets.length === 0 ? (
        <EmptyState
          icon={Swords}
          title={`Matchups for Week ${week} haven't been posted yet`}
          description="Check back once the commissioner opens this week's markets."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {matchups.map((matchup) => {
            const market = markets.find((m) => m.matchupId === matchup.id);
            if (!market) return null;
            return (
              <MatchupCard
                key={matchup.id}
                matchup={matchup}
                market={market}
                homeTeam={teamById(matchup.homeTeamId)}
                awayTeam={teamById(matchup.awayTeamId)}
                homeOwner={ownerByTeamId(matchup.homeTeamId)}
                awayOwner={ownerByTeamId(matchup.awayTeamId)}
                homeProjected={projectedFor(matchup.homeTeamId, matchup.id)}
                awayProjected={projectedFor(matchup.awayTeamId, matchup.id)}
                onPlaceBet={(teamId, opponentTeamId) =>
                  handlePlaceBet(matchup, teamId, opponentTeamId)
                }
              />
            );
          })}
        </div>
      )}

      <BetSlip open={slipOpen} onOpenChange={setSlipOpen} selection={selection} />
    </div>
  );
}

export default function MatchupsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="card" count={4} />}>
      <MatchupsPageContent />
    </Suspense>
  );
}
