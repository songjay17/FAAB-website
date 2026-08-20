import { NextResponse } from "next/server";
import { readBook, settleWeek } from "@/lib/server/book";
import { jsonError } from "@/lib/server/api";
import { guard, isResponse } from "@/lib/server/guard";

export async function POST(request: Request) {
  try {
    const guarded = await guard({ commissioner: true });
    if (isResponse(guarded)) return guarded;
    const { data, session } = guarded;

    const body = (await request.json()) as Record<string, unknown>;
    const week = typeof body.week === "number" ? body.week : NaN;
    if (!Number.isInteger(week)) {
      return jsonError("week is required.", 400);
    }

    const result = await settleWeek({ data, actorMemberId: session.memberId, week });
    return NextResponse.json({ result, book: await readBook(data.league.id) });
  } catch (err) {
    return jsonError(err);
  }
}
