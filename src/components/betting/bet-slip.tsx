"use client";

import { useEffect, useState } from "react";
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
  const { wallet, placeWager } = useBetting();
  const [stakeInput, setStakeInput] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmedWager, setConfirmedWager] = useState<Wager | null>(null);

  useEffect(() => {
    if (open) {
      setStakeInput("");
      setConfirmedWager(null);
      setConfirming(false);
    }
  }, [open, selection?.market.id, selection?.team.id]);

  if (!selection) return null;

  const stake = Number(stakeInput);
  const error = validateStake(stakeInput, wallet.availableFaab);
  const hasValidStake = stakeInput.trim() !== "" && !error;
  const preview = hasValidStake
    ? calculateWagerPreview(stake, selection.moneyline)
    : null;
  const isLocked = selection.market.status !== "open";

  function handleConfirm() {
    if (!hasValidStake || !selection || isLocked) return;
    setConfirming(true);
    // Brief simulated-processing delay so confirmation feels like a real
    // transaction rather than an instant no-op click.
    setTimeout(() => {
      const wager = placeWager(
        selection.market,
        selection.team.id,
        selection.opponentTeam.id,
        selection.week,
        selection.moneyline,
        stake
      );
      setConfirmedWager(wager);
      setConfirming(false);
    }, 450);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        {confirmedWager ? (
          <BetReceipt
            wager={confirmedWager}
            teamName={selection.team.name}
            opponentName={selection.opponentTeam.name}
            onClose={() => onOpenChange(false)}
          />
        ) : (
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
                      className="font-mono text-lg tabular-nums"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available: {formatFaab(wallet.availableFaab)} FAAB
                    </p>
                    {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
        )}
      </SheetContent>
    </Sheet>
  );
}
