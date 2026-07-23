import type { FaabWallet } from "@/lib/types";

// availableFaab is derived so the books balance: totalBudget + seasonProfitLoss
// (net winnings/losses so far) minus whatever's currently reserved in open bets.
export const mockWallets: FaabWallet[] = [
  {
    memberId: "member-1",
    totalBudget: 1000,
    availableFaab: 1063,
    reservedFaab: 110,
    weeklyProfitLoss: 38,
    seasonProfitLoss: 173,
  },
  {
    memberId: "member-2",
    totalBudget: 1000,
    availableFaab: 1170,
    reservedFaab: 40,
    weeklyProfitLoss: -12,
    seasonProfitLoss: 210,
  },
  {
    memberId: "member-3",
    totalBudget: 1000,
    availableFaab: 1070,
    reservedFaab: 25,
    weeklyProfitLoss: 60,
    seasonProfitLoss: 95,
  },
  {
    memberId: "member-4",
    totalBudget: 1000,
    availableFaab: 860,
    reservedFaab: 0,
    weeklyProfitLoss: -30,
    seasonProfitLoss: -140,
  },
  {
    memberId: "member-5",
    totalBudget: 1000,
    availableFaab: 990,
    reservedFaab: 50,
    weeklyProfitLoss: 15,
    seasonProfitLoss: 40,
  },
  {
    memberId: "member-6",
    totalBudget: 1000,
    availableFaab: 720,
    reservedFaab: 0,
    weeklyProfitLoss: -20,
    seasonProfitLoss: -280,
  },
  {
    memberId: "member-7",
    totalBudget: 1000,
    availableFaab: 875,
    reservedFaab: 30,
    weeklyProfitLoss: -5,
    seasonProfitLoss: -95,
  },
  {
    memberId: "member-8",
    totalBudget: 1000,
    availableFaab: 680,
    reservedFaab: 0,
    weeklyProfitLoss: -45,
    seasonProfitLoss: -320,
  },
];
