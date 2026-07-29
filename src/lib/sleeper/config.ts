// Sleeper's API needs no auth, so these are safe to expose to the client —
// NEXT_PUBLIC_ is required for that (Next.js strips non-prefixed env vars
// from the browser bundle). Defaults point at the real "JHU Lads" league's
// completed 2025 season so the app runs with zero setup out of the box.
// Swapping to the live 2026 league (once it has matchups) is a one-line env change.
export const SLEEPER_LEAGUE_ID =
  process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID ?? "1230632258184957952";

export const SLEEPER_SEASON = 2025;

// The signed-in member for this prototype, as a real Sleeper user_id.
export const DEMO_CURRENT_USER_ID =
  process.env.NEXT_PUBLIC_DEMO_CURRENT_USER_ID ?? "975162996680945664";
