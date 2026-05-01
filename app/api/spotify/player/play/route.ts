import { NextRequest, NextResponse } from "next/server";

import {
  applySpotifyTokenCookies,
  getSpotifyAccessToken,
  getSpotifyConfig,
  spotifyApiFetch,
  SpotifyApiError,
} from "@/lib/spotify";

export const runtime = "nodejs";

type PlayRequest = {
  deviceId?: string;
  uri?: string;
  uris?: string[];
};

const isSpotifyUri = (value: string) => /^spotify:(track|album|artist|playlist|episode|show):[A-Za-z0-9]+$/.test(value);

export async function POST(request: NextRequest) {
  const config = getSpotifyConfig(request);
  if (!config.configured) {
    return NextResponse.json({ error: "Spotify is not configured." }, { status: 503 });
  }

  const token = await getSpotifyAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: "Please sign in to Spotify first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PlayRequest | null;
  const deviceId = body?.deviceId?.trim();
  const requestedUris = body?.uris?.length ? body.uris : body?.uri ? [body.uri] : [];
  const uris = requestedUris.filter(isSpotifyUri).slice(0, 50);

  if (!deviceId) {
    return NextResponse.json({ error: "Spotify player is not ready yet." }, { status: 400 });
  }

  if (uris.length === 0) {
    return NextResponse.json({ error: "Choose something to play first." }, { status: 400 });
  }

  try {
    await spotifyApiFetch<null>("/v1/me/player", token.accessToken, {
      method: "PUT",
      body: JSON.stringify({ device_ids: [deviceId], play: false }),
    });

    await spotifyApiFetch<null>(`/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, token.accessToken, {
      method: "PUT",
      body: JSON.stringify({ uris }),
    });

    const response = NextResponse.json({ ok: true });
    if (token.refreshedToken) {
      applySpotifyTokenCookies(response, token.refreshedToken, token.refreshToken);
    }
    return response;
  } catch (caught) {
    return NextResponse.json(
      {
        error:
          caught instanceof SpotifyApiError
            ? caught.message
            : "Could not start Spotify playback. Premium may be required.",
      },
      { status: caught instanceof SpotifyApiError ? caught.status : 500 },
    );
  }
}
