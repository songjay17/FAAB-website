import type { FaabWallet, LeagueMember, LeaderboardEntry, Wager, FantasyTeam } from "@/lib/types";

/** Profit/loss for one settled wager. Open, refunded (and voided, if ever added) contribute 0. */
function wagerProfitLoss(wager: Wager): number {
  if (wager.status === "won") {
    return (wager.finalPayout ?? 0) - wager.stakeFaab;
  }
  if (wager.status === "lost") {
    return -wager.stakeFaab;
  }
  return 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

type UnrankedEntry = Omit<LeaderboardEntry, "rank"> & { totalFaabWon: number };

/**
 * Builds one member's leaderboard row (unranked — `rank` is filled in by
 * `buildLeaderboard` after sorting). Pure function over the member's own
 * wallet/wager slice, same shape as `settleWagersForWeek` in settlement.ts.
 */
function buildEntry(input: {
  member: LeagueMember;
  team: FantasyTeam | undefined;
  wallet: FaabWallet | undefined;
  wagers: Wager[];
}): UnrankedEntry {
  const { member, team, wallet, wagers } = input;

  // Total bankroll: FAAB the member owns, whether or not it's currently
  // reserved in an open wager. An open wager shouldn't look like a loss.
  const faabBalance = wallet ? round2(wallet.availableFaab + wallet.reservedFaab) : 0;

  const totalWagered = round2(wagers.reduce((sum, w) => sum + w.stakeFaab, 0));

  const won = wagers.filter((w) => w.status === "won");
  const lost = wagers.filter((w) => w.status === "lost");
  const decided = [...won, ...lost];

  const seasonProfitLoss = round2(decided.reduce((sum, w) => sum + wagerProfitLoss(w), 0));

  const winPercent = decided.length === 0 ? 0 : Math.round((won.length / decided.length) * 100);

  const largestWin = won.length === 0 ? 0 : round2(Math.max(...won.map(wagerProfitLoss)));
  const totalFaabWon = round2(won.reduce((sum, w) => sum + wagerProfitLoss(w), 0));

  const decidedStakeTotal = round2(decided.reduce((sum, w) => sum + w.stakeFaab, 0));
  const returnOnWagered = decidedStakeTotal === 0 ? 0 : round2(seasonProfitLoss / decidedStakeTotal);

  return {
    memberId: member.id,
    displayName: member.displayName,
    teamName: team?.name ?? "—",
    faabBalance,
    seasonProfitLoss,
    totalWagered,
    betsWon: won.length,
    betsLost: lost.length,
    winPercent,
    largestWin,
    currentStreak: currentStreak(decided),
    returnOnWagered,
    totalFaabWon,
  };
}

/**
 * Current consecutive win/loss streak, most-recent-first. Refunded and open
 * wagers are excluded entirely (they neither break nor extend a streak).
 * Ordered by settledAt, falling back to placedAt, then id for a fully
 * deterministic order when timestamps tie.
 */
function currentStreak(decided: Wager[]): string {
  if (decided.length === 0) return "—";

  const ordered = [...decided].sort((a, b) => {
    const aTime = a.settledAt ?? a.placedAt;
    const bTime = b.settledAt ?? b.placedAt;
    if (aTime !== bTime) return bTime.localeCompare(aTime);
    return b.id.localeCompare(a.id);
  });

  const mostRecentStatus = ordered[0].status;
  let count = 0;
  for (const wager of ordered) {
    if (wager.status !== mostRecentStatus) break;
    count += 1;
  }

  return `${mostRecentStatus === "won" ? "W" : "L"}${count}`;
}

/**
 * Deterministic ranking: FAAB balance desc, then season P/L desc, then
 * total FAAB won (sum of profit on won wagers) desc, then display name asc.
 */
function compareEntries(a: UnrankedEntry, b: UnrankedEntry): number {
  if (a.faabBalance !== b.faabBalance) return b.faabBalance - a.faabBalance;
  if (a.seasonProfitLoss !== b.seasonProfitLoss) return b.seasonProfitLoss - a.seasonProfitLoss;
  if (a.totalFaabWon !== b.totalFaabWon) return b.totalFaabWon - a.totalFaabWon;
  return a.displayName.localeCompare(b.displayName);
}

/**
 * Derives the full leaderboard from live application state — wallets and
 * wagers are the single source of truth, no separately maintained stats.
 * `scope: "week"` restricts wager-derived stats (P/L, wagered, W-L, streak,
 * ROI) to the given week; `faabBalance` always reflects the member's current
 * overall wallet, since this app doesn't keep historical wallet snapshots.
 */
export function buildLeaderboard(input: {
  scope: "week" | "season";
  week: number;
  members: LeagueMember[];
  teams: FantasyTeam[];
  wallets: FaabWallet[];
  wagers: Wager[];
}): LeaderboardEntry[] {
  const { scope, week, members, teams, wallets, wagers } = input;
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const walletByMember = new Map(wallets.map((w) => [w.memberId, w]));

  const unranked = members.map((member) => {
    const memberWagers = wagers.filter(
      (w) => w.memberId === member.id && (scope === "season" || w.week === week)
    );
    return buildEntry({
      member,
      team: teamById.get(member.teamId),
      wallet: walletByMember.get(member.id),
      wagers: memberWagers,
    });
  });

  const sorted = [...unranked].sort(compareEntries);

  return sorted.map((entry, index) => ({
    memberId: entry.memberId,
    displayName: entry.displayName,
    teamName: entry.teamName,
    faabBalance: entry.faabBalance,
    seasonProfitLoss: entry.seasonProfitLoss,
    totalWagered: entry.totalWagered,
    betsWon: entry.betsWon,
    betsLost: entry.betsLost,
    winPercent: entry.winPercent,
    largestWin: entry.largestWin,
    currentStreak: entry.currentStreak,
    returnOnWagered: entry.returnOnWagered,
    rank: index + 1,
  }));
}
