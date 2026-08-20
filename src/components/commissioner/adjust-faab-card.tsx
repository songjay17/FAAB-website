"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatFaab } from "@/lib/odds";
import { useBetting } from "@/lib/state/betting-provider";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";

/**
 * Commissioner correction to a member's balance — the "we sorted this out
 * offline" escape hatch. Only moves available FAAB: reserved funds belong to
 * open wagers, and P/L stays put because a correction isn't a betting
 * outcome (same reasoning as Sleeper waiver reconciliation).
 */
export function AdjustFaabCard({
  icon: Icon,
  onAdjusted,
}: {
  icon: LucideIcon;
  onAdjusted?: () => void;
}) {
  const { allWallets, adjustFaab } = useBetting();
  const { members } = useSleeperData();
  const [memberId, setMemberId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const wallet = allWallets.find((w) => w.memberId === memberId);
  const amount = Number(amountInput);
  const amountValid = amountInput.trim() !== "" && Number.isFinite(amount) && amount !== 0;
  const preview =
    wallet && amountValid ? Math.round((wallet.availableFaab + amount) * 100) / 100 : null;

  function reset() {
    setMemberId("");
    setAmountInput("");
    setReason("");
    setError(null);
  }

  async function handleSubmit() {
    if (!memberId || !amountValid || !reason.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await adjustFaab(memberId, amount, reason);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const name = members.find((m) => m.id === memberId)?.displayName ?? "Member";
    setStatus(
      `${name}'s balance adjusted by ${amount > 0 ? "+" : ""}${formatFaab(amount)} FAAB.`
    );
    reset();
    onAdjusted?.();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">Adjust a member&apos;s FAAB</p>
            <p className="text-sm text-muted-foreground">
              Correct a balance. A reason is required and recorded in the audit trail.
            </p>
          </div>
        </div>

        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

        <Dialog
          onOpenChange={(open) => {
            if (!open) reset();
            else setStatus(null);
          }}
        >
          <DialogTrigger render={<Button variant="outline" size="sm" className="self-start" />}>
            Adjust FAAB
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust a member&apos;s FAAB</DialogTitle>
              <DialogDescription>
                Changes available balance only — reserved stakes and weekly/season P/L are
                left alone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adjust-member">Member</Label>
                <select
                  id="adjust-member"
                  value={memberId}
                  onChange={(e) => {
                    setMemberId(e.target.value);
                    setError(null);
                  }}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select a member…</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjust-amount">Amount (negative to deduct)</Label>
                <Input
                  id="adjust-amount"
                  inputMode="numeric"
                  placeholder="e.g. 15 or -10"
                  value={amountInput}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "" || /^-?\d*\.?\d*$/.test(raw)) {
                      setAmountInput(raw);
                      setError(null);
                    }
                  }}
                  className="font-mono tabular-nums"
                />
                {wallet ? (
                  <p className="text-xs text-muted-foreground">
                    Available now: {formatFaab(wallet.availableFaab)} FAAB
                    {preview !== null ? ` → ${formatFaab(preview)} FAAB` : ""}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjust-reason">Reason</Label>
                <Input
                  id="adjust-reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. waiver correction agreed in chat"
                  aria-invalid={error ? true : undefined}
                />
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button
                size="sm"
                className="self-start"
                disabled={!memberId || !amountValid || !reason.trim() || submitting}
                onClick={handleSubmit}
              >
                {submitting ? "Applying…" : "Apply adjustment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
