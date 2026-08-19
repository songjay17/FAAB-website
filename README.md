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

- [x] **Deterministic e2e suite** — Playwright now stubs every Sleeper API and `/api/projections` request with recorded fixtures (`e2e/fixtures/`, served via `page.route()` in `e2e/fixtures.ts`), patched to a frozen mid-season snapshot: current week 7, weeks 1–6 settled, zero real waiver spend. The suite had gone 26/38 red purely from reality drift — the live 2025 league finished (`status: complete`, `last_scored_leg: 17`) and real FAAB spend maxed out, so reconciliation correctly zeroed the demo wallets and every bet-placing test died. Specs were also still using mock-era names ("Puka Shells", "Diggs My Grave", "Justin") that no longer exist; realigned to real Sleeper display/team names and stakes that fit the 100-unit budget. Seed `wager-8` now picks roster-7, the real winner of matchup 6-5, keeping the winning-settlement e2e path intact.
- [ ] **Snapshot odds at market open** — rosters are now live Sleeper data, so posted lines can drift between page loads as real rosters change; the odds-freeze caveat below is a real gap now, not a future one.
- [ ] **Real matchup lock times** — `WeeklyMatchup.lockAt` is still an epoch placeholder (Sleeper exposes no kickoff times); once betting is live in 2026, lock should track the week's first game kickoff instead of relying purely on manual/season-phase market locking.
- [ ] **Wallet reset on season rollover** — when the app auto-switches to the 2026 league, persisted wallets still carry 2025's drained balances and waiver spend ("Reset demo data" clears them manually). Seed fresh wallets when `League.id` changes, or fold this into the shared-persistence backend below.
- [ ] **Shared persistence and identity** — wallets/wagers are still per-browser seeded mock state; real league use needs a backend (or hosted store) plus member identity so everyone sees the same book.

### Done

- [x] **Offseason/season-complete UX** — `League` now carries a `seasonPhase` ("upcoming" | "in_season" | "complete") mapped from Sleeper's league status. Outside a live season every betting market is forced locked on seed *and* on localStorage hydrate (`BettingProvider`), so odds buttons/bet slip shut down everywhere `market.status` already gates. The dashboard swaps the dead betting UI for a season-status hero (`SeasonStatusCard`): season-complete shows the real champion (from `metadata.latest_league_winner_roster_id`), a betting-closed note, and a link to final standings; pre-season shows "hasn't kicked off yet". Topbars show "2025 · Final"/"Preseason" instead of a stale week number, and past weeks stay fully browsable.
- [x] **2026 league rollover** — `resolveCurrentLeague` (`src/lib/sleeper/resolve-league.ts`) walks the configured league forward each load: Sleeper only links renewals backward (`previous_league_id` on the *new* league), so it finds the successor by listing a member's leagues for the next season and matching that field, hopping one season at a time until it reaches the season in play (multi-year catch-up works). A successor still in pre_draft/drafting isn't switched to — its rosters are empty — but surfaces as `League.upcomingSeason` ("The 2026 league is already set up…"); the app switches automatically once the new season is in_season. The configured `NEXT_PUBLIC_SLEEPER_LEAGUE_ID` never needs a yearly bump.
- [x] **Fix `currentWeek` source** — `deriveCurrentWeek` (`src/lib/sleeper/mappers.ts`) combines `/v1/state/nfl` with league status: complete seasons pin to their last scored week, un-started leagues to week 1 (including drafted leagues during the NFL preseason, where `display_week` counts preseason weeks), and in-season leagues follow the NFL clock (`display_week`, clamped to 1–17). Mid-season the app now points at the week being *bet on*, not the last finished one — matchup data loads through that week, unscored matchups map to `status: "upcoming"` with no phantom 0–0 scores (settlement already refuses non-final matchups), and projections are fetched for the current week instead of week 17. — connect the Leaderboard page to live wallet/wager state instead of static mock rows (shipped in [#9](https://github.com/songjay17/FAAB-website/pull/9))
- [x] **Reconcile with real Sleeper FAAB spend** — this app's betting pool and the real Sleeper league's FAAB budget are now the same 100-unit pool (`League.waiverBudget`, pulled from `league.settings.waiver_budget`), not a separate 1000-unit play pool. Each wallet tracks `sleeperWaiverSpend` (last-synced real spend, from `roster.settings.waiver_budget_used`); `reconcileWaiverSpend` (`src/lib/state/settlement.ts`) deducts any *increase* in real spend from `availableFaab` — a decrease/correction is a no-op, so it's safe to re-run on every load. Runs automatically once per app load (both fresh-seed and returning-session/localStorage paths) via `BettingProvider`, and is visible in the FAAB balance card as its own "Sleeper Waivers" line rather than silently folded into the total. Decided against counting it toward weekly/season P&L — it shrinks available balance like a real-world expense without counting as a wager outcome. **Known gap:** sync only happens on full app load (no poll/webhook), so a waiver claim made mid-session isn't picked up until the next reload — acceptable given Sleeper leagues process waivers on a weekly schedule, not something that needs to be live-updated.
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
