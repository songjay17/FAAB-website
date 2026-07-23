import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import Link from "next/link";
import { formatFaab, formatMoneyline } from "@/lib/odds";
import type { Wager } from "@/lib/types";

export function BetReceipt({
  wager,
  teamName,
  opponentName,
  onClose,
}: {
  wager: Wager;
  teamName: string;
  opponentName: string;
  onClose: () => void;
}) {
  return (
    <>
      <SheetHeader className="items-center text-center">
        <CheckCircle2 className="size-10 text-win-foreground" />
        <SheetTitle className="text-lg">Bet Placed</SheetTitle>
      </SheetHeader>

      <div className="flex-1 space-y-4 px-4">
        <div className="rounded-lg border border-border bg-secondary p-4 text-center">
          <p className="text-xs text-muted-foreground">Potential payout</p>
          <p className="font-mono text-3xl font-bold tabular-nums text-foreground">
            {formatFaab(wager.potentialPayout)}
          </p>
        </div>

        <dl className="space-y-2 text-sm">
          <Row label="Team" value={teamName} />
          <Row label="Opponent" value={opponentName} />
          <Row label="Stake" value={`${formatFaab(wager.stakeFaab)} FAAB`} />
          <Row label="Moneyline" value={formatMoneyline(wager.moneylineAtBet)} />
          <Row label="Potential profit" value={`+${formatFaab(wager.potentialProfit)} FAAB`} />
          <Row
            label="Placed"
            value={new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(wager.placedAt))}
          />
          <Row label="Reference" value={wager.reference} mono />
        </dl>
      </div>

      <SheetFooter>
        <Button asChild size="lg">
          <Link href="/bets">View in My Bets</Link>
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Keep browsing
        </Button>
      </SheetFooter>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs tabular-nums text-muted-foreground" : "font-medium"}>
        {value}
      </dd>
    </div>
  );
}
