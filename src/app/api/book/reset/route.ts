import { NextResponse } from "next/server";
import { readBook, resetBook } from "@/lib/server/book";
import { jsonError } from "@/lib/server/api";
import { guard, isResponse } from "@/lib/server/guard";

/** Wipes and reseeds the league's book. Commissioner-only; audit history is kept. */
export async function POST() {
  try {
    const guarded = await guard({ commissioner: true });
    if (isResponse(guarded)) return guarded;
    const { data, session } = guarded;

    await resetBook(data, session.memberId);
    return NextResponse.json({ book: await readBook(data.league.id) });
  } catch (err) {
    return jsonError(err);
  }
}
