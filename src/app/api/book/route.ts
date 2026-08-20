import { NextResponse } from "next/server";
import { readBook, syncBook } from "@/lib/server/book";
import { jsonError } from "@/lib/server/api";
import { getLeagueDataCached } from "@/lib/server/league-data-cache";

/**
 * The shared book: wallets, wagers, and markets for the current league.
 * Reading also runs the idempotent sync (bootstrap, price new markets,
 * season-phase lock, waiver reconciliation) so the book can never be read
 * in an unseeded or stale-vs-Sleeper state.
 */
export async function GET() {
  try {
    const data = await getLeagueDataCached();
    await syncBook(data);
    return NextResponse.json(await readBook(data.league.id));
  } catch (err) {
    return jsonError(err);
  }
}
