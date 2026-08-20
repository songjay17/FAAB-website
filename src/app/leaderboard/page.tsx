"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { WeekNav } from "@/components/shared/week-nav";
import { getLeaderboard } from "@/lib/services/leaderboard-service";
import { getAvailableWeeks } from "@/lib/services/matchup-service";
import { useWeekParam } from "@/lib/hooks/use-week-param";
import { useCurrentMemberId } from "@/lib/state/session-provider";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";
import { useBetting } from "@/lib/state/betting-provider";
import type { LeaderboardEntry } from "@/lib/types";

function LeaderboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scope = (searchParams.get("scope") as "week" | "season") ?? "season";
  const { allWallets, allWagers } = useBetting();
  const { league, members, teams, matchupsByWeek } = useSleeperData();
  const currentMemberId = useCurrentMemberId();
  const { week, goToWeek } = useWeekParam("/leaderboard", league.currentWeek);
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    getAvailableWeeks(matchupsByWeek).then(setAvailableWeeks);
  }, [matchupsByWeek]);

  useEffect(() => {
    getLeaderboard(scope, allWallets, allWagers, members, teams, week).then((result) => {
      setEntries(result);
      setLoadedKey(`${scope}-${week}`);
    });
  }, [scope, week, allWallets, allWagers, members, teams]);

  const isLoading = loadedKey !== `${scope}-${week}`;

  function goToScope(nextScope: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scope", nextScope);
    router.push(`/leaderboard?${params.toString()}`);
  }

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description="Ranked by betting performance, not wager volume."
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={scope} onValueChange={goToScope}>
          <TabsList>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="season">Season</TabsTrigger>
          </TabsList>
        </Tabs>
        {scope === "week" ? (
          <WeekNav week={week} availableWeeks={availableWeeks} onNavigate={goToWeek} />
        ) : null}
      </div>

      {isLoading || entries === null ? (
        <LoadingSkeleton variant="table" count={8} />
      ) : (
        <LeaderboardTable entries={entries} currentMemberId={currentMemberId} />
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" count={8} />}>
      <LeaderboardContent />
    </Suspense>
  );
}
