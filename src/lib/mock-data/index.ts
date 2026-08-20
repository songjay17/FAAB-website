export * from "./wallets";
export * from "./wagers";

// These hand-authored demo wallets/wagers no longer seed the app — the book
// lives server-side in Postgres and bootstraps fresh, full-budget wallets
// (see src/lib/server/book.ts). They remain as the seed state for the e2e
// suite's in-memory book stub (e2e/fixtures.ts), which is why their wager
// matchup ids still align with the recorded 2025 fixtures.
