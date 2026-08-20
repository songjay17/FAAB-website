import { NextResponse } from "next/server";
import type { LeagueData } from "@/lib/sleeper/load-league-data";
import { getLeagueDataCached } from "./league-data-cache";
import { requireSession, type Session } from "./session";

// Every mutation route runs through here: the actor comes from the signed
// session cookie, never from the request body. Commissioner routes
// additionally require the flag copied from Sleeper's league owner at claim
// time.

export type Guarded = { data: LeagueData; session: Session };

export async function guard(options: { commissioner?: boolean } = {}):
  Promise<Guarded | NextResponse> {
  const data = await getLeagueDataCached();
  const session = await requireSession(data.league.id);
  if (!session) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (options.commissioner && !session.isCommissioner) {
    return NextResponse.json(
      { error: "Only the commissioner can do that." },
      { status: 403 }
    );
  }
  return { data, session };
}

export function isResponse(value: Guarded | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
