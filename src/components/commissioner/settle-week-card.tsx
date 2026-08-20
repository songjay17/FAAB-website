"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { formatFaab } from "@/lib/odds";
import { useBetting } from "@/lib/state/betting-provider";
import type { SettlementResult } from "@/lib/state/settlement";

const skipReasonLabel: Record<string, string> = {
  "matchup-not-found": "matchup not found",
  "matchup-not-final": "matchup not final",
  "missing-final-score": "missing final score",
  "team-not-in-matchup": "selected team not in matchup",
};

export function SettleWeekCard({
  icon: Icon,
  onSettled,
}: {
  icon: LucideIcon;
  onSettled?: () => void;
}) {
  const { allWagers, settleWeek } = useBetting();
  const [settling, setSettling] = useState(false);
  const [result, setResult] = useState<SettlementResult | null>(null);

  const openWeeks = Array.from(
    new Set(allWagers.filter((w) => w.status === "open").map((w) => w.week))
  ).sort((a, b) => a - b);
  const week = openWeeks[0];
  const eligibleCount = allWagers.filter((w) => w.status === "open" && w.week === week).length;

  async function handleSettle() {
    if (week === undefined || settling) return;
    setSettling(true);
    try {
      setResult(await settleWeek(week));
      onSettled?.();
    } catch {
      // The book refetches on focus; a failed settle leaves everything open
      // and the button re-enabled to try again.
    } finally {
      setSettling(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">
              {week === undefined ? "Settle wagers" : `Settle Week ${week}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {week === undefined
                ? "No open wagers are waiting on a final result right now."
                : `Resolves ${eligibleCount} open wager${eligibleCount === 1 ? "" : "s"} using each matchup's final score.`}
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger
            render={<Button size="sm" className="self-start" disabled={week === undefined || settling} />}
          >
            Settle Week
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Settle Week {week}?</AlertDialogTitle>
              <AlertDialogDescription>
                This uses each matchup&apos;s final home/away score to mark open wagers won,
                lost, or refunded (on a tie), release reserved FAAB, and credit payouts.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={settling} onClick={handleSettle}>
                Confirm Settle
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {result ? (
          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground" role="status">
            <p className="mb-1 font-medium text-foreground">
              Settled Week {result.week}: {result.processed} wager{result.processed === 1 ? "" : "s"} processed
            </p>
            <ul className="space-y-0.5">
              <li>Won: {result.won}</li>
              <li>Lost: {result.lost}</li>
              <li>Refunded: {result.refunded}</li>
              <li>Total FAAB paid out: {formatFaab(result.totalPaidOut)}</li>
              {result.skipped.length > 0 ? (
                <li>
                  Skipped: {result.skipped.length} (
                  {result.skipped
                    .map((s) => `${s.reference}: ${skipReasonLabel[s.reason] ?? s.reason}`)
                    .join(", ")}
                  )
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
