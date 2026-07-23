import { cn } from "@/lib/utils";
import type { MarketStatus } from "@/lib/types";

const statusConfig: Record<MarketStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-open-status text-open-status-foreground" },
  locked: { label: "Locked", className: "bg-muted text-muted-foreground" },
  paused: { label: "Paused", className: "bg-paused text-paused-foreground" },
  settled: { label: "Settled", className: "bg-muted text-muted-foreground" },
};

export function MarketStatusBadge({ status }: { status: MarketStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
