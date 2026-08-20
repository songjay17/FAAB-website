import { NextResponse } from "next/server";
import { readBook, settleWeek } from "@/lib/server/book";
import { asString, jsonError } from "@/lib/server/api";
import { getLeagueDataCached } from "@/lib/server/league-data-cache";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const memberId = asString(body.memberId);
    const week = typeof body.week === "number" ? body.week : NaN;
    if (!memberId || !Number.isInteger(week)) {
      return jsonError("memberId and week are required.", 400);
    }

    const data = await getLeagueDataCached();
    const result = await settleWeek({ data, actorMemberId: memberId, week });
    return NextResponse.json({ result, book: await readBook(data.league.id) });
  } catch (err) {
    return jsonError(err);
  }
}
