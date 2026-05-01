import { NextRequest, NextResponse } from "next/server";

import {
  applySpotifyTokenCookies,
  clearSpotifyCookies,
  getSpotifyAccessToken,
  getSpotifyConfig,
  mapSpotifyUser,
  spotifyApiFetch,
  SpotifyApiError,
} from "@/lib/spotify";
import type { SpotifySessionResponse } from "@/types/spotify";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const config = getSpotifyConfig(request);
  if (!config.configured) {
    return NextResponse.json({
      configured: false,
      authenticated: false,
      setup: {
        requiredEnv: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "SPOTIFY_REDIRECT_URI"],
        redirectUri: config.redirectUri,
      },
    } satisfies SpotifySessionResponse);
  }

  try {
    const token = await getSpotifyAccessToken(request);
    if (!token) {
      return NextResponse.json({ configured: true, authenticated: false } satisfies SpotifySessionResponse);
    }

    const user = await spotifyApiFetch<Parameters<typeof mapSpotifyUser>[0]>("/v1/me", token.accessToken);
    const response = NextResponse.json({
      configured: true,
      authenticated: true,
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      premium: user.product === "premium",
      user: mapSpotifyUser(user),
    } satisfies SpotifySessionResponse);

    if (token.refreshedToken) {
      applySpotifyTokenCookies(response, token.refreshedToken, token.refreshToken);
    }

    return response;
  } catch (caught) {
    const response = NextResponse.json(
      {
        configured: true,
        authenticated: false,
        error: caught instanceof SpotifyApiError ? "Spotify session expired. Please sign in again." : "Unable to load Spotify session.",
      },
      { status: caught instanceof SpotifyApiError && caught.status === 401 ? 401 : 500 },
    );
    if (caught instanceof SpotifyApiError && caught.status === 401) {
      clearSpotifyCookies(response);
    }
    return response;
  }
}
