import Link from "next/link";
import { CalendarClock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { League } from "@/lib/types";

/**
 * Season-over / season-not-started hero for the dashboard. Outside a live
 * season every market is locked (see BettingProvider), so this says why the
 * book is closed instead of leaving a dead betting UI to speak for itself.
 */
export function SeasonStatusCard({
  league,
  championName,
}: {
  league: League;
  championName?: string;
}) {
  if (league.seasonPhase === "in_season") return null;

  const isComplete = league.seasonPhase === "complete";
  const Icon = isComplete ? Trophy : CalendarClock;

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <Icon className="size-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {isComplete
              ? `The ${league.season} season is in the books`
              : `The ${league.season} season hasn't kicked off yet`}
          </h2>
          {isComplete && championName ? (
            <p className="text-sm">
              🏆 <span className="font-semibold">{championName}</span> took the league title
            </p>
          ) : null}
          <p className="max-w-md text-sm text-muted-foreground">
            {isComplete
              ? "Betting is closed and every market is locked. Final standings are on the leaderboard, and past weeks are still browsable."
              : "Betting opens once the schedule is live and this season's markets are posted."}
          </p>
          {league.upcomingSeason ? (
            <p className="max-w-md text-sm text-muted-foreground">
              The {league.upcomingSeason} league is already set up on Sleeper — the book reopens
              when the new season starts.
            </p>
          ) : null}
          {isComplete ? (
            <Button size="sm" variant="outline" className="mt-2" render={<Link href="/leaderboard" />}>
              View final standings
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
