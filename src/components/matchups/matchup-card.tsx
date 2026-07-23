"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OddsButton } from "@/components/betting/odds-button";
import { MarketStatusBadge } from "@/components/betting/market-status-badge";
import { TeamSummary } from "./team-summary";
import { impliedProbability, formatFaab } from "@/lib/odds";
import { useBetting } from "@/lib/state/betting-provider";
import type { BettingMarket, FantasyTeam, LeagueMember, WeeklyMatchup } from "@/lib/types";

function formatLockTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function MatchupCard({
  matchup,
  market,
  homeTeam,
  awayTeam,
  homeOwner,
  awayOwner,
  homeProjected,
  awayProjected,
  onPlaceBet,
}: {
  matchup: WeeklyMatchup;
  market: BettingMarket;
  homeTeam: FantasyTeam;
  awayTeam: FantasyTeam;
  homeOwner: LeagueMember;
  awayOwner: LeagueMember;
  homeProjected: number;
  awayProjected: number;
  onPlaceBet: (teamId: string, opponentTeamId: string) => void;
}) {
  const { openWagerForMatchup } = useBetting();
  const existingWager = openWagerForMatchup(matchup.id);
  const existingTeamName = existingWager
    ? existingWager.selectedTeamId === homeTeam.id
      ? homeTeam.name
      : awayTeam.name
    : null;

  const isLocked = market.status !== "open";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <MarketStatusBadge status={market.status} />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          Locks {formatLockTime(matchup.lockAt)}
        </div>
      </div>

      {existingTeamName ? (
        <div className="mt-3 rounded-md bg-open-status px-3 py-1.5 text-xs font-medium text-open-status-foreground">
          You have {formatFaab(existingWager!.stakeFaab)} FAAB on {existingTeamName}
        </div>
      ) : null}

      <Link href={`/matchups/${matchup.id}`} className="mt-4 block space-y-4">
        <div className="flex items-center justify-between gap-3">
          <TeamSummary
            team={homeTeam}
            ownerName={homeOwner.displayName}
            projectedPoints={homeProjected}
            winProbability={impliedProbability(market.odds.homeMoneyline)}
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">VS</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <TeamSummary
          team={awayTeam}
          ownerName={awayOwner.displayName}
          projectedPoints={awayProjected}
          winProbability={impliedProbability(market.odds.awayMoneyline)}
          align="right"
        />
      </Link>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <OddsButton
          teamName={homeTeam.name}
          moneyline={market.odds.homeMoneyline}
          disabled={isLocked}
          onSelect={() => onPlaceBet(homeTeam.id, awayTeam.id)}
        />
        <OddsButton
          teamName={awayTeam.name}
          moneyline={market.odds.awayMoneyline}
          disabled={isLocked}
          onSelect={() => onPlaceBet(awayTeam.id, homeTeam.id)}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Pool: {formatFaab(market.totalFaabHome)} / {formatFaab(market.totalFaabAway)} FAAB
        </span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          render={<Link href={`/matchups/${matchup.id}`} />}
        >
          View matchup &rarr;
        </Button>
      </div>
    </Card>
  );
}
