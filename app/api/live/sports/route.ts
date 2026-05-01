import { NextResponse } from "next/server";

import { buildEdgeCacheHeaders } from "@/lib/http/cache";

const LIVE_SPORTS_ENDPOINT = "https://streamed.pk/api/sports";
const SPORTS_TTL_SECONDS = 60 * 60 * 6;

export const runtime = "nodejs";

export async function GET() {
  try {
    const response = await fetch(LIVE_SPORTS_ENDPOINT, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: SPORTS_TTL_SECONDS },
      redirect: "error",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch sports" }, { status: response.status });
    }

    const payload = await response.json();
    return NextResponse.json(payload, {
      headers: buildEdgeCacheHeaders(SPORTS_TTL_SECONDS),
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach sports provider" }, { status: 502 });
  }
}
