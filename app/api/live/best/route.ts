import { NextResponse } from "next/server";

import { rankLiveSources } from "@/lib/live/server";
import type { LiveSource } from "@/types/live";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { sources?: LiveSource[] };
    const sources = Array.isArray(payload.sources) ? payload.sources.slice(0, 10) : [];

    if (sources.length === 0) {
      return NextResponse.json({ error: "At least one live source is required." }, { status: 400 });
    }

    const ranked = await rankLiveSources(sources);
    const best = ranked.find((item) => item.streams.length > 0) ?? ranked[0] ?? null;

    return NextResponse.json(
      {
        bestSource: best?.source ?? null,
        metrics: ranked.map((item) => ({
          source: item.source.source,
          id: item.source.id,
          latencyMs: item.latencyMs,
          streamCount: item.streams.length,
          hdCount: item.streams.filter((stream) => stream.hd).length,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json({ error: "Unable to rank live sources." }, { status: 400 });
  }
}
