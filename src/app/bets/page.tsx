"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ticket } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { WagerCard } from "@/components/betting/wager-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useBetting } from "@/lib/state/betting-provider";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";
import { getAvailableWeeks } from "@/lib/services/matchup-service";
import type { WagerStatus } from "@/lib/types";

const tabs: Array<{ value: string; label: string; status?: WagerStatus }> = [
  { value: "open", label: "Open", status: "open" },
  { value: "won", label: "Won", status: "won" },
  { value: "lost", label: "Lost", status: "lost" },
  { value: "refunded", label: "Refunded", status: "refunded" },
  { value: "all", label: "All" },
];

function MyBetsContent() {
  const { wagers } = useBetting();
  const { teams, matchupsByWeek } = useSleeperData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "open";
  const weekParam = searchParams.get("week");
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);

  useEffect(() => {
    getAvailableWeeks(matchupsByWeek).then(setAvailableWeeks);
  }, [matchupsByWeek]);

  function goToWeekFilter(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete("week");
    } else {
      params.set("week", value);
    }
    router.push(`/bets?${params.toString()}`);
  }

  const teamById = (id: string) => teams.find((t) => t.id === id);

  return (
    <div>
      <PageHeader
        title="My Bets"
        actions={
          <Select value={weekParam ?? "all"} onValueChange={goToWeekFilter}>
            <SelectTrigger aria-label="Filter by week">
              <SelectValue>
                {(value: string) => (value === "all" || !value ? "All weeks" : `Week ${value}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All weeks</SelectItem>
              {availableWeeks.map((w) => (
                <SelectItem key={w} value={String(w)}>
                  Week {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <Tabs value={tab} onValueChange={(v) => router.push(`/bets?tab=${v}${weekParam ? `&week=${weekParam}` : ""}`)}>
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => {
          const byStatus = t.status ? wagers.filter((w) => w.status === t.status) : wagers;
          const filtered = weekParam ? byStatus.filter((w) => w.week === Number(weekParam)) : byStatus;
          const weekSuffix = weekParam ? ` in Week ${weekParam}` : "";
          return (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title={
                    t.value === "open"
                      ? `No open bets${weekSuffix}`
                      : `No ${t.label.toLowerCase()} bets${weekSuffix}`
                  }
                  description={
                    t.value === "open" && !weekParam
                      ? "Check this week's matchups to place your first bet."
                      : undefined
                  }
                  action={
                    t.value === "open" && !weekParam ? (
                      <Button size="sm" render={<Link href="/matchups" />}>
                        Browse matchups
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((w) => (
                    <WagerCard
                      key={w.id}
                      wager={w}
                      teamName={teamById(w.selectedTeamId)?.name ?? "—"}
                      opponentName={teamById(w.opponentTeamId)?.name ?? "—"}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

export default function MyBetsPage() {
  return (
    <Suspense fallback={null}>
      <MyBetsContent />
    </Suspense>
  );
}
