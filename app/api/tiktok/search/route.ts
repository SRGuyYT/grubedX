import { NextResponse } from "next/server";

import type { TikTokSearchItem } from "@/types/external";

export const runtime = "nodejs";

const officialSearchUrl = (query: string) => {
  const url = new URL("https://www.tiktok.com/search");
  url.searchParams.set("q", query);
  return url.toString();
};

const firstString = (...values: unknown[]) => values.find((value): value is string => typeof value === "string" && value.length > 0) ?? "";

const mapProxyItems = (payload: unknown, mode: "videos" | "shorts"): TikTokSearchItem[] => {
  const source =
    Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { results?: unknown[] })?.results)
        ? (payload as { results: unknown[] }).results
        : Array.isArray((payload as { items?: unknown[] })?.items)
          ? (payload as { items: unknown[] }).items
          : Array.isArray((payload as { data?: unknown[] })?.data)
            ? (payload as { data: unknown[] }).data
            : [];

  return source
    .map((item) => {
      const record = item as Record<string, unknown>;
      const id = firstString(record.id, record.videoId, record.aweme_id, record.url);
      const url = firstString(record.url, record.webUrl, record.shareUrl);
      if (!id && !url) {
        return null;
      }

      const result: TikTokSearchItem = {
        id: id || url,
        url: url || officialSearchUrl(firstString(record.title, record.description)),
        title: firstString(record.title, record.description, "TikTok result"),
        authorName: firstString(record.authorName, record.author, record.creator),
        thumbnailUrl: firstString(record.thumbnailUrl, record.thumbnail, record.cover) || null,
        kind: mode === "shorts" ? "short" : "video",
      };
      return result;
    })
    .filter((item): item is TikTokSearchItem => item !== null);
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const mode = searchParams.get("mode") === "shorts" ? "shorts" : "videos";

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const proxyBase =
    process.env.TIKTOK_SEARCH_PROXY_BASE?.trim() ||
    process.env.TIKTOK_API_PROXY_BASE?.trim() ||
    process.env.TIKTOK_PROXY_BASE?.trim();

  if (!proxyBase) {
    return NextResponse.json({
      results: [],
      setupRequired: true,
      searchUrl: officialSearchUrl(query),
      message: "TikTok search needs a configured proxy. You can still open TikTok search directly.",
    });
  }

  try {
    const proxyUrl = new URL(proxyBase);
    proxyUrl.searchParams.set("q", query);
    proxyUrl.searchParams.set("mode", mode);
    proxyUrl.searchParams.set("limit", "16");

    const response = await fetch(proxyUrl, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({
        results: [],
        searchUrl: officialSearchUrl(query),
        message: "TikTok search proxy is unavailable right now.",
      });
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    return NextResponse.json({
      results: mapProxyItems(payload, mode),
      searchUrl: officialSearchUrl(query),
      mode,
    });
  } catch (error) {
    console.error("TikTok search failed", error);
    return NextResponse.json({
      results: [],
      searchUrl: officialSearchUrl(query),
      message: "TikTok search is unavailable right now.",
    });
  }
}
