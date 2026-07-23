"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { getLeaderboard } from "@/lib/services/leaderboard-service";
import { currentMemberId } from "@/lib/mock-data/league";
import type { LeaderboardEntry } from "@/lib/types";

function LeaderboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scope = (searchParams.get("scope") as "week" | "season") ?? "season";
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loadedScope, setLoadedScope] = useState<string | null>(null);

  useEffect(() => {
    getLeaderboard(scope).then((result) => {
      setEntries(result);
      setLoadedScope(scope);
    });
  }, [scope]);

  const isLoading = loadedScope !== scope;

  return (
    <div>
      <PageHeader
        title="Leaderboard"
        description="Ranked by betting performance, not wager volume."
      />
      <Tabs
        value={scope}
        onValueChange={(v) => router.push(`/leaderboard?scope=${v}`)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="season">Season</TabsTrigger>
        </TabsList>
      </Tabs>

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
