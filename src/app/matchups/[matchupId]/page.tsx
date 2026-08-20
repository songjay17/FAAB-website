"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OddsButton } from "@/components/betting/odds-button";
import { MarketStatusBadge } from "@/components/betting/market-status-badge";
import { MarketLockTimer } from "@/components/betting/market-lock-timer";
import { ProjectionComparison } from "@/components/matchups/projection-comparison";
import { OptimalLineupTable } from "@/components/matchups/optimal-lineup-table";
import { BetSlip, type BetSlipSelection } from "@/components/betting/bet-slip";
import { EmptyState } from "@/components/shared/empty-state";
import { useBetting } from "@/lib/state/betting-provider";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";
import { formatFaab, formatPercent, impliedProbability } from "@/lib/odds";
import { getMatchupById, getProjectedLineup } from "@/lib/services/matchup-service";
import { getTeamById } from "@/lib/services/team-service";
import type { FantasyTeam, ProjectedLineup, WeeklyMatchup } from "@/lib/types";

export default function MatchupDetailPage() {
  const { matchupId } = useParams<{ matchupId: string }>();
  const { openWagerForMatchup, allMarkets } = useBetting();
  const { members, teams: sleeperTeams, matchupsByWeek, playersByTeam } = useSleeperData();

  const [matchup, setMatchup] = useState<WeeklyMatchup | null | undefined>(undefined);
  const [homeTeam, setHomeTeam] = useState<FantasyTeam | undefined>(undefined);
  const [awayTeam, setAwayTeam] = useState<FantasyTeam | undefined>(undefined);
  const [homeLineup, setHomeLineup] = useState<ProjectedLineup | undefined>(undefined);
  const [awayLineup, setAwayLineup] = useState<ProjectedLineup | undefined>(undefined);
  const [activeLineup, setActiveLineup] = useState<"home" | "away">("home");
  const [slipOpen, setSlipOpen] = useState(false);
  const [selection, setSelection] = useState<BetSlipSelection | null>(null);

  useEffect(() => {
    (async () => {
      const found = await getMatchupById(matchupsByWeek, matchupId);
      if (!found) {
        setMatchup(null);
        return;
      }
      setMatchup(found);
      const [home, away, hLineup, aLineup] = await Promise.all([
        getTeamById(sleeperTeams, found.homeTeamId),
        getTeamById(sleeperTeams, found.awayTeamId),
        getProjectedLineup(playersByTeam, found.homeTeamId, found.id),
        getProjectedLineup(playersByTeam, found.awayTeamId, found.id),
      ]);
      setHomeTeam(home);
      setAwayTeam(away);
      setHomeLineup(hLineup);
      setAwayLineup(aLineup);
    })();
  }, [matchupId, sleeperTeams, matchupsByWeek, playersByTeam]);

  const market = matchup ? allMarkets.find((m) => m.matchupId === matchup.id) : undefined;

  if (matchup === null) {
    return (
      <EmptyState
        title="Matchup not found"
        description="This matchup may have been removed or hasn't been posted yet."
        action={
          <Button size="sm" render={<Link href="/matchups" />}>
            Back to matchups
          </Button>
        }
      />
    );
  }

  if (!matchup || !market || !homeTeam || !awayTeam || !homeLineup || !awayLineup) {
    return null;
  }

  const homeOwner = members.find((m) => m.teamId === homeTeam.id);
  const awayOwner = members.find((m) => m.teamId === awayTeam.id);
  const existingWager = openWagerForMatchup(matchup.id);
  const isLocked = market.status !== "open" || Boolean(existingWager);

  function openSlip(teamId: string, opponentTeamId: string) {
    if (!market || !matchup) return;
    const team = teamId === homeTeam!.id ? homeTeam! : awayTeam!;
    const opponentTeam = opponentTeamId === homeTeam!.id ? homeTeam! : awayTeam!;
    const moneyline =
      teamId === matchup.homeTeamId ? market.odds.homeMoneyline : market.odds.awayMoneyline;
    setSelection({
      market,
      week: matchup.week,
      team,
      opponentTeam,
      moneyline,
      lockAt: matchup.lockAt,
    });
    setSlipOpen(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" render={<Link href="/matchups" />}>
            <ArrowLeft className="size-4" />
            Back to Matchups
          </Button>
          <MarketStatusBadge status={market.status} />
        </div>

        {existingWager ? (
          <div className="rounded-md bg-open-status px-3 py-2 text-sm font-medium text-open-status-foreground">
            You already have {formatFaab(existingWager.stakeFaab)} FAAB on{" "}
            {existingWager.selectedTeamId === homeTeam.id ? homeTeam.name : awayTeam.name} in
            this matchup — only one bet per matchup.
          </div>
        ) : null}

        <Card>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xl font-bold">{homeTeam.name}</p>
                <p className="text-xs text-muted-foreground">
                  {homeOwner?.displayName} &middot; {homeTeam.record.wins}-
                  {homeTeam.record.losses}
                </p>
              </div>
              <span className="text-sm font-medium text-muted-foreground">VS</span>
              <div className="text-right">
                <p className="text-xl font-bold">{awayTeam.name}</p>
                <p className="text-xs text-muted-foreground">
                  {awayOwner?.displayName} &middot; {awayTeam.record.wins}-{awayTeam.record.losses}
                </p>
              </div>
            </div>

            <ProjectionComparison
              homeName={homeTeam.name}
              awayName={awayTeam.name}
              homeProjected={homeLineup.totalProjectedPoints}
              awayProjected={awayLineup.totalProjectedPoints}
            />

            <div className="grid grid-cols-2 gap-3">
              <OddsButton
                teamName={homeTeam.name}
                moneyline={market.odds.homeMoneyline}
                disabled={isLocked}
                onSelect={() => openSlip(homeTeam.id, awayTeam.id)}
              />
              <OddsButton
                teamName={awayTeam.name}
                moneyline={market.odds.awayMoneyline}
                disabled={isLocked}
                onSelect={() => openSlip(awayTeam.id, homeTeam.id)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="size-3" />
                Pool: {formatFaab(market.totalFaabHome)} / {formatFaab(market.totalFaabAway)} FAAB
              </span>
              <MarketLockTimer market={market} verbose />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatPercent(impliedProbability(market.odds.homeMoneyline))} implied WP</span>
              <span>{formatPercent(impliedProbability(market.odds.awayMoneyline))} implied WP</span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Form: {homeTeam.recentForm.join(" ")}</span>
              <span>Form: {awayTeam.recentForm.join(" ")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-3 flex gap-2">
              <Button
                size="sm"
                variant={activeLineup === "home" ? "default" : "outline"}
                onClick={() => setActiveLineup("home")}
                className="flex-1 sm:hidden"
              >
                {homeTeam.name}
              </Button>
              <Button
                size="sm"
                variant={activeLineup === "away" ? "default" : "outline"}
                onClick={() => setActiveLineup("away")}
                className="flex-1 sm:hidden"
              >
                {awayTeam.name}
              </Button>
            </div>
            <p className="mb-3 hidden text-sm font-semibold sm:block">Optimal Lineups</p>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className={activeLineup === "home" ? "block" : "hidden sm:block"}>
                <p className="mb-2 hidden text-xs font-medium text-muted-foreground sm:block">
                  {homeTeam.name}
                </p>
                <OptimalLineupTable lineup={homeLineup} />
              </div>
              <div className={activeLineup === "away" ? "block" : "hidden sm:block"}>
                <p className="mb-2 hidden text-xs font-medium text-muted-foreground sm:block">
                  {awayTeam.name}
                </p>
                <OptimalLineupTable lineup={awayLineup} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Docked bet-slip rail — desktop only, mirrors the sportsbook "always visible" slip.
          The actual slip content renders in the BetSlip sheet triggered by the odds buttons;
          this panel shows a placeholder prompt until a side is selected. */}
      <div className="hidden lg:block">
        <Card className="sticky top-6">
          <CardContent className="text-center text-sm text-muted-foreground">
            {existingWager
              ? "You already have a bet on this matchup."
              : isLocked
                ? "This market is no longer accepting bets."
                : "Select a team's odds to start your bet slip."}
          </CardContent>
        </Card>
      </div>

      <BetSlip open={slipOpen} onOpenChange={setSlipOpen} selection={selection} />
    </div>
  );
}
