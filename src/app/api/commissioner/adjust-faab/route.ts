import { NextResponse } from "next/server";
import { adjustWalletFaab, readBook } from "@/lib/server/book";
import { asString, jsonError } from "@/lib/server/api";
import { guard, isResponse } from "@/lib/server/guard";

/** Commissioner correction to a member's available FAAB. Reason required; audit-logged. */
export async function POST(request: Request) {
  try {
    const guarded = await guard({ commissioner: true });
    if (isResponse(guarded)) return guarded;
    const { data, session } = guarded;

    const body = (await request.json()) as Record<string, unknown>;
    const memberId = asString(body.memberId);
    const amount = typeof body.amount === "number" ? body.amount : NaN;
    const reason = typeof body.reason === "string" ? body.reason : "";
    if (!memberId || !Number.isFinite(amount)) {
      return jsonError("memberId and a numeric amount are required.", 400);
    }

    const leagueId = data.league.id;
    const result = await adjustWalletFaab({
      leagueId,
      actorMemberId: session.memberId,
      memberId,
      amount,
      reason,
    });
    if (!result.ok) {
      return jsonError(result.error, 400);
    }
    return NextResponse.json({ book: await readBook(leagueId) });
  } catch (err) {
    return jsonError(err);
  }
}
