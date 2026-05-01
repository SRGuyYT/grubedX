import { NextRequest, NextResponse } from "next/server";

import {
  applySpotifyTokenCookies,
  getSpotifyAccessToken,
  getSpotifyConfig,
  mapSpotifySearch,
  spotifyApiFetch,
  SpotifyApiError,
} from "@/lib/spotify";

export const runtime = "nodejs";

const SEARCH_TYPES = new Set(["track", "album", "artist", "playlist"]);

export async function GET(request: NextRequest) {
  const config = getSpotifyConfig(request);
  if (!config.configured) {
    return NextResponse.json({ error: "Spotify is not configured." }, { status: 503 });
  }

  const token = await getSpotifyAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: "Please sign in to Spotify first." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const requestedTypes = (searchParams.get("type") ?? "track,album,artist,playlist")
    .split(",")
    .map((type) => type.trim())
    .filter((type) => SEARCH_TYPES.has(type));

  if (query.length < 2) {
    return NextResponse.json({ error: "Search for at least 2 characters." }, { status: 400 });
  }

  const params = new URLSearchParams({
    q: query.slice(0, 120),
    type: requestedTypes.length > 0 ? requestedTypes.join(",") : "track",
    limit: "12",
  });

  try {
    const payload = await spotifyApiFetch<Parameters<typeof mapSpotifySearch>[0]>(
      `/v1/search?${params.toString()}`,
      token.accessToken,
    );
    const response = NextResponse.json(mapSpotifySearch(payload));
    if (token.refreshedToken) {
      applySpotifyTokenCookies(response, token.refreshedToken, token.refreshToken);
    }
    return response;
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof SpotifyApiError ? caught.message : "Spotify search failed." },
      { status: caught instanceof SpotifyApiError ? caught.status : 500 },
    );
  }
}
