import type { FaabWallet } from "@/lib/types";

// Scaled to the real "JHU Lads" Sleeper league's actual FAAB budget (100/team,
// see League.waiverBudget) rather than an arbitrary round number — this app's
// betting pool and the league's real waiver budget are the same 100 units,
// per the FAAB reconciliation design (see reconcileWaiverSpend in
// settlement.ts). availableFaab is derived so the books balance: totalBudget
// + seasonProfitLoss (net winnings/losses so far) minus whatever's currently
// reserved in open bets. sleeperWaiverSpend starts at 0 for every wallet —
// each member's real waiver spend is applied by reconcileWaiverSpend the
// first time the app loads, not baked into the seed, so that deduction is
// visible and independently testable rather than silently pre-applied.
// reservedFaab per member must equal the sum of that member's currently-open
// wager stakes in mock-data/wagers.ts — only members 975162996680945664
// (110: wager-1's 50 + wager-2's 25 + wager-8's 35) and 984151623574323200
// (20, wager-12) have open wagers; everyone else is 0.
export const mockWallets: FaabWallet[] = [
  {
    memberId: "975162996680945664",
    totalBudget: 100,
    availableFaab: 12,
    reservedFaab: 110,
    weeklyProfitLoss: 4,
    seasonProfitLoss: 22,
    sleeperWaiverSpend: 0,
  },
  {
    memberId: "984151623574323200",
    totalBudget: 100,
    availableFaab: 101,
    reservedFaab: 20,
    weeklyProfitLoss: -1,
    seasonProfitLoss: 21,
    sleeperWaiverSpend: 0,
  },
  {
    memberId: "984156047625523200",
    totalBudget: 100,
    availableFaab: 110,
    reservedFaab: 0,
    weeklyProfitLoss: 6,
    seasonProfitLoss: 10,
    sleeperWaiverSpend: 0,
  },
  {
    memberId: "594590141419405312",
    totalBudget: 100,
    availableFaab: 86,
    reservedFaab: 0,
    weeklyProfitLoss: -3,
    seasonProfitLoss: -14,
    sleeperWaiverSpend: 0,
  },
  {
    memberId: "984230356897337344",
    totalBudget: 100,
    availableFaab: 104,
    reservedFaab: 0,
    weeklyProfitLoss: 2,
    seasonProfitLoss: 4,
    sleeperWaiverSpend: 0,
  },
  {
    memberId: "987034877151293440",
    totalBudget: 100,
    availableFaab: 72,
    reservedFaab: 0,
    weeklyProfitLoss: -2,
    seasonProfitLoss: -28,
    sleeperWaiverSpend: 0,
  },
  {
    memberId: "990743597525831680",
    totalBudget: 100,
    availableFaab: 90,
    reservedFaab: 0,
    weeklyProfitLoss: -1,
    seasonProfitLoss: -10,
    sleeperWaiverSpend: 0,
  },
  {
    memberId: "990745711383805952",
    totalBudget: 100,
    availableFaab: 68,
    reservedFaab: 0,
    weeklyProfitLoss: -5,
    seasonProfitLoss: -32,
    sleeperWaiverSpend: 0,
  },
];
