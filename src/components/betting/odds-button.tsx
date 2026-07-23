"use client";

import { cn } from "@/lib/utils";
import { formatMoneyline } from "@/lib/odds";

export function OddsButton({
  teamName,
  moneyline,
  selected,
  disabled,
  onSelect,
}: {
  teamName: string;
  moneyline: number;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  const isFavorite = moneyline < 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-md border px-3 py-2 transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-primary bg-primary/15"
          : "border-border bg-secondary hover:bg-accent"
      )}
      aria-pressed={selected}
      aria-label={`Bet on ${teamName}, moneyline ${formatMoneyline(moneyline)}`}
    >
      <span
        className={cn(
          "font-mono text-lg font-bold tabular-nums",
          isFavorite ? "text-favorite" : "text-underdog"
        )}
      >
        {formatMoneyline(moneyline)}
      </span>
    </button>
  );
}
