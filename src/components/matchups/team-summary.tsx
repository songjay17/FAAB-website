import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/odds";
import type { FantasyTeam } from "@/lib/types";

export function TeamSummary({
  team,
  ownerName,
  projectedPoints,
  winProbability,
  align = "left",
}: {
  team: FantasyTeam;
  ownerName: string;
  projectedPoints: number;
  winProbability: number;
  align?: "left" | "right";
}) {
  return (
    <div className={cn("flex items-start gap-3", align === "right" && "flex-row-reverse text-right")}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xl">
        {team.logoEmoji}
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-foreground">{team.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {ownerName} &middot; {team.record.wins}-{team.record.losses}
          {team.record.ties ? `-${team.record.ties}` : ""}
        </p>
        <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">
          {projectedPoints.toFixed(1)} proj &middot; {formatPercent(winProbability)} WP
        </p>
      </div>
    </div>
  );
}
