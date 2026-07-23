"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Swords } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MatchupCard } from "@/components/matchups/matchup-card";
import { BetSlip, type BetSlipSelection } from "@/components/betting/bet-slip";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { mockLeague, mockMembers } from "@/lib/mock-data";
import { getMatchupsByWeek, getAvailableWeeks } from "@/lib/services/matchup-service";
import { getMarketsForWeek } from "@/lib/services/market-service";
import { getTeams } from "@/lib/services/team-service";
import { mockLineups } from "@/lib/mock-data/matchups";
import type { BettingMarket, FantasyTeam, WeeklyMatchup } from "@/lib/types";

function MatchupsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekParam = searchParams.get("week");
  const parsedWeek = weekParam === null ? NaN : Number(weekParam);
  const week = Number.isInteger(parsedWeek) ? parsedWeek : mockLeague.currentWeek;

  const [matchups, setMatchups] = useState<WeeklyMatchup[]>([]);
  const [markets, setMarkets] = useState<BettingMarket[]>([]);
  const [teams, setTeams] = useState<FantasyTeam[]>([]);
  const [weeks, setWeeks] = useState<number[]>([]);
  const [loadedWeek, setLoadedWeek] = useState<number | null>(null);
  const [slipOpen, setSlipOpen] = useState(false);
  const [selection, setSelection] = useState<BetSlipSelection | null>(null);
  const loading = loadedWeek !== week;

  useEffect(() => {
    (async () => {
      const [weekMatchups, teamList, availableWeeks] = await Promise.all([
        getMatchupsByWeek(week),
        getTeams(),
        getAvailableWeeks(),
      ]);
      const weekMarkets = await getMarketsForWeek(weekMatchups.map((m) => m.id));
      setMatchups(weekMatchups);
      setTeams(teamList);
      setMarkets(weekMarkets);
      setWeeks(availableWeeks);
      setLoadedWeek(week);
    })();
  }, [week]);

  function goToWeek(next: number) {
    router.push(`/matchups?week=${next}`);
  }

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
    mockMembers.find((m) => m.teamId === teamId) ?? mockMembers[0];
  const projectedFor = (teamId: string, matchupId: string) =>
    mockLineups.find((l) => l.teamId === teamId && l.matchupId === matchupId)
      ?.totalProjectedPoints ?? 0;

  return (
    <div>
      <PageHeader
        title="Matchups"
        description={mockLeague.scoringFormat}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!weeks.includes(week - 1)}
              onClick={() => goToWeek(week - 1)}
              aria-label="Previous week"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-20 text-center text-sm font-semibold">Week {week}</span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!weeks.includes(week + 1)}
              onClick={() => goToWeek(week + 1)}
              aria-label="Next week"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
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
