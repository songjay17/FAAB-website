import type { FaabWallet } from "@/lib/types";

// availableFaab is derived so the books balance: totalBudget + seasonProfitLoss
// (net winnings/losses so far) minus whatever's currently reserved in open bets.
export const mockWallets: FaabWallet[] = [
  {
    memberId: "975162996680945664",
    totalBudget: 1000,
    availableFaab: 1063,
    reservedFaab: 110,
    weeklyProfitLoss: 38,
    seasonProfitLoss: 173,
  },
  {
    memberId: "984151623574323200",
    totalBudget: 1000,
    availableFaab: 1170,
    reservedFaab: 40,
    weeklyProfitLoss: -12,
    seasonProfitLoss: 210,
  },
  {
    memberId: "984156047625523200",
    totalBudget: 1000,
    availableFaab: 1070,
    reservedFaab: 25,
    weeklyProfitLoss: 60,
    seasonProfitLoss: 95,
  },
  {
    memberId: "594590141419405312",
    totalBudget: 1000,
    availableFaab: 860,
    reservedFaab: 0,
    weeklyProfitLoss: -30,
    seasonProfitLoss: -140,
  },
  {
    memberId: "984230356897337344",
    totalBudget: 1000,
    availableFaab: 990,
    reservedFaab: 50,
    weeklyProfitLoss: 15,
    seasonProfitLoss: 40,
  },
  {
    memberId: "987034877151293440",
    totalBudget: 1000,
    availableFaab: 720,
    reservedFaab: 0,
    weeklyProfitLoss: -20,
    seasonProfitLoss: -280,
  },
  {
    memberId: "990743597525831680",
    totalBudget: 1000,
    availableFaab: 875,
    reservedFaab: 30,
    weeklyProfitLoss: -5,
    seasonProfitLoss: -95,
  },
  {
    memberId: "990745711383805952",
    totalBudget: 1000,
    availableFaab: 680,
    reservedFaab: 0,
    weeklyProfitLoss: -45,
    seasonProfitLoss: -320,
  },
];
