import type { FantasyProsProjectionsResponse } from "./types";

export class FantasyProsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "FantasyProsApiError";
  }
}

// Calls the local /api/projections proxy — never FantasyPros directly, since
// that would require shipping the API key to the browser.
export async function fetchProjections(
  season: number,
  week: number,
  position: string
): Promise<FantasyProsProjectionsResponse> {
  const url = `/api/projections?season=${season}&week=${week}&position=${position}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new FantasyProsApiError(
      `FantasyPros projections request failed: ${position} week ${week} (${res.status})`,
      res.status
    );
  }
  return res.json() as Promise<FantasyProsProjectionsResponse>;
}
