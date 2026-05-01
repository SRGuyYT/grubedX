import { NextResponse } from "next/server";

import type { YouTubeSearchItem } from "@/types/external";

export const runtime = "nodejs";

const YOUTUBE_SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";

export async function GET(request: Request) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube search is not configured yet.", setupRequired: true, results: [] },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const musicMode = searchParams.get("music") === "true";

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const apiUrl = new URL(YOUTUBE_SEARCH_ENDPOINT);
  apiUrl.searchParams.set("key", apiKey);
  apiUrl.searchParams.set("part", "snippet");
  apiUrl.searchParams.set("type", "video");
  apiUrl.searchParams.set("maxResults", "12");
  apiUrl.searchParams.set("safeSearch", "moderate");
  apiUrl.searchParams.set("q", musicMode ? `${query} music official audio` : query);

  try {
    const response = await fetch(apiUrl, { next: { revalidate: 120 } });
    if (!response.ok) {
      return NextResponse.json({ error: "YouTube search is unavailable right now.", results: [] }, { status: 502 });
    }

    const body = (await response.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          description?: string;
          channelTitle?: string;
          publishedAt?: string;
          thumbnails?: { medium?: { url?: string }; high?: { url?: string }; default?: { url?: string } };
        };
      }>;
    };

    const results: YouTubeSearchItem[] = (body.items ?? [])
      .map((item) => {
        const videoId = item.id?.videoId;
        const snippet = item.snippet;
        if (!videoId || !snippet?.title) {
          return null;
        }

        return {
          id: videoId,
          title: snippet.title,
          description: snippet.description ?? "",
          channelTitle: snippet.channelTitle ?? "YouTube",
          thumbnailUrl:
            snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? null,
          publishedAt: snippet.publishedAt ?? null,
        };
      })
      .filter((item): item is YouTubeSearchItem => Boolean(item));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("YouTube search failed", error);
    return NextResponse.json({ error: "YouTube search is unavailable right now.", results: [] }, { status: 502 });
  }
}
