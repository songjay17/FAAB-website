import type { FaabWallet, FantasyTeam, LeagueMember, LeaderboardEntry, Wager } from "@/lib/types";
import { buildLeaderboard } from "@/lib/state/leaderboard";

/**
 * Derives the leaderboard from live betting state (wallets/wagers), the
 * single source of truth — see src/lib/state/leaderboard.ts. Callers get
 * `wallets`/`wagers` from `useBetting()`'s `allWallets`/`allWagers` and
 * `members`/`teams` from `useSleeperData()`, since neither lives in a static
 * mock export anymore.
 */
export async function getLeaderboard(
  scope: "week" | "season",
  wallets: FaabWallet[],
  wagers: Wager[],
  members: LeagueMember[],
  teams: FantasyTeam[],
  week: number
): Promise<LeaderboardEntry[]> {
  return buildLeaderboard({
    scope,
    week,
    members,
    teams,
    wallets,
    wagers,
  });
}
