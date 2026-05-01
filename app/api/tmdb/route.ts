import { NextResponse } from "next/server";

import { buildEdgeCacheHeaders } from "@/lib/http/cache";
import { fetchTmdbJson, getTmdbRouteConfig } from "@/lib/tmdb/request";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path")?.trim();

  if (!path) {
    return NextResponse.json({ error: "Missing TMDB path." }, { status: 400 });
  }

  try {
    const { rule } = getTmdbRouteConfig(path);
    const forwardedParams = Object.fromEntries(
      Array.from(searchParams.entries()).filter(([key]) => key !== "path" && rule.params.includes(key)),
    );
    const { payload, ttlSeconds } = await fetchTmdbJson<Record<string, unknown>>(path, forwardedParams);

    return NextResponse.json(payload, {
      headers: buildEdgeCacheHeaders(ttlSeconds),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TMDB request failed.";
    return NextResponse.json(
      {
        error: message,
      },
      { status: /TMDB request failed/i.test(message) ? 502 : 400 },
    );
  }
}
