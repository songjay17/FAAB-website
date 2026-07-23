import { Card } from "@/components/ui/card";
import { WagerStatusBadge } from "./wager-status-badge";
import { formatFaab, formatMoneyline } from "@/lib/odds";
import type { Wager } from "@/lib/types";

export function WagerCard({
  wager,
  teamName,
  opponentName,
}: {
  wager: Wager;
  teamName: string;
  opponentName: string;
}) {
  const payoutLabel = wager.status === "open" ? "Potential payout" : "Payout";
  const payoutValue =
    wager.status === "open" ? wager.potentialPayout : (wager.finalPayout ?? 0);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Week {wager.week}</p>
          <p className="truncate font-semibold text-foreground">{teamName}</p>
          <p className="truncate text-xs text-muted-foreground">vs {opponentName}</p>
        </div>
        <WagerStatusBadge status={wager.status} />
      </div>
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
    </Card>
  );
}
