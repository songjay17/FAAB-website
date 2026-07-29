"use client";

import { useState } from "react";
import {
  Pause,
  RefreshCw,
  Coins,
  Undo2,
  ClipboardList,
  Lock,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CommissionerActionCard } from "@/components/commissioner/commissioner-action-card";
import { SettleWeekCard } from "@/components/commissioner/settle-week-card";
import { VoidWagerCard } from "@/components/commissioner/void-wager-card";
import { ManageMarketsCard } from "@/components/commissioner/manage-markets-card";
import { useBetting } from "@/lib/state/betting-provider";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";

const seedAuditLog = [
  {
    id: "log-1",
    text: "Justin adjusted Ravi's FAAB from 585 to 615 — reason: waiver correction.",
    time: "Jul 20, 9:14 AM",
  },
  {
    id: "log-2",
    text: "Justin voided Sam's $20 bet on Week 6 Diggs My Grave vs Gibbs Me Liberty — reason: incorrect lineup lock.",
    time: "Jul 19, 6:02 PM",
  },
  {
    id: "log-3",
    text: "Justin opened betting markets for Week 7.",
    time: "Jul 18, 8:00 AM",
  },
  {
    id: "log-4",
    text: "Justin updated odds for Hurts So Good vs Bijan Mustard after lineup projections refreshed.",
    time: "Jul 17, 11:30 AM",
  },
];

export default function CommissionerPage() {
  const [betsPaused, setBetsPaused] = useState(false);
  const [liveAuditLog, setLiveAuditLog] = useState<{ id: string; text: string; time: string }[]>([]);
  const { resetDemoData } = useBetting();
  const { league } = useSleeperData();
  const auditLog = [...liveAuditLog, ...seedAuditLog];

  function logVoid(summary: string) {
    setLiveAuditLog((prev) => [
      {
        id: `live-${Date.now()}`,
        text: summary,
        time: new Date().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      },
      ...prev,
    ]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commissioner Tools"
        description={`Frontend preview only — no changes here affect live data for ${league.name}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <CommissionerActionCard
          icon={Pause}
          title={betsPaused ? "Resume all betting" : "Pause all betting"}
          description="Temporarily stop new bets league-wide, e.g. during a lineup dispute."
          actionLabel={betsPaused ? "Resume Betting" : "Pause Betting"}
          onAction={() => setBetsPaused((v) => !v)}
        />
        <CommissionerActionCard
          icon={RefreshCw}
          title="Update mock odds"
          description="Recalculate moneylines from the latest projected lineups."
          actionLabel="Refresh Odds"
        />
        <CommissionerActionCard
          icon={Coins}
          title="Adjust a member's FAAB"
          description="Correct a member's balance. A reason is required and logged below."
          actionLabel="Adjust FAAB"
        />
        <VoidWagerCard icon={Undo2} onVoided={logVoid} />
        <CommissionerActionCard
          icon={ClipboardList}
          title="Review all wagers"
          description="See every open and settled bet across the league."
          actionLabel="View Wagers"
        />
        <ManageMarketsCard icon={Lock} />
        <SettleWeekCard icon={Trophy} />
      </div>

      <Card>
        <CardContent>
          <h2 className="mb-3 font-semibold">Audit Activity</h2>
          <ul className="space-y-3 text-sm">
            {auditLog.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5 border-b border-border/60 pb-3 last:border-0">
                <span className="text-foreground">{entry.text}</span>
                <span className="text-xs text-muted-foreground">{entry.time}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
          Reset demo data
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears your locally saved wallet and bet history and restores the seed
              data, so you can re-run the demo flow from a clean state.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resetDemoData}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
