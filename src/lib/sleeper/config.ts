// Sleeper's API needs no auth, so these are safe to expose to the client —
// NEXT_PUBLIC_ is required for that (Next.js strips non-prefixed env vars
// from the browser bundle). Any season of the league works as the id:
// resolveCurrentLeague walks previous_league_id renewals forward from here
// to whichever season is currently in play, so this never needs a yearly
// bump. Default is the real "JHU Lads" league's 2025 season.
export const SLEEPER_LEAGUE_ID =
  process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID ?? "1230632258184957952";

// The signed-in member for this prototype, as a real Sleeper user_id.
export const DEMO_CURRENT_USER_ID =
  process.env.NEXT_PUBLIC_DEMO_CURRENT_USER_ID ?? "975162996680945664";
