import { type NextRequest, NextResponse } from "next/server";

const FANTASYPROS_BASE_URL = "https://api.fantasypros.com/public/v2/json/nfl";

// The only Route Handler in this app. FANTASYPROS_API_KEY is a real secret
// (unlike Sleeper, which needs no auth) — it must never reach the client
// bundle, so this proxies season/week/position through to FantasyPros with
// the key attached server-side.
export async function GET(request: NextRequest) {
  const apiKey = process.env.FANTASYPROS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FANTASYPROS_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

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

  const upstreamUrl = new URL(`${FANTASYPROS_BASE_URL}/${season}/projections`);
  upstreamUrl.searchParams.set("week", week);
  upstreamUrl.searchParams.set("position", position);

  const upstreamRes = await fetch(upstreamUrl, {
    headers: { "x-api-key": apiKey },
  });

  const body = await upstreamRes.text();
  return new NextResponse(body, {
    status: upstreamRes.status,
    headers: { "content-type": "application/json" },
  });
}
