import { NextRequest, NextResponse } from "next/server";

import {
  applySpotifyTokenCookies,
  getSpotifyAccessToken,
  getSpotifyConfig,
  mapSpotifyUser,
  spotifyApiFetch,
  SpotifyApiError,
} from "@/lib/spotify";

export const runtime = "nodejs";

type PlaylistRequest = {
  name?: string;
  description?: string;
  public?: boolean;
  uris?: string[];
};

type SpotifyCreatePlaylistResponse = {
  id: string;
  name: string;
  external_urls?: { spotify?: string };
  uri: string;
};

const isSpotifyTrackUri = (value: string) => /^spotify:track:[A-Za-z0-9]+$/.test(value);

export async function POST(request: NextRequest) {
  const config = getSpotifyConfig(request);
  if (!config.configured) {
    return NextResponse.json({ error: "Spotify is not configured." }, { status: 503 });
  }

  const token = await getSpotifyAccessToken(request);
  if (!token) {
    return NextResponse.json({ error: "Please sign in to Spotify first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PlaylistRequest | null;
  const name = body?.name?.trim().slice(0, 100);
  const description = body?.description?.trim().slice(0, 300) ?? "Made with GrubX.";
  const uris = Array.from(new Set(body?.uris ?? [])).filter(isSpotifyTrackUri).slice(0, 100);

  if (!name) {
    return NextResponse.json({ error: "Give your playlist a name." }, { status: 400 });
  }

  if (uris.length === 0) {
    return NextResponse.json({ error: "Add at least one track first." }, { status: 400 });
  }

  try {
    const user = await spotifyApiFetch<Parameters<typeof mapSpotifyUser>[0]>("/v1/me", token.accessToken);
    const playlist = await spotifyApiFetch<SpotifyCreatePlaylistResponse>(
      `/v1/users/${encodeURIComponent(user.id)}/playlists`,
      token.accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          public: body?.public === true,
        }),
      },
    );

    await spotifyApiFetch<null>(`/v1/playlists/${encodeURIComponent(playlist.id)}/items`, token.accessToken, {
      method: "POST",
      body: JSON.stringify({ uris }),
    });

    const response = NextResponse.json({
      id: playlist.id,
      name: playlist.name,
      uri: playlist.uri,
      externalUrl: playlist.external_urls?.spotify ?? "https://open.spotify.com/",
      tracksAdded: uris.length,
    });

    if (token.refreshedToken) {
      applySpotifyTokenCookies(response, token.refreshedToken, token.refreshToken);
    }

    return response;
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof SpotifyApiError ? caught.message : "Could not create that playlist." },
      { status: caught instanceof SpotifyApiError ? caught.status : 500 },
    );
  }
}
