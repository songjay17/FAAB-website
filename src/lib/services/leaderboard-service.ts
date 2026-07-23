import type { LeaderboardEntry } from "@/lib/types";
import { mockLeaderboardSeason, mockLeaderboardWeek } from "@/lib/mock-data";

export async function getLeaderboard(scope: "week" | "season"): Promise<LeaderboardEntry[]> {
  return scope === "week" ? mockLeaderboardWeek : mockLeaderboardSeason;
}
