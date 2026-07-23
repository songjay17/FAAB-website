import { cn } from "@/lib/utils";
import type { WagerStatus } from "@/lib/types";

const statusConfig: Record<WagerStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-open-status text-open-status-foreground" },
  won: { label: "Won", className: "bg-win text-win-foreground" },
  lost: { label: "Lost", className: "bg-loss text-loss-foreground" },
  refunded: { label: "Refunded", className: "bg-refunded text-refunded-foreground" },
};

export function WagerStatusBadge({ status }: { status: WagerStatus }) {
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
