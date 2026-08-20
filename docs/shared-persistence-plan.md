# Shared persistence & identity — implementation plan

The last big README item. Today every member's browser has its own seeded book
in localStorage: wallets, wagers, and even the market lines are per-browser,
and "commissioner" is just a UI mode anyone can use. This plan makes the book a
single shared, server-authoritative thing all 14 members see and act on.

## Decisions (made 2026-08-19)

| Decision | Choice | Why |
| --- | --- | --- |
| Backend | **Supabase** (as hosted Postgres) | Free tier, real Postgres for transactional money paths, and auth/realtime available later without re-platforming. |
| Identity | **Claim + PIN** | First visit: pick your Sleeper member and set a PIN; after that, PIN login. Per-member secret without email-flow friction — right level for a 14-friend, money-adjacent league. |
| Freshness | **Refetch on load/focus** | Weekly-cadence betting doesn't need websockets. Realtime can layer on later via Supabase channels. |
| Staging | **Two PRs: data, then auth** | PR 1 ships a working shared book (same trust level as today, but shared). PR 2 makes identity real. |

## Architecture

**Server-authoritative, API-mediated.** The browser never talks to Supabase.
All reads and writes go through Next.js route handlers; the database
credentials stay server-side (same pattern as the existing
`/api/projections` FantasyPros proxy, the app's one route handler today).
This lets the money paths run in real transactions and lets the server
enforce who can do what — RLS/client-SDK writes buy us nothing under
PIN-based identity.

**Database access via Drizzle + postgres-js** against Supabase's pooled
connection string (serverless-safe). Supabase is "just Postgres" for now;
its auth/realtime products stay available if we ever want them.

**The pure logic already exists.** `settlement.ts`, `generate-markets.ts`,
`optimal-lineup.ts`, and `load-league-data.ts` are pure/isomorphic and move
server-side mostly untouched. `players-cache.ts` is a module-level singleton
that works in route handlers as-is (cold starts refetch the 14MB blob at most
once/day per instance — acceptable).

### Schema (sketch)

```
members    id (Sleeper user_id, pk), display_name, team_id, is_commissioner,
           pin_hash (null until claimed), claimed_at, failed_logins, locked_until
wallets    member_id (pk), league_id, total_budget, available_faab,
           reserved_faab, weekly_profit_loss, season_profit_loss,
           sleeper_waiver_spend
markets    id (pk), league_id, matchup_id, week, status,
           home_moneyline, away_moneyline, total_faab_home, total_faab_away,
           odds_updated_at
wagers     id (pk), reference (unique), member_id, market_id, matchup_id, week,
           selected_team_id, opponent_team_id, moneyline_at_bet, stake_faab,
           potential_profit, potential_payout, status, placed_at, settled_at,
           final_payout, void_reason
audit_log  id, actor_member_id, action, subject_id, reason, created_at
```

League/team/matchup data stays live-from-Sleeper (read-only) exactly as now —
only the book persists, stamped with `league_id` so the season-rollover reset
semantics carry over (a new league id ⇒ a fresh book, wagers/wallets never
bleed across seasons).

### What becomes league-wide truth (today: per-browser)

- **Odds snapshot** — markets are priced once, server-side, when a matchup
  first appears; every member sees the same line. Closes the last gap in the
  odds-freeze story: today two browsers can hold different snapshots of the
  same market.
- **Waiver-spend reconciliation** — runs server-side on read (row-locked, so
  concurrent loads can't double-deduct), instead of in whichever browser
  happens to load first.
- **Wager references** — `JHL-####` issued from the database sequence, not
  from whatever the local browser had seen.
- **Concurrency** — place/cancel/void/settle each run in one transaction with
  the wallet row locked (`select … for update`): balance check, wallet
  update, and wager insert/update are atomic. Two simultaneous bets can't
  overdraw a wallet.

## PR 1 — the shared book (no auth yet)

1. Supabase project (owner creates; env vars: pooled `DATABASE_URL` — server-only).
2. Drizzle schema + migrations for the tables above.
3. Bootstrap: first request for a league id seeds wallets (full budget per
   member) and prices markets from live Sleeper + FantasyPros data. The
   hand-authored mock wallets/wagers retire with localStorage.
4. Route handlers:
   - `GET  /api/book` — wallets, wagers, markets (reconciles waiver spend lazily)
   - `POST /api/wagers` — place (transactional)
   - `POST /api/wagers/:id/cancel` — self-cancel within grace window
   - `POST /api/commissioner/void | settle | market-status` — commissioner actions
   Actor = a `memberId` field from the client for now — explicitly the same
   honor-system trust as today, just against shared state. PR 2 replaces it.
5. `BettingProvider` swaps localStorage for `GET /api/book` on mount + window
   focus + after each own mutation (pessimistic updates: server response is
   the new state). The reducer shape barely changes; pages don't change at all.
6. Tests: route-handler logic unit-tested (transaction paths against an
   ephemeral/local Postgres); Playwright keeps determinism by stubbing
   `/api/book` and mutation routes with fixtures via `page.route()`, same
   pattern as the Sleeper stubs.

## PR 2 — identity & enforcement

1. Claim/login: `POST /api/claim` (unclaimed member + new PIN),
   `POST /api/login` (member + PIN) ⇒ httpOnly signed session cookie
   (`jose` JWT or iron-session; no session table needed).
2. PIN storage: argon2/bcrypt hash; per-member failed-attempt lockout with
   backoff (columns already in schema).
3. Every mutation route derives the actor from the session — the `memberId`
   request field from PR 1 is deleted. Commissioner routes require
   `is_commissioner`. Server-side grace-window check on self-cancel.
4. Commissioner can reset a member's PIN (audit-logged).
5. UI: claim/login screen gating the app shell, "signed in as X" + logout in
   the topbar. `DEMO_CURRENT_USER_ID` retires.

## Out of scope (tracked, not built)

- Realtime subscriptions (decided: refetch is enough for now).
- Multi-league support — schema is keyed by `league_id` throughout, so
  nothing blocks it, but the UI stays single-league.
- Time-based market auto-locking — separate README item; PR 1's server does
  make it trivial later (a status check against `lockAt` on read).

## Risks / notes

- **Vercel serverless + Postgres**: use Supabase's transaction-mode pooler
  URL; postgres-js with `prepare: false`. Well-trodden.
- **Seeding race**: two first-loads at once → bootstrap runs in a transaction
  with `on conflict do nothing`, idempotent.
- **The reset-demo-data button** becomes a commissioner-only "reset book"
  (destructive, audit-logged) — useful until real money habits settle, easy
  to remove later.
