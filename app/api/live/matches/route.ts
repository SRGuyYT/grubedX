import { NextResponse } from "next/server";

import { buildEdgeCacheHeaders } from "@/lib/http/cache";

const LIVE_MATCHES_ENDPOINT = "https://streamed.pk/api/matches/live";
const TODAY_MATCHES_ENDPOINT = "https://streamed.pk/api/matches/all-today";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "all-today" ? "all-today" : "live";
  const popular = searchParams.get("popular") === "true";
  const endpoint = `${scope === "all-today" ? TODAY_MATCHES_ENDPOINT : LIVE_MATCHES_ENDPOINT}${popular ? "/popular" : ""}`;
  const ttlSeconds = scope === "live" ? 30 : 120;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: ttlSeconds },
      redirect: "error",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch live matches" }, { status: response.status });
    }

    const payload = await response.json();
    return NextResponse.json(payload, {
      headers: buildEdgeCacheHeaders(ttlSeconds, scope === "live" ? 90 : 600),
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach live matches provider" }, { status: 502 });
  }
}
