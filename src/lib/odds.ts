/** American moneyline -> implied win probability (0-1). Negative = favorite, positive = underdog. */
export function impliedProbability(moneyline: number): number {
  if (moneyline < 0) {
    return -moneyline / (-moneyline + 100);
  }
  return 100 / (moneyline + 100);
}

/** Profit only (excludes returned stake) for a given stake at a given moneyline. */
export function calculateProfit(stakeFaab: number, moneyline: number): number {
  if (moneyline < 0) {
    return stakeFaab * (100 / -moneyline);
  }
  return stakeFaab * (moneyline / 100);
}

/** Total payout = stake + profit. */
export function calculatePayout(stakeFaab: number, moneyline: number): number {
  return stakeFaab + calculateProfit(stakeFaab, moneyline);
}

export type WagerPreview = {
  impliedProbability: number;
  profit: number;
  payout: number;
};

/** Convenience bundle for the Bet Slip UI: computes all three at once from user input. */
export function calculateWagerPreview(stakeFaab: number, moneyline: number): WagerPreview {
  return {
    impliedProbability: impliedProbability(moneyline),
    profit: calculateProfit(stakeFaab, moneyline),
    payout: calculatePayout(stakeFaab, moneyline),
  };
}

/** Validates a whole-number FAAB stake against the member's available balance. Returns an error message, or null if valid. */
export function validateStake(stakeInput: string, availableFaab: number): string | null {
  if (stakeInput.trim() === "") {
    return null;
  }
  const stake = Number(stakeInput);
  if (!Number.isFinite(stake)) {
    return "Enter a valid number.";
  }
  if (!Number.isInteger(stake)) {
    return "Stake must be a whole number.";
  }
  if (stake <= 0) {
    return "Stake must be greater than 0.";
  }
  if (stake > availableFaab) {
    return "Stake exceeds your available FAAB.";
  }
  return null;
}

export function formatMoneyline(moneyline: number): string {
  return moneyline > 0 ? `+${moneyline}` : `${moneyline}`;
}

export function formatFaab(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
