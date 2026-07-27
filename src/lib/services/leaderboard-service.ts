import type { FaabWallet, LeaderboardEntry, Wager } from "@/lib/types";
import { mockLeague, mockMembers, mockTeams } from "@/lib/mock-data";
import { buildLeaderboard } from "@/lib/state/leaderboard";

/**
 * Derives the leaderboard from live betting state (wallets/wagers), the
 * single source of truth — see src/lib/state/leaderboard.ts. Callers get
 * `wallets`/`wagers` from `useBetting()`'s `allWallets`/`allWagers`, since
 * this data lives in React context rather than static mock exports.
 */
export async function getLeaderboard(
  scope: "week" | "season",
  wallets: FaabWallet[],
  wagers: Wager[]
): Promise<LeaderboardEntry[]> {
  return buildLeaderboard({
    scope,
    week: mockLeague.currentWeek,
    members: mockMembers,
    teams: mockTeams,
    wallets,
    wagers,
  });
}
