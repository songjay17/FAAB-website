import type { BettingMarket, Wager } from "./betting";
import type { FaabWallet } from "./wallet";

/**
 * The shared betting book for one league — the server's response shape for
 * GET /api/book and the state every mutation route returns after applying
 * its change. Same data the old localStorage BettingState held, but now a
 * single league-wide truth.
 */
export type Book = {
  leagueId: string;
  wallets: FaabWallet[];
  wagers: Wager[];
  markets: BettingMarket[];
};
