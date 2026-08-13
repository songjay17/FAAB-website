import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatFaab } from "@/lib/odds";
import type { FaabWallet } from "@/lib/types";

export function FaabBalanceCard({
  wallet,
  variant = "full",
}: {
  wallet: FaabWallet;
  variant?: "full" | "compact";
}) {
  const weeklyPositive = wallet.weeklyProfitLoss >= 0;
  const seasonPositive = wallet.seasonProfitLoss >= 0;

  return (
    <Card>
      <CardContent
        className={cn(
          "grid gap-6",
          variant === "full" ? "sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-5"
        )}
      >
        <div>
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            Available to Bet
          </div>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-foreground lg:text-4xl">
            {formatFaab(wallet.availableFaab)}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            Reserved
            <Tooltip>
              <TooltipTrigger aria-label="What is reserved FAAB?">
                <Info className="size-3" />
              </TooltipTrigger>
              <TooltipContent>
                FAAB locked in your open bets &mdash; returned if you win, forfeited if you
                lose.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-muted-foreground">
            {formatFaab(wallet.reservedFaab)}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            Sleeper Waivers
            <Tooltip>
              <TooltipTrigger aria-label="What is Sleeper waiver spend?">
                <Info className="size-3" />
              </TooltipTrigger>
              <TooltipContent>
                Real FAAB you&apos;ve spent on waiver claims in Sleeper. Already subtracted
                from Available to Bet &mdash; shown here so the deduction isn&apos;t hidden.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-muted-foreground">
            {formatFaab(wallet.sleeperWaiverSpend)}
          </p>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Weekly P/L</div>
          <p
            className={cn(
              "mt-1 font-mono text-xl font-semibold tabular-nums",
              wallet.weeklyProfitLoss === 0
                ? "text-muted-foreground"
                : weeklyPositive
                  ? "text-win-foreground"
                  : "text-loss-foreground"
            )}
          >
            {weeklyPositive ? "+" : ""}
            {formatFaab(wallet.weeklyProfitLoss)}
          </p>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">Season P/L</div>
          <p
            className={cn(
              "mt-1 font-mono text-xl font-semibold tabular-nums",
              wallet.seasonProfitLoss === 0
                ? "text-muted-foreground"
                : seasonPositive
                  ? "text-win-foreground"
                  : "text-loss-foreground"
            )}
          >
            {seasonPositive ? "+" : ""}
            {formatFaab(wallet.seasonProfitLoss)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
