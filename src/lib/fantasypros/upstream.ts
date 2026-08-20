// Server-only: talks to FantasyPros directly with the secret key. Used by
// the /api/projections proxy (for the browser) and by server-side code
// (market pricing) that shouldn't loop back through its own HTTP layer.

const FANTASYPROS_BASE_URL = "https://api.fantasypros.com/public/v2/json/nfl";

export function fetchProjectionsUpstream(
  season: number | string,
  week: number | string,
  position: string
): Promise<Response> {
  const apiKey = process.env.FANTASYPROS_API_KEY;
  if (!apiKey) {
    throw new Error("FANTASYPROS_API_KEY is not configured on the server.");
  }
  const url = new URL(`${FANTASYPROS_BASE_URL}/${season}/projections`);
  url.searchParams.set("week", String(week));
  url.searchParams.set("position", position);
  return fetch(url, { headers: { "x-api-key": apiKey } });
}
