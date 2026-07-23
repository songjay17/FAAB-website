"use client";

import { formatFaab } from "@/lib/odds";
import { mockLeague } from "@/lib/mock-data";
import { useBetting } from "@/lib/state/betting-provider";

export function MobileTopbar() {
  const { wallet } = useBetting();

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
      <div className="flex items-center gap-2">
        <span className="text-lg">🏈</span>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold">{mockLeague.name}</span>
          <span className="text-[11px] text-muted-foreground">Week {mockLeague.currentWeek}</span>
        </div>
      </div>
      <div className="flex flex-col items-end leading-none">
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatFaab(wallet.availableFaab)}
        </span>
        <span className="text-[11px] text-muted-foreground">Available FAAB</span>
      </div>
    </header>
  );
}
