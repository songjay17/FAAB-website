import { type NextRequest, NextResponse } from "next/server";
import { fetchProjectionsUpstream } from "@/lib/fantasypros/upstream";

// FANTASYPROS_API_KEY is a real secret (unlike Sleeper, which needs no auth)
// — it must never reach the client bundle, so this proxies
// season/week/position through to FantasyPros with the key attached
// server-side (see fetchProjectionsUpstream).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const season = searchParams.get("season");
  const week = searchParams.get("week");
  const position = searchParams.get("position");

  if (!season || !week || !position) {
    return NextResponse.json(
      { error: "season, week, and position query params are all required." },
      { status: 400 }
    );
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetchProjectionsUpstream(season, week, position);
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 500 });
  }

  const body = await upstreamRes.text();
  return new NextResponse(body, {
    status: upstreamRes.status,
    headers: { "content-type": "application/json" },
  });
}
