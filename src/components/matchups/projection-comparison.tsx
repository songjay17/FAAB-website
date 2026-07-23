export function ProjectionComparison({
  homeName,
  awayName,
  homeProjected,
  awayProjected,
}: {
  homeName: string;
  awayName: string;
  homeProjected: number;
  awayProjected: number;
}) {
  const total = homeProjected + awayProjected;
  const homePercent = total > 0 ? (homeProjected / total) * 100 : 50;

  return (
    <div>
      <div className="flex items-center justify-between font-mono text-2xl font-bold tabular-nums">
        <span>{homeProjected.toFixed(1)}</span>
        <span className="text-sm font-medium text-muted-foreground">proj. points</span>
        <span>{awayProjected.toFixed(1)}</span>
      </div>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-secondary">
        <div className="bg-primary" style={{ width: `${homePercent}%` }} />
        <div className="flex-1 bg-underdog/60" />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{homeName}</span>
        <span>{awayName}</span>
      </div>
    </div>
  );
}
