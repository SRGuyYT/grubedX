import { NextResponse } from "next/server";

import { buildEdgeCacheHeaders } from "@/lib/http/cache";
import { assertAllowedLiveId, assertAllowedLiveSource, fetchLiveJson } from "@/lib/live/server";

export const runtime = "nodejs";
const STREAM_TTL_SECONDS = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  const id = searchParams.get("id");

  if (!source || !id) {
    return NextResponse.json({ error: "Missing required source or id" }, { status: 400 });
  }

  try {
    const safeSource = assertAllowedLiveSource(source);
    const safeId = assertAllowedLiveId(id);
    const payload = await fetchLiveJson(`/api/stream/${safeSource}/${encodeURIComponent(safeId)}`, STREAM_TTL_SECONDS);

    return NextResponse.json(payload, {
      headers: buildEdgeCacheHeaders(STREAM_TTL_SECONDS, 90),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to reach stream provider";
    return NextResponse.json({ error: message }, { status: /allowlisted|invalid/i.test(message) ? 400 : 502 });
  }
}
