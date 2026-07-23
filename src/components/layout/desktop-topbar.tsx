"use client";

import { formatFaab } from "@/lib/odds";
import { useBetting } from "@/lib/state/betting-provider";

export function DesktopTopbar() {
  const { wallet } = useBetting();

  return (
    <header className="hidden h-16 items-center justify-end border-b border-border px-8 lg:flex">
      <div className="flex flex-col items-end leading-none">
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatFaab(wallet.availableFaab)}
        </span>
        <span className="text-xs text-muted-foreground">Available FAAB</span>
      </div>
    </header>
  );
}
