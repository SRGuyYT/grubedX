import type { NextRequest, NextResponse } from "next/server";

import type {
  SpotifyAlbumSummary,
  SpotifyArtistSummary,
  SpotifyImage,
  SpotifyPlaylistSummary,
  SpotifySearchResponse,
  SpotifyTrackSummary,
  SpotifyUserSummary,
} from "@/types/spotify";

const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com";
const SPOTIFY_API_URL = "https://api.spotify.com";
const TOKEN_REFRESH_SKEW_MS = 60_000;

export const SPOTIFY_COOKIE_NAMES = {
  accessToken: "grubx_spotify_access_token",
  refreshToken: "grubx_spotify_refresh_token",
  expiresAt: "grubx_spotify_expires_at",
  state: "grubx_spotify_state",
} as const;

export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "playlist-modify-private",
  "playlist-modify-public",
  "playlist-read-private",
];

type SpotifyTokenResponse = {
  access_token: string;
  token_type: "Bearer";
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

type SpotifyApiErrorBody = {
  error?: {
    status?: number;
    message?: string;
  };
  error_description?: string;
};

type SpotifyRawUser = {
  id: string;
  display_name?: string | null;
  email?: string | null;
  product?: string | null;
  images?: SpotifyImage[];
};

type SpotifyExternalUrls = {
  spotify?: string;
};

type SpotifyRawArtist = {
  id: string;
  name: string;
  uri: string;
  external_urls?: SpotifyExternalUrls;
  images?: SpotifyImage[];
};

type SpotifyRawAlbum = {
  id: string;
  name: string;
  uri: string;
  external_urls?: SpotifyExternalUrls;
  images?: SpotifyImage[];
  artists?: Array<{ name: string }>;
  release_date?: string | null;
};

type SpotifyRawPlaylist = {
  id: string;
  name: string;
  uri: string;
  external_urls?: SpotifyExternalUrls;
  images?: SpotifyImage[] | null;
  owner?: { display_name?: string | null };
  tracks?: { total?: number | null };
};

type SpotifyRawTrack = {
  id: string;
  name: string;
  uri: string;
  external_urls?: SpotifyExternalUrls;
  album?: SpotifyRawAlbum;
  artists?: Array<{ name: string }>;
  duration_ms: number;
  explicit: boolean;
};

type SpotifyRawSearchResponse = {
  tracks?: { items?: SpotifyRawTrack[] };
  albums?: { items?: SpotifyRawAlbum[] };
  artists?: { items?: SpotifyRawArtist[] };
  playlists?: { items?: Array<SpotifyRawPlaylist | null> };
};

export class SpotifyApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
  }
}

export function getSpotifyRedirectUri(request?: Request) {
  if (process.env.SPOTIFY_REDIRECT_URI) {
    return process.env.SPOTIFY_REDIRECT_URI;
  }

  if (!request) {
    return "http://127.0.0.1:3000/api/spotify/callback";
  }

  const redirectUrl = new URL("/api/spotify/callback", request.url);
  if (redirectUrl.hostname === "localhost") {
    redirectUrl.hostname = "127.0.0.1";
  }
  return redirectUrl.toString();
}

export function getSpotifyConfig(request?: Request) {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = getSpotifyRedirectUri(request);

  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret),
  };
}

export function buildSpotifyAuthorizeUrl(request: Request, state: string) {
  const config = getSpotifyConfig(request);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    scope: SPOTIFY_SCOPES.join(" "),
    redirect_uri: config.redirectUri,
    state,
    show_dialog: "true",
  });

  return `${SPOTIFY_ACCOUNTS_URL}/authorize?${params.toString()}`;
}

const encodeClientCredentials = (clientId: string, clientSecret: string) =>
  Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

async function requestSpotifyToken(body: URLSearchParams, request?: Request) {
  const config = getSpotifyConfig(request);
  if (!config.configured) {
    throw new SpotifyApiError(500, "Spotify is not configured.");
  }

  const response = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${encodeClientCredentials(config.clientId, config.clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as SpotifyTokenResponse & SpotifyApiErrorBody | null;
  if (!response.ok || !payload?.access_token) {
    const message =
      payload?.error_description ??
      payload?.error?.message ??
      `Spotify token request failed with status ${response.status}.`;
    throw new SpotifyApiError(response.status, message);
  }

  return payload;
}

export function exchangeSpotifyCode(code: string, request: Request) {
  const config = getSpotifyConfig(request);
  return requestSpotifyToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    }),
    request,
  );
}

