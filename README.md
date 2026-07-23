This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## QA pass — up next

Ongoing manual QA using Playwright MCP for real-browser verification (not just code inspection). Fixed so far: a Base UI `nativeButton` console error on every link-rendered button, and a missing desktop wallet balance display. Next up:

1. **URL param edge cases on `/matchups`** — `?week=abc`, `?week=-1`, `?week=999` (untested `NaN`/out-of-range handling in the week navigation)
2. ~~**"Reset demo data" flow**~~ — ✅ verified: confirm dialog opens correctly, resets wallet/wagers to seed state, no leftover UI
3. **Bet-slip behavior at/past a matchup's lock time** — untested lock-boundary UX
4. **Leaderboard and League page interactive elements** — confirmed these pages load, but nothing on them has been clicked yet
5. ~~**Rapid double-click on "Confirm Bet"**~~ — ✅ verified safe: button disables synchronously on first click, second simultaneous click is rejected; exactly one wager created, wallet deducted once
6. ~~**Browser back/forward mid-bet-flow**~~ — ✅ verified safe: navigating away mid-flow cleanly discards the unsubmitted bet slip, no leaked dialog, no corrupted state
7. **My Bets tab filtering** (Won / Lost / Refunded / All) — only the default "Open" tab has been checked so far

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
