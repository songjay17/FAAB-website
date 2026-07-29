"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Ticket, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FaabBalanceCard } from "@/components/wallet/faab-balance-card";
import { WagerCard } from "@/components/betting/wager-card";
import { WagerStatusBadge } from "@/components/betting/wager-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { OddsButton } from "@/components/betting/odds-button";
import { MarketStatusBadge } from "@/components/betting/market-status-badge";
import { useBetting } from "@/lib/state/betting-provider";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";
import { formatMoneyline } from "@/lib/odds";
import { getMatchupsByWeek } from "@/lib/services/matchup-service";
import { getTeams } from "@/lib/services/team-service";
import { getLeaderboard } from "@/lib/services/leaderboard-service";
import { DEMO_CURRENT_USER_ID } from "@/lib/sleeper/config";
import type { FantasyTeam, LeaderboardEntry, WeeklyMatchup } from "@/lib/types";

export default function DashboardPage() {
  const { wallet, wagers, allWallets, allWagers, allMarkets } = useBetting();
  const { league, members, teams: sleeperTeams, matchupsByWeek } = useSleeperData();
  const [matchups, setMatchups] = useState<WeeklyMatchup[]>([]);
  const [teams, setTeams] = useState<FantasyTeam[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    (async () => {
      const [weekMatchups, teamList] = await Promise.all([
        getMatchupsByWeek(matchupsByWeek, league.currentWeek),
        getTeams(sleeperTeams),
      ]);
      const board = await getLeaderboard(
        "season",
        allWallets,
        allWagers,
        members,
        sleeperTeams,
        league.currentWeek
      );
      setMatchups(weekMatchups);
      setTeams(teamList);
      setLeaderboard(board.slice(0, 5));
    })();
  }, [allWallets, allWagers, league, members, sleeperTeams, matchupsByWeek]);

  const markets = allMarkets.filter((m) => matchups.some((matchup) => matchup.id === m.matchupId));
  const teamById = (id: string) => teams.find((t) => t.id === id);
  const featured = matchups[0];
  const featuredMarket = featured ? markets.find((m) => m.matchupId === featured.id) : undefined;
  const openWagers = wagers.filter((w) => w.status === "open").slice(0, 3);
  const recentWagers = wagers.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{league.name}</h1>
          <p className="text-sm text-muted-foreground">
            Week {league.currentWeek} of {league.totalWeeks}
          </p>
        </div>
        <Button size="lg" render={<Link href="/matchups" />}>
          View this week&apos;s matchups
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <FaabBalanceCard wallet={wallet} />

      {featured && featuredMarket ? (
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Featured Matchup
              </span>
              <MarketStatusBadge status={featuredMarket.status} />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold">{teamById(featured.homeTeamId)?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {teamById(featured.homeTeamId)?.record.wins}-
                    {teamById(featured.homeTeamId)?.record.losses}
                  </p>
                </div>
                <span className="text-xs font-medium text-muted-foreground">vs</span>
                <div className="text-right">
                  <p className="text-lg font-semibold">{teamById(featured.awayTeamId)?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {teamById(featured.awayTeamId)?.record.wins}-
                    {teamById(featured.awayTeamId)?.record.losses}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:w-64">
                <OddsButton
                  teamName={teamById(featured.homeTeamId)?.name ?? ""}
                  moneyline={featuredMarket.odds.homeMoneyline}
                />
                <OddsButton
                  teamName={teamById(featured.awayTeamId)?.name ?? ""}
                  moneyline={featuredMarket.odds.awayMoneyline}
                />
              </div>
            </div>
            <div className="mt-4 text-right">
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                render={<Link href={`/matchups/${featured.id}`} />}
              >
                Place Bet &rarr;
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Open Bets ({wagers.filter((w) => w.status === "open").length})</h2>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                render={<Link href="/bets" />}
              >
                View all
              </Button>
            </div>
            {openWagers.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No open bets"
                description="Check this week's matchups to place your first bet."
                action={
                  <Button size="sm" render={<Link href="/matchups" />}>
                    Browse matchups
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {openWagers.map((w) => (
                  <WagerCard
                    key={w.id}
                    wager={w}
                    teamName={teamById(w.selectedTeamId)?.name ?? "—"}
                    opponentName={teamById(w.opponentTeamId)?.name ?? "—"}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="mb-3 font-semibold">Recent Activity</h2>
            {recentWagers.length === 0 ? (
              <EmptyState title="No activity yet" description="Your bets will show up here." />
            ) : (
              <ul className="space-y-3">
                {recentWagers.map((w) => (
                  <li key={w.id} className="flex items-center justify-between text-sm">
                    <span className="truncate text-muted-foreground">
                      {formatMoneyline(w.moneylineAtBet)} on{" "}
                      <span className="font-medium text-foreground">
                        {teamById(w.selectedTeamId)?.name}
                      </span>
                    </span>
                    <WagerStatusBadge status={w.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">This Week&apos;s Matchups</h2>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                render={<Link href="/matchups" />}
              >
                See all
              </Button>
            </div>
            <ul className="space-y-2">
              {matchups.map((m) => {
                const market = markets.find((mk) => mk.matchupId === m.id);
                return (
                  <li key={m.id}>
                    <Link
                      href={`/matchups/${m.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="truncate">
                        {teamById(m.homeTeamId)?.name} vs {teamById(m.awayTeamId)?.name}
                      </span>
                      {market ? (
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {formatMoneyline(market.odds.homeMoneyline)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-semibold">
                <Trophy className="size-4" />
                Leaderboard
              </h2>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                render={<Link href="/leaderboard" />}
              >
                Full standings
              </Button>
            </div>
            <ul className="space-y-2">
              {leaderboard.map((entry) => (
                <li
                  key={entry.memberId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      #{entry.rank}
                    </span>
                    <span
                      className={
                        entry.memberId === DEMO_CURRENT_USER_ID ? "font-semibold text-primary" : ""
                      }
                    >
                      {entry.displayName}
                    </span>
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {entry.seasonProfitLoss >= 0 ? "+" : ""}
                    {entry.seasonProfitLoss}
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
