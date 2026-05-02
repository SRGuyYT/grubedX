import type { NextRequest, NextResponse } from "next/server";

import { proxiedServerUrlAny } from "@/lib/externalProxy";

const GOOGLE_ACCOUNTS_URL = "https://accounts.google.com";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const TOKEN_REFRESH_SKEW_MS = 60_000;

export const YOUTUBE_COOKIE_NAMES = {
  accessToken: "grubx_youtube_access_token",
  refreshToken: "grubx_youtube_refresh_token",
  expiresAt: "grubx_youtube_expires_at",
  state: "grubx_youtube_state",
} as const;

export const YOUTUBE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/youtube.readonly",
];

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: "Bearer";
  id_token?: string;
};

type GoogleErrorBody = {
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
};

type YouTubeChannelsResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
        high?: { url?: string };
      };
    };
  }>;
};

export class YouTubeApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "YouTubeApiError";
    this.status = status;
  }
}

export function getYouTubeRedirectUri(request?: Request) {
  if (process.env.YOUTUBE_REDIRECT_URI) {
    return process.env.YOUTUBE_REDIRECT_URI;
  }

  if (!request) {
    return "http://127.0.0.1:3000/api/youtube/callback";
  }

  const redirectUrl = new URL("/api/youtube/callback", request.url);
  if (redirectUrl.hostname === "localhost") {
    redirectUrl.hostname = "127.0.0.1";
  }
  return redirectUrl.toString();
}

export function getYouTubeConfig(request?: Request) {
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim() ?? "";
  return {
    clientId,
    clientSecret,
    redirectUri: getYouTubeRedirectUri(request),
    configured: Boolean(clientId && clientSecret),
  };
}

export function getYouTubeApiKey() {
  return process.env.YOUTUBE_API_KEY?.trim() ?? "";
}

export function buildYouTubeAuthorizeUrl(request: Request, state: string) {
  const config = getYouTubeConfig(request);
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: YOUTUBE_SCOPES.join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_ACCOUNTS_URL}/o/oauth2/v2/auth?${params.toString()}`;
}

async function requestGoogleToken(body: URLSearchParams, request?: Request) {
  const config = getYouTubeConfig(request);
  if (!config.configured) {
    throw new YouTubeApiError(500, "YouTube login is not configured.");
  }

  const response = await fetch(proxiedServerUrlAny(["YOUTUBE_API_PROXY_BASE", "YOUTUBE_PROXY_BASE"], GOOGLE_TOKEN_URL), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as (GoogleTokenResponse & GoogleErrorBody) | null;
  if (!response.ok || !payload?.access_token) {
    throw new YouTubeApiError(
      response.status,
      payload?.error_description ?? payload?.error ?? "YouTube login failed.",
    );
  }

  return payload;
}

export function exchangeYouTubeCode(code: string, request: Request) {
  const config = getYouTubeConfig(request);
  return requestGoogleToken(
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
    request,
  );
}

export function refreshYouTubeAccessToken(refreshToken: string, request?: Request) {
  const config = getYouTubeConfig(request);
  return requestGoogleToken(
    new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
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

export function applyYouTubeTokenCookies(
  response: NextResponse,
  token: GoogleTokenResponse,
  existingRefreshToken?: string,
) {
  const expiresAt = Date.now() + token.expires_in * 1000;
  response.cookies.set(YOUTUBE_COOKIE_NAMES.accessToken, token.access_token, cookieOptions(token.expires_in));
  response.cookies.set(YOUTUBE_COOKIE_NAMES.expiresAt, String(expiresAt), cookieOptions(token.expires_in));

  const refreshToken = token.refresh_token ?? existingRefreshToken;
  if (refreshToken) {
    response.cookies.set(YOUTUBE_COOKIE_NAMES.refreshToken, refreshToken, cookieOptions(60 * 60 * 24 * 30));
  }
}

export function clearYouTubeCookies(response: NextResponse) {
  Object.values(YOUTUBE_COOKIE_NAMES).forEach((name) => {
    response.cookies.set(name, "", cookieOptions(0));
  });
}

export async function getYouTubeAccessToken(request: NextRequest) {
  const accessToken = request.cookies.get(YOUTUBE_COOKIE_NAMES.accessToken)?.value;
  const refreshToken = request.cookies.get(YOUTUBE_COOKIE_NAMES.refreshToken)?.value;
  const expiresAt = Number(request.cookies.get(YOUTUBE_COOKIE_NAMES.expiresAt)?.value ?? "0");

  if (accessToken && expiresAt > Date.now() + TOKEN_REFRESH_SKEW_MS) {
    return { accessToken, expiresAt, refreshToken, refreshedToken: null as GoogleTokenResponse | null };
  }

  if (!refreshToken) {
    return null;
  }

  const refreshedToken = await refreshYouTubeAccessToken(refreshToken, request);
  return {
    accessToken: refreshedToken.access_token,
    expiresAt: Date.now() + refreshedToken.expires_in * 1000,
    refreshToken,
    refreshedToken,
  };
}

export async function youtubeApiFetch<T>(url: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(proxiedServerUrlAny(["YOUTUBE_API_PROXY_BASE", "YOUTUBE_PROXY_BASE"], url), {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as T & GoogleErrorBody | null;
  if (!response.ok) {
    throw new YouTubeApiError(
      response.status,
      payload?.error_description ?? payload?.error ?? `YouTube request failed with ${response.status}.`,
    );
  }

  return payload as T;
}

export async function getYouTubeUser(accessToken: string) {
  const [profile, channels] = await Promise.all([
    youtubeApiFetch<GoogleUserInfo>(GOOGLE_USERINFO_URL, accessToken),
    youtubeApiFetch<YouTubeChannelsResponse>(`${YOUTUBE_CHANNELS_URL}?part=snippet&mine=true&maxResults=1`, accessToken),
  ]);

  const channel = channels.items?.[0];
  const thumbnails = channel?.snippet?.thumbnails;

  return {
    id: profile.sub,
    name: channel?.snippet?.title ?? profile.name ?? "YouTube account",
    email: profile.email ?? null,
    imageUrl: thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? profile.picture ?? null,
    channelId: channel?.id ?? null,
  };
}
