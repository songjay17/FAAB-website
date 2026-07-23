"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ticket } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { WagerCard } from "@/components/betting/wager-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useBetting } from "@/lib/state/betting-provider";
import { mockTeams } from "@/lib/mock-data";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "open";

  const teamById = (id: string) => mockTeams.find((t) => t.id === id);

  return (
    <div>
      <PageHeader title="My Bets" />
      <Tabs value={tab} onValueChange={(v) => router.push(`/bets?tab=${v}`)}>
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((t) => {
          const filtered = t.status ? wagers.filter((w) => w.status === t.status) : wagers;
          return (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title={t.value === "open" ? "No open bets" : `No ${t.label.toLowerCase()} bets`}
                  description={
                    t.value === "open"
                      ? "Check this week's matchups to place your first bet."
                      : undefined
                  }
                  action={
                    t.value === "open" ? (
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
