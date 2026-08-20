import { NextResponse } from "next/server";
import { readBook, resetBook } from "@/lib/server/book";
import { asString, jsonError } from "@/lib/server/api";
import { getLeagueDataCached } from "@/lib/server/league-data-cache";

/** Wipes and reseeds the league's book (the old "Reset demo data" control). Audit history is kept. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const memberId = asString(body.memberId);
    if (!memberId) {
      return jsonError("memberId is required.", 400);
    }

    const data = await getLeagueDataCached();
    await resetBook(data, memberId);
    return NextResponse.json({ book: await readBook(data.league.id) });
  } catch (err) {
    return jsonError(err);
  }
}
