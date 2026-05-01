import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TIKTOK_OEMBED_ENDPOINT = "https://www.tiktok.com/oembed";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inputUrl = (searchParams.get("url") ?? "").trim();

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(inputUrl);
  } catch {
    return NextResponse.json({ error: "Paste a valid TikTok URL." }, { status: 400 });
  }

  if (!/(^|\.)tiktok\.com$/i.test(parsedUrl.hostname)) {
    return NextResponse.json({ error: "Paste a valid TikTok URL." }, { status: 400 });
  }

  const apiUrl = new URL(TIKTOK_OEMBED_ENDPOINT);
  apiUrl.searchParams.set("url", parsedUrl.toString());

  try {
    const response = await fetch(apiUrl, { next: { revalidate: 300 } });
    if (!response.ok) {
      return NextResponse.json({ error: "TikTok embed is unavailable right now." }, { status: 502 });
    }

    const body = (await response.json()) as {
      html?: string;
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };

    if (!body.html) {
      return NextResponse.json({ error: "TikTok embed is unavailable right now." }, { status: 502 });
    }

    return NextResponse.json({
      html: body.html,
      title: body.title,
      authorName: body.author_name,
      thumbnailUrl: body.thumbnail_url,
    });
  } catch (error) {
    console.error("TikTok oEmbed failed", error);
    return NextResponse.json({ error: "TikTok embed is unavailable right now." }, { status: 502 });
  }
}
