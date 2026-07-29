"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MarketStatusBadge } from "@/components/betting/market-status-badge";
import { useBetting } from "@/lib/state/betting-provider";
import { useSleeperData } from "@/lib/state/sleeper-data-provider";
import { mockMatchups } from "@/lib/mock-data";
import type { FantasyTeam } from "@/lib/types";

function teamName(teams: FantasyTeam[], teamId: string) {
  return teams.find((t) => t.id === teamId)?.name ?? teamId;
}

export function ManageMarketsCard({ icon: Icon }: { icon: LucideIcon }) {
  const { allMarkets, setMarketStatus } = useBetting();
  const { teams } = useSleeperData();

  // Only "open" and "locked" are commissioner-togglable here — "paused"
  // reads as a league-wide state (see the separate Pause Betting card) and
  // "settled" is an outcome of weekly settlement, not a manual toggle.
  const rows = allMarkets
    .filter((m) => m.status === "open" || m.status === "locked")
    .map((market) => ({
      market,
      matchup: mockMatchups.find((m) => m.id === market.matchupId),
    }))
    .filter((row) => row.matchup !== undefined)
    .sort((a, b) => a.matchup!.week - b.matchup!.week);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">Open or close a market</p>
            <p className="text-sm text-muted-foreground">
              Manually control whether a specific matchup accepts bets.
            </p>
          </div>
        </div>

        <Dialog>
          <DialogTrigger render={<Button variant="outline" size="sm" className="self-start" />}>
            Manage Markets
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Markets</DialogTitle>
              <DialogDescription>
                Locking a market immediately blocks new bets on that matchup; existing open
                wagers are unaffected.
              </DialogDescription>
            </DialogHeader>

            {rows.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No markets to manage right now.</p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto">
                {rows.map(({ market, matchup }) => (
                  <li
                    key={market.id}
                    data-testid="manageable-market-row"
                    data-matchup-id={market.matchupId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {teamName(teams, matchup!.homeTeamId)} vs {teamName(teams, matchup!.awayTeamId)}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          Week {matchup!.week}
                        </span>
                      </p>
                      <MarketStatusBadge status={market.status} />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setMarketStatus(market.matchupId, market.status === "open" ? "locked" : "open")
                      }
                    >
                      {market.status === "open" ? "Lock" : "Reopen"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <DialogFooter showCloseButton />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
