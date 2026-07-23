import { cn } from "@/lib/utils";
import { formatFaab } from "@/lib/odds";
import type { LeaderboardEntry } from "@/lib/types";

function ProfitLoss({ value }: { value: number }) {
  const positive = value > 0;
  const zero = value === 0;
  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        zero ? "text-muted-foreground" : positive ? "text-win-foreground" : "text-loss-foreground"
      )}
    >
      {positive ? "+" : ""}
      {formatFaab(value)}
    </span>
  );
}

export function LeaderboardTable({
  entries,
  currentMemberId,
}: {
  entries: LeaderboardEntry[];
  currentMemberId: string;
}) {
  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-border lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Rank</th>
              <th className="px-4 py-2.5 font-medium">Member</th>
              <th className="px-4 py-2.5 font-medium">FAAB Balance</th>
              <th className="px-4 py-2.5 font-medium">Season P/L</th>
              <th className="px-4 py-2.5 font-medium">Wagered</th>
              <th className="px-4 py-2.5 font-medium">W-L</th>
              <th className="px-4 py-2.5 font-medium">Win%</th>
              <th className="px-4 py-2.5 font-medium">Largest Win</th>
              <th className="px-4 py-2.5 font-medium">Streak</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.memberId}
                className={cn(
                  "border-b border-border/60 last:border-0",
                  entry.memberId === currentMemberId && "bg-open-status/40"
                )}
              >
                <td className="px-4 py-3 font-mono font-semibold tabular-nums">
                  #{entry.rank}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{entry.displayName}</p>
                  <p className="text-xs text-muted-foreground">{entry.teamName}</p>
                </td>
                <td className="px-4 py-3 font-mono font-semibold tabular-nums">
                  {formatFaab(entry.faabBalance)}
                </td>
                <td className="px-4 py-3">
                  <ProfitLoss value={entry.seasonProfitLoss} />
                </td>
                <td className="px-4 py-3 font-mono text-muted-foreground tabular-nums">
                  {formatFaab(entry.totalWagered)}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                  {entry.betsWon}-{entry.betsLost}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                  {entry.winPercent}%
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                  {formatFaab(entry.largestWin)}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                  {entry.currentStreak}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="space-y-3 lg:hidden">
        {entries.map((entry) => (
          <div
            key={entry.memberId}
            className={cn(
              "rounded-lg border border-border p-4",
              entry.memberId === currentMemberId && "border-primary/50 bg-open-status/40"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold tabular-nums text-muted-foreground">
                  #{entry.rank}
                </span>
                <div>
                  <p className="font-medium text-foreground">{entry.displayName}</p>
                  <p className="text-xs text-muted-foreground">{entry.teamName}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-bold tabular-nums">
                  {formatFaab(entry.faabBalance)}
                </p>
                <ProfitLoss value={entry.seasonProfitLoss} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center text-xs">
              <div>
                <p className="text-muted-foreground">W-L</p>
                <p className="font-mono font-medium tabular-nums">
                  {entry.betsWon}-{entry.betsLost}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Win%</p>
                <p className="font-mono font-medium tabular-nums">{entry.winPercent}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Streak</p>
                <p className="font-mono font-medium tabular-nums">{entry.currentStreak}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
