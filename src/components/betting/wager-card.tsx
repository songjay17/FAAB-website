"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
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
import { WagerStatusBadge } from "./wager-status-badge";
import { formatFaab, formatMoneyline } from "@/lib/odds";
import { SELF_CANCEL_WINDOW_MS } from "@/lib/betting-constants";
import { useBetting } from "@/lib/state/betting-provider";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";
import type { Wager } from "@/lib/types";

function formatTimestamp(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function WagerCard({
  wager,
  teamName,
  opponentName,
}: {
  wager: Wager;
  teamName: string;
  opponentName: string;
}) {
  const { cancelWager, allMarkets } = useBetting();
  const { matchupsByWeek } = useSleeperData();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withinCancelWindow, setWithinCancelWindow] = useState(false);

  useEffect(() => {
    const placedAt = new Date(wager.placedAt).getTime();
    function check() {
      setWithinCancelWindow(Date.now() - placedAt <= SELF_CANCEL_WINDOW_MS);
    }
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [wager.placedAt]);

  const payoutLabel = wager.status === "open" ? "Potential payout" : "Payout";
  const payoutValue =
    wager.status === "open" ? wager.potentialPayout : (wager.finalPayout ?? 0);

  const matchup = (matchupsByWeek.get(wager.week) ?? []).find((m) => m.id === wager.matchupId);
  const market = allMarkets.find((m) => m.matchupId === wager.matchupId);
  const isLocked = market ? market.status !== "open" : false;
  const canCancel = wager.status === "open" && withinCancelWindow;

  async function handleCancel() {
    const result = await cancelWager(wager.id);
    if (!result.ok) {
      setError(result.error);
    }
  }

  return (
    <Card className="p-4">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Week {wager.week}</p>
          <p className="truncate font-semibold text-foreground">{teamName}</p>
          <p className="truncate text-xs text-muted-foreground">vs {opponentName}</p>
        </div>
        <WagerStatusBadge status={wager.status} />
      </button>
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 font-mono tabular-nums">
          <span>{formatFaab(wager.stakeFaab)} FAAB</span>
          <span className="text-muted-foreground">{formatMoneyline(wager.moneylineAtBet)}</span>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">{payoutLabel}</p>
          <p className="font-mono font-semibold tabular-nums">{formatFaab(payoutValue)}</p>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Reference</span>
            <span className="font-mono text-foreground">{wager.reference}</span>
          </div>
          <div className="flex justify-between">
            <span>Placed</span>
            <span className="text-foreground">{formatTimestamp(wager.placedAt)}</span>
          </div>
          {matchup ? (
            <div className="flex justify-between">
              <span>{isLocked ? "Locked" : "Locks"}</span>
              <span className="text-foreground">{formatTimestamp(matchup.lockAt)}</span>
            </div>
          ) : null}
          {wager.settledAt ? (
            <div className="flex justify-between">
              <span>Settled</span>
              <span className="text-foreground">{formatTimestamp(wager.settledAt)}</span>
            </div>
          ) : null}

          {canCancel ? (
            <div className="pt-2">
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button variant="outline" size="sm" className="w-full" />}
                >
                  Cancel bet
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this bet?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your {formatFaab(wager.stakeFaab)} FAAB stake on {teamName}{" "}
                      will be refunded in full. This can&apos;t be undone. Self-cancel is only
                      for misclicks — once the grace window passes, only the commissioner can
                      void a bet.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep bet</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel}>Cancel bet</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {error ? (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
