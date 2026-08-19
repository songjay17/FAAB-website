export * from "./wallets";
export * from "./wagers";

// The Sleeper league the mock wallets/wagers were authored against — their
// wager matchup ids, stakes, and P/L only make sense on that league's real
// 2025 matchups. Any other league (e.g. a season rollover's successor)
// seeds fresh empty wallets instead of this demo state.
export const MOCK_SEED_LEAGUE_ID = "1230632258184957952";
