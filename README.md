This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## QA pass — complete

Manual QA using Playwright MCP for real-browser verification (not just code inspection). All 7 tracked items resolved:

1. ~~**URL param edge cases on `/matchups`**~~ — 🐛 fixed: `?week=abc` produced a permanently-stuck loading state (`NaN !== NaN` never resolves `loading` to `false`); non-integer week params now fall back to the current week. `?week=-1` / `?week=999` already degraded gracefully into the existing "not posted" empty state.
2. ~~**"Reset demo data" flow**~~ — ✅ verified: confirm dialog opens correctly, resets wallet/wagers to seed state, no leftover UI
3. ~~**Bet-slip behavior at/past a matchup's lock time**~~ — ✅ verified: locked markets disable odds buttons everywhere (matchup card + detail page) and show "This market is no longer accepting bets," so the bet slip can never open on a locked market in the first place
4. ~~**Leaderboard and League page interactive elements**~~ — ✅ verified: Leaderboard's This Week/Season tabs, League's schedule links, and the mobile Commissioner Tools card all work correctly
5. ~~**Rapid double-click on "Confirm Bet"**~~ — ✅ verified safe: button disables synchronously on first click, second simultaneous click is rejected; exactly one wager created, wallet deducted once
6. ~~**Browser back/forward mid-bet-flow**~~ — ✅ verified safe: navigating away mid-flow cleanly discards the unsubmitted bet slip, no leaked dialog, no corrupted state
7. ~~**My Bets tab filtering**~~ — ✅ verified: Open/Won/Lost/Refunded/All tabs all show accurate, non-duplicated wager data

Also fixed earlier in this pass: a Base UI `nativeButton` console error on every link-rendered button, and a missing desktop wallet balance display (now in a top-right topbar).

Wager settlement (won/lost/refunded, FAAB payouts, weekly & season P&L) shipped in [#8](https://github.com/songjay17/FAAB-website/pull/8).

## Next up

- [x] Real leaderboard/stat wiring — connect the Leaderboard page to live wallet/wager state instead of static mock rows (shipped in [#9](https://github.com/songjay17/FAAB-website/pull/9))
- [ ] **[IMPORTANT] Reconcile with real Sleeper FAAB spend** — waiver claims made in the actual Sleeper app change a member's true remaining FAAB independently of bets placed here, and this app's balance will silently drift out of sync unless something reconciles the two. Needs: a sync mechanism (poll/webhook/manual) pulling each member's Sleeper waiver spend, re-deriving `availableFaab` from it (`sleeperRemainingFaab - reservedFaab`), and a decision on whether waiver spend should affect leaderboard P/L (leaning no — it should shrink balance like a settled loss without counting as a wager outcome). Also needs a plan for claims landing mid-week while wagers are open.
- [x] Manual void/refund controls — commissioner override for an individual wager, independent of automatic settlement (shipped in [#11](https://github.com/songjay17/FAAB-website/pull/11))
- [x] Browsing past weeks' results — Leaderboard's "This Week" view and My Bets now support navigating to any past week with seeded data, not just the current one (shipped in [#12](https://github.com/songjay17/FAAB-website/pull/12))
- [x] Market open/close controls — commissioner can now lock/unlock an individual matchup's betting market; markets moved from static mock data into live `BettingProvider` state so the toggle takes effect immediately everywhere `market.status` gates bet placement (shipped in [#13](https://github.com/songjay17/FAAB-website/pull/13))
- [x] Self-serve bet cancellation and wager detail — My Bets/Dashboard wager cards are now clickable and expand in place to show reference #, placed time, and lock time. Members can cancel their own bet for a full refund within a short grace window after placing it (misclick protection only — real sportsbooks don't let you unwind a bet just because news breaks, e.g. an injury, since that's exactly what the odds already price in). Separate from the commissioner's void, which works on any open bet at any time and requires a logged reason.
- [x] Collusion-resistant odds calculation — odds are now derived from each team's full-roster optimal (best-possible) lineup (`getOptimalLineup` in `src/lib/state/optimal-lineup.ts`: QB/RB/RB/WR/WR/TE/FLEX/K/DEF, FLEX eligible for RB/WR/TE, provably optimal greedy fill), not whatever lineup happens to be set — an owner can't tank their started lineup to manufacture bad odds for a colluding bettor to profit from, since the calc always assumes the roster's best players are in. Added bench players to mock rosters so this is demonstrable. **Odds-freeze note:** rosters are still static mock data with no editing UI, so odds are already computed once at load and never recomputed — freezing is satisfied by construction today. Once rosters become mutable (Sleeper integration or a lineup editor), odds must be explicitly snapshotted at market-open time so no later roster change can move an already-posted line — don't lose this when that lands.
- [x] Persistent local mock state and reset controls — audited: wallets/wagers/markets already persist to `localStorage` and "Reset demo data" already restores clean seed state (both worked correctly going into this pass). The one real gap: wager reference numbers (`JHL-####`) were generated from a module-level counter that reset to `1000` on every page load, so a reload followed by a new bet could reissue a reference already used by an earlier-session wager sitting in storage. Fixed by deriving the next reference from the highest one already in persisted state instead of an in-memory counter.
- [x] Sleeper read-only integration — league/team/member data, per-week matchups, and betting markets are now all generated from real Sleeper API data (with FantasyPros projections feeding the optimal-lineup odds calc) instead of hand-authored mocks; `wager-service.ts` and the last hand-authored mock files (`league.ts`, `teams.ts`, `matchups.ts`, `markets.ts`) are deleted. Shipped across [#16](https://github.com/songjay17/FAAB-website/pull/16)–[#20](https://github.com/songjay17/FAAB-website/pull/20). Wallets and wagers are still seeded mock data layered on top of the real rosters/matchups — that's what the FAAB reconciliation item above needs to replace.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
