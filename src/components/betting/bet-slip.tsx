"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateWagerPreview,
  formatFaab,
  formatMoneyline,
  validateStake,
} from "@/lib/odds";
import { useBetting } from "@/lib/state/betting-provider";
import { BetReceipt } from "./bet-receipt";
import type { BettingMarket, FantasyTeam, Wager } from "@/lib/types";

export type BetSlipSelection = {
  market: BettingMarket;
  week: number;
  team: FantasyTeam;
  opponentTeam: FantasyTeam;
  moneyline: number;
  lockAt: string;
};

export function BetSlip({
  open,
  onOpenChange,
  selection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: BetSlipSelection | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        {selection ? (
          // Keying on the selection remounts the form (resetting its local
          // state) whenever the user picks a different team/matchup.
          <BetSlipForm
            key={`${selection.market.id}-${selection.team.id}`}
            selection={selection}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function BetSlipForm({
  selection,
  onOpenChange,
}: {
  selection: BetSlipSelection;
  onOpenChange: (open: boolean) => void;
}) {
  const { wallet, placeWager } = useBetting();
  const [stakeInput, setStakeInput] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedWager, setConfirmedWager] = useState<Wager | null>(null);

  const stake = Number(stakeInput);
  const error = validateStake(stakeInput, wallet.availableFaab);
  const hasValidStake = stakeInput.trim() !== "" && !error;
  const preview = hasValidStake
    ? calculateWagerPreview(stake, selection.moneyline)
    : null;
  const isLocked = selection.market.status !== "open";

  async function handleConfirm() {
    if (!hasValidStake || !selection || isLocked || confirming) return;
    setConfirming(true);
    setSubmitError(null);
    // The server is the book now — it re-validates the market, prices the
    // bet off the stored line, and can refuse (market just locked, stake
    // over budget) even when this form looked fine.
    const result = await placeWager(selection.market, selection.team.id, stake);
    setConfirming(false);
    if (result.ok) {
      setConfirmedWager(result.wager);
    } else {
      setSubmitError(result.error);
    }
  }

  if (confirmedWager) {
    return (
      <BetReceipt
        wager={confirmedWager}
        teamName={selection.team.name}
        opponentName={selection.opponentTeam.name}
        onClose={() => onOpenChange(false)}
      />
    );
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>Bet Slip</SheetTitle>
        <SheetDescription>Virtual FAAB only &mdash; no real-money value.</SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-4">
        <div className="rounded-lg border border-border bg-secondary p-3">
          <p className="text-xs text-muted-foreground">Betting on</p>
          <p className="text-lg font-semibold text-foreground">{selection.team.name}</p>
          <p className="text-xs text-muted-foreground">vs {selection.opponentTeam.name}</p>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-primary">
            {formatMoneyline(selection.moneyline)}
          </p>
        </div>

        {isLocked ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            This market is no longer accepting bets.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="stake">Stake (FAAB)</Label>
              <Input
                id="stake"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={stakeInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "" || /^\d+$/.test(raw)) {
                    setStakeInput(raw);
                  }
                }}
                aria-invalid={!!error}
                aria-describedby={error ? "stake-error" : undefined}
                className="font-mono text-lg tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                Available: {formatFaab(wallet.availableFaab)} FAAB
              </p>
              {error ? (
                <p id="stake-error" className="text-xs text-destructive">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Potential profit</span>
                <span className="font-mono font-semibold tabular-nums text-win-foreground">
                  {preview ? `+${formatFaab(preview.profit)}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Potential payout</span>
                <span className="font-mono font-semibold tabular-nums text-foreground">
                  {preview ? formatFaab(preview.payout) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Market locks</span>
                <span className="text-xs text-foreground">
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(selection.lockAt))}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <SheetFooter>
        {submitError ? (
          <p className="text-center text-xs text-destructive">{submitError}</p>
        ) : null}
        <Button
          size="lg"
          disabled={!hasValidStake || isLocked || confirming}
          onClick={handleConfirm}
        >
          {confirming ? "Placing bet…" : isLocked ? "Market Locked" : "Confirm Bet"}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Virtual FAAB only. This wager is not redeemable for cash or real-money value.
        </p>
      </SheetFooter>
    </>
  );
}
