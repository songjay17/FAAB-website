"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatFaab, formatMoneyline } from "@/lib/odds";
import { useBetting } from "@/lib/state/betting-provider";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";
import type { FantasyTeam, LeagueMember } from "@/lib/types";

function memberName(members: LeagueMember[], memberId: string) {
  return members.find((m) => m.id === memberId)?.displayName ?? memberId;
}

function teamName(teams: FantasyTeam[], teamId: string) {
  return teams.find((t) => t.id === teamId)?.name ?? teamId;
}

export function VoidWagerCard({
  icon: Icon,
  onVoided,
}: {
  icon: LucideIcon;
  onVoided?: (summary: string) => void;
}) {
  const { allWagers, voidWager } = useBetting();
  const { members, teams } = useSleeperData();
  const [selectedWagerId, setSelectedWagerId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openWagers = allWagers
    .filter((w) => w.status === "open")
    .sort((a, b) => b.placedAt.localeCompare(a.placedAt));

  function startVoid(wagerId: string) {
    setSelectedWagerId(wagerId);
    setReason("");
    setError(null);
  }

  function handleConfirm() {
    if (!selectedWagerId) return;
    const result = voidWager(selectedWagerId, reason);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const wager = allWagers.find((w) => w.id === selectedWagerId);
    onVoided?.(
      `Voided ${wager ? memberName(members, wager.memberId) : "a"}'s ${wager ? formatFaab(wager.stakeFaab) : ""} FAAB bet — reason: ${reason.trim()}.`
    );
    setSelectedWagerId(null);
    setReason("");
    setError(null);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">Void or refund a bet</p>
            <p className="text-sm text-muted-foreground">
              Return a member&apos;s stake when a market was posted in error.
            </p>
          </div>
        </div>

        <Dialog>
          <DialogTrigger render={<Button variant="destructive" size="sm" className="self-start" />}>
            Review & Void
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Open wagers</DialogTitle>
              <DialogDescription>
                Voiding returns the full stake to the member and does not affect P/L.
              </DialogDescription>
            </DialogHeader>

            {openWagers.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No open wagers right now.</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto">
                {openWagers.map((wager) => (
                  <li
                    key={wager.id}
                    data-testid="voidable-wager-row"
                    data-wager-id={wager.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {memberName(members, wager.memberId)}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            Week {wager.week}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {teamName(teams, wager.selectedTeamId)} vs {teamName(teams, wager.opponentTeamId)} ·{" "}
                          {formatMoneyline(wager.moneylineAtBet)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {formatFaab(wager.stakeFaab)}
                        </span>
                        <Button size="sm" variant="destructive" onClick={() => startVoid(wager.id)}>
                          Void
                        </Button>
                      </div>
                    </div>

                    {selectedWagerId === wager.id ? (
                      <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
                        <Label htmlFor={`void-reason-${wager.id}`}>Reason</Label>
                        <Input
                          id={`void-reason-${wager.id}`}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="e.g. market posted in error"
                          aria-invalid={error ? true : undefined}
                        />
                        {error ? (
                          <p className="text-xs text-destructive" role="alert">
                            {error}
                          </p>
                        ) : null}
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelectedWagerId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" variant="destructive" onClick={handleConfirm}>
                            Confirm Void
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <DialogFooter showCloseButton />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
