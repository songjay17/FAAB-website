// Shared by the client UI and the server book (route handlers) — lives
// outside any "use client" module so server code can import it.

// How long a member can self-cancel a just-placed bet for a full refund —
// misclick protection, not a way to back out once the market's moved.
// Real sportsbooks don't let you unwind a bet just because you regret it or
// news breaks (e.g. a player gets hurt) — that risk is exactly what the odds
// already price in. Once this window passes, only a commissioner void can
// undo a wager.
export const SELF_CANCEL_WINDOW_MS = 5 * 60 * 1000;

export const WAGER_REFERENCE_PREFIX = "JHL-";
