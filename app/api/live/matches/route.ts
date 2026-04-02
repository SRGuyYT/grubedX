import { NextResponse } from "next/server";

const LIVE_MATCHES_ENDPOINT = "https://streamed.pk/api/matches/live";

export const runtime = "nodejs";

export async function GET() {
  try {
    const response = await fetch(LIVE_MATCHES_ENDPOINT, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch live matches" }, { status: response.status });
    }

    const payload = await response.json();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Unable to reach live matches provider" }, { status: 502 });
  }
}
