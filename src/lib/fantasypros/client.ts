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

// In the browser: calls the local /api/projections proxy — never FantasyPros
// directly, since that would require shipping the API key to the browser.
// On the server (market pricing in the book API): calls FantasyPros directly
// via the upstream helper instead of looping back through its own HTTP layer.
// The upstream module is dynamically imported so its process.env access never
// lands in the client bundle.
export async function fetchProjections(
  season: number,
  week: number,
  position: string
): Promise<FantasyProsProjectionsResponse> {
  let res: Response;
  if (typeof window === "undefined") {
    const { fetchProjectionsUpstream } = await import("./upstream");
    res = await fetchProjectionsUpstream(season, week, position);
  } else {
    res = await fetch(`/api/projections?season=${season}&week=${week}&position=${position}`);
  }
  if (!res.ok) {
    throw new FantasyProsApiError(
      `FantasyPros projections request failed: ${position} week ${week} (${res.status})`,
      res.status
    );
  }
  return res.json() as Promise<FantasyProsProjectionsResponse>;
}