export function refreshSpotifyAccessToken(refreshToken: string, request?: Request) {
  return requestSpotifyToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    request,
  );
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export function applySpotifyTokenCookies(
  response: NextResponse,
  token: SpotifyTokenResponse,
  existingRefreshToken?: string,
) {
  const expiresAt = Date.now() + token.expires_in * 1000;
  response.cookies.set(SPOTIFY_COOKIE_NAMES.accessToken, token.access_token, cookieOptions(token.expires_in));
  response.cookies.set(SPOTIFY_COOKIE_NAMES.expiresAt, String(expiresAt), cookieOptions(token.expires_in));

  const refreshToken = token.refresh_token ?? existingRefreshToken;
  if (refreshToken) {
    response.cookies.set(SPOTIFY_COOKIE_NAMES.refreshToken, refreshToken, cookieOptions(60 * 60 * 24 * 30));
  }
}

export function clearSpotifyCookies(response: NextResponse) {
  Object.values(SPOTIFY_COOKIE_NAMES).forEach((name) => {
    response.cookies.set(name, "", cookieOptions(0));
  });
}

export async function getSpotifyAccessToken(request: NextRequest) {
  const accessToken = request.cookies.get(SPOTIFY_COOKIE_NAMES.accessToken)?.value;
  const refreshToken = request.cookies.get(SPOTIFY_COOKIE_NAMES.refreshToken)?.value;
  const expiresAt = Number(request.cookies.get(SPOTIFY_COOKIE_NAMES.expiresAt)?.value ?? "0");

  if (accessToken && expiresAt > Date.now() + TOKEN_REFRESH_SKEW_MS) {
    return { accessToken, expiresAt, refreshToken, refreshedToken: null as SpotifyTokenResponse | null };
  }

  if (!refreshToken) {
    return null;
  }

  const refreshedToken = await refreshSpotifyAccessToken(refreshToken, request);
  return {
    accessToken: refreshedToken.access_token,
    expiresAt: Date.now() + refreshedToken.expires_in * 1000,
    refreshToken,
    refreshedToken,
  };
}

export async function spotifyApiFetch<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
) {
  const response = await fetch(path.startsWith("https://") ? path : `${SPOTIFY_API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  if (response.status === 204) {
    return null as T;
  }

  const payload = (await response.json().catch(() => null)) as (T & SpotifyApiErrorBody) | null;
  if (!response.ok) {
    const message =
      payload?.error_description ??
      payload?.error?.message ??
      `Spotify request failed with status ${response.status}.`;
    throw new SpotifyApiError(response.status, message);
  }

  return payload as T;
}

const imageUrl = (images?: SpotifyImage[] | null) => images?.[0]?.url ?? null;
const externalUrl = (urls?: SpotifyExternalUrls) => urls?.spotify ?? "https://open.spotify.com/";

export const mapSpotifyUser = (user: SpotifyRawUser): SpotifyUserSummary => ({
  id: user.id,
  displayName: user.display_name ?? user.id,
  email: user.email ?? null,
  product: user.product ?? null,
  imageUrl: imageUrl(user.images),
});

const mapTrack = (track: SpotifyRawTrack): SpotifyTrackSummary => ({
  id: track.id,
  name: track.name,
  uri: track.uri,
  externalUrl: externalUrl(track.external_urls),
  imageUrl: imageUrl(track.album?.images),
  artists: track.artists?.map((artist) => artist.name) ?? [],
  album: track.album?.name ?? null,
  durationMs: track.duration_ms,
  explicit: track.explicit,
});

const mapAlbum = (album: SpotifyRawAlbum): SpotifyAlbumSummary => ({
  id: album.id,
  name: album.name,
  uri: album.uri,
  externalUrl: externalUrl(album.external_urls),
  imageUrl: imageUrl(album.images),
  artists: album.artists?.map((artist) => artist.name) ?? [],
  releaseDate: album.release_date ?? null,
});

const mapArtist = (artist: SpotifyRawArtist): SpotifyArtistSummary => ({
  id: artist.id,
  name: artist.name,
  uri: artist.uri,
  externalUrl: externalUrl(artist.external_urls),
  imageUrl: imageUrl(artist.images),
});

const mapPlaylist = (playlist: SpotifyRawPlaylist): SpotifyPlaylistSummary => ({
  id: playlist.id,
  name: playlist.name,
  uri: playlist.uri,
  externalUrl: externalUrl(playlist.external_urls),
  imageUrl: imageUrl(playlist.images),
  owner: playlist.owner?.display_name ?? null,
  tracksTotal: playlist.tracks?.total ?? null,
});

export function mapSpotifySearch(payload: SpotifyRawSearchResponse): SpotifySearchResponse {
  return {
    tracks: payload.tracks?.items?.map(mapTrack) ?? [],
    albums: payload.albums?.items?.map(mapAlbum) ?? [],
    artists: payload.artists?.items?.map(mapArtist) ?? [],
    playlists: payload.playlists?.items?.filter(Boolean).map((playlist) => mapPlaylist(playlist as SpotifyRawPlaylist)) ?? [],
  };
}
