import { type NextRequest, NextResponse } from "next/server";

import { proxiedServerUrlAny } from "@/lib/externalProxy";
import {
  applyYouTubeTokenCookies,
  getYouTubeAccessToken,
  getYouTubeApiKey,
  getYouTubeConfig,
  youtubeApiFetch,
} from "@/lib/youtube";
import { toYouTubeEmbedUrl, toYouTubeWatchUrl } from "@/lib/youtubeEmbed";
import type { YouTubeSearchItem } from "@/types/external";

export const runtime = "nodejs";

const YOUTUBE_SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";

type YouTubeSearchBody = {
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

const mapResults = (body: YouTubeSearchBody, mode: "videos" | "shorts"): YouTubeSearchItem[] =>
  (body.items ?? [])
    .map((item) => {
      const videoId = item.id?.videoId;
      const snippet = item.snippet;
      if (!videoId || !snippet?.title) {
        return null;
      }

      const result: YouTubeSearchItem = {
        id: videoId,
        kind: mode === "shorts" ? "short" : "video",
        title: snippet.title,
        description: snippet.description ?? "",
        channelTitle: snippet.channelTitle ?? "YouTube",
        thumbnailUrl:
          snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? null,
        publishedAt: snippet.publishedAt ?? null,
        watchUrl: toYouTubeWatchUrl(videoId),
        embedUrl: toYouTubeEmbedUrl(videoId) ?? `https://www.youtube-nocookie.com/embed/${videoId}`,
      };
      return result;
    })
    .filter((item): item is YouTubeSearchItem => item !== null);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const mode = searchParams.get("mode") === "shorts" ? "shorts" : "videos";

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = getYouTubeApiKey();
  const tokenState = await getYouTubeAccessToken(request).catch((error) => {
    console.error("YouTube token lookup failed", error);
    return null;
  });

  if (!apiKey && !tokenState?.accessToken) {
    const config = getYouTubeConfig(request);
    return NextResponse.json(
      {
        error: "YouTube search needs a YouTube API key or a connected YouTube account.",
        setupRequired: true,
        setup: { redirectUri: config.redirectUri },
        results: [],
      },
      { status: 503 },
    );
  }

  const apiUrl = new URL(YOUTUBE_SEARCH_ENDPOINT);
  apiUrl.searchParams.set("part", "snippet");
  apiUrl.searchParams.set("type", "video");
  apiUrl.searchParams.set("maxResults", "16");
  apiUrl.searchParams.set("safeSearch", "moderate");
  apiUrl.searchParams.set("videoEmbeddable", "true");
  apiUrl.searchParams.set("q", mode === "shorts" && !query.toLowerCase().includes("shorts") ? `${query} shorts` : query);
  if (mode === "shorts") {
    apiUrl.searchParams.set("videoDuration", "short");
  }

  try {
    let body: YouTubeSearchBody;
    if (tokenState?.accessToken) {
      body = await youtubeApiFetch<YouTubeSearchBody>(apiUrl.toString(), tokenState.accessToken);
    } else {
      apiUrl.searchParams.set("key", apiKey);
      const response = await fetch(proxiedServerUrlAny(["YOUTUBE_API_PROXY_BASE", "YOUTUBE_PROXY_BASE"], apiUrl.toString()), {
        next: { revalidate: 120 },
      });
      if (!response.ok) {
        return NextResponse.json({ error: "YouTube search is unavailable right now.", results: [] }, { status: 502 });
      }
      body = (await response.json()) as YouTubeSearchBody;
    }

    const response = NextResponse.json({ results: mapResults(body, mode), mode });
    if (tokenState?.refreshedToken) {
      applyYouTubeTokenCookies(response, tokenState.refreshedToken, tokenState.refreshToken ?? undefined);
    }
    return response;
  } catch (error) {
    console.error("YouTube search failed", error);
    return NextResponse.json({ error: "YouTube search is unavailable right now.", results: [] }, { status: 502 });
  }
}
