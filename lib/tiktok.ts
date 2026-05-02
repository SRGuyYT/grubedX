import type { NextRequest, NextResponse } from "next/server";

import { proxiedServerUrlAny } from "@/lib/externalProxy";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const TOKEN_REFRESH_SKEW_MS = 60_000;

export const TIKTOK_COOKIE_NAMES = {
  accessToken: "grubx_tiktok_access_token",
  refreshToken: "grubx_tiktok_refresh_token",
  expiresAt: "grubx_tiktok_expires_at",
  state: "grubx_tiktok_state",
} as const;

export const TIKTOK_SCOPES = ["user.info.basic"];

type TikTokTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  scope?: string;
  token_type?: "Bearer";
  open_id?: string;
};

type TikTokApiErrorBody = {
  error?: string;
  error_description?: string;
  message?: string;
  data?: {
    error_code?: string;
    description?: string;
  };
};

type TikTokUserInfoResponse = {
  data?: {
    user?: {
      open_id?: string;
      union_id?: string;
      avatar_url?: string;
      display_name?: string;
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
};

export class TikTokApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "TikTokApiError";
    this.status = status;
  }
}

export function getTikTokRedirectUri(request?: Request) {
  if (process.env.TIKTOK_REDIRECT_URI) {
    return process.env.TIKTOK_REDIRECT_URI;
  }

  if (!request) {
    return "http://127.0.0.1:3000/api/tiktok/callback";
  }

  const redirectUrl = new URL("/api/tiktok/callback", request.url);
  if (redirectUrl.hostname === "localhost") {
    redirectUrl.hostname = "127.0.0.1";
  }
  return redirectUrl.toString();
}

export function getTikTokConfig(request?: Request) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim() ?? "";
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim() ?? "";
  return {
    clientKey,
    clientSecret,
    redirectUri: getTikTokRedirectUri(request),
    configured: Boolean(clientKey && clientSecret),
  };
}

export function buildTikTokAuthorizeUrl(request: Request, state: string) {
  const config = getTikTokConfig(request);
  const params = new URLSearchParams({
    client_key: config.clientKey,
    scope: TIKTOK_SCOPES.join(","),
    response_type: "code",
    redirect_uri: config.redirectUri,
    state,
  });

  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

async function requestTikTokToken(body: URLSearchParams, request?: Request) {
  const config = getTikTokConfig(request);
  if (!config.configured) {
    throw new TikTokApiError(500, "TikTok login is not configured.");
  }

  const response = await fetch(proxiedServerUrlAny(["TIKTOK_API_PROXY_BASE", "TIKTOK_PROXY_BASE"], TIKTOK_TOKEN_URL), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as (TikTokTokenResponse & TikTokApiErrorBody) | null;
  if (!response.ok || !payload?.access_token) {
    throw new TikTokApiError(
      response.status,
      payload?.error_description ?? payload?.data?.description ?? payload?.message ?? "TikTok login failed.",
    );
  }

  return payload;
}

export function exchangeTikTokCode(code: string, request: Request) {
  const config = getTikTokConfig(request);
  return requestTikTokToken(
    new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
    request,
  );
}

export function refreshTikTokAccessToken(refreshToken: string, request?: Request) {
  const config = getTikTokConfig(request);
  return requestTikTokToken(
    new URLSearchParams({
      client_key: config.clientKey,
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

export function applyTikTokTokenCookies(
  response: NextResponse,
  token: TikTokTokenResponse,
  existingRefreshToken?: string,
) {
  const expiresAt = Date.now() + token.expires_in * 1000;
  response.cookies.set(TIKTOK_COOKIE_NAMES.accessToken, token.access_token, cookieOptions(token.expires_in));
  response.cookies.set(TIKTOK_COOKIE_NAMES.expiresAt, String(expiresAt), cookieOptions(token.expires_in));

  const refreshToken = token.refresh_token ?? existingRefreshToken;
  if (refreshToken) {
    response.cookies.set(TIKTOK_COOKIE_NAMES.refreshToken, refreshToken, cookieOptions(60 * 60 * 24 * 30));
  }
}

export function clearTikTokCookies(response: NextResponse) {
  Object.values(TIKTOK_COOKIE_NAMES).forEach((name) => {
    response.cookies.set(name, "", cookieOptions(0));
  });
}

export async function getTikTokAccessToken(request: NextRequest) {
  const accessToken = request.cookies.get(TIKTOK_COOKIE_NAMES.accessToken)?.value;
  const refreshToken = request.cookies.get(TIKTOK_COOKIE_NAMES.refreshToken)?.value;
  const expiresAt = Number(request.cookies.get(TIKTOK_COOKIE_NAMES.expiresAt)?.value ?? "0");

  if (accessToken && expiresAt > Date.now() + TOKEN_REFRESH_SKEW_MS) {
    return { accessToken, expiresAt, refreshToken, refreshedToken: null as TikTokTokenResponse | null };
  }

  if (!refreshToken) {
    return null;
  }

  const refreshedToken = await refreshTikTokAccessToken(refreshToken, request);
  return {
    accessToken: refreshedToken.access_token,
    expiresAt: Date.now() + refreshedToken.expires_in * 1000,
    refreshToken,
    refreshedToken,
  };
}

export async function getTikTokUser(accessToken: string) {
  const url = new URL(proxiedServerUrlAny(["TIKTOK_API_PROXY_BASE", "TIKTOK_PROXY_BASE"], TIKTOK_USERINFO_URL));
  url.searchParams.set("fields", "open_id,union_id,avatar_url,display_name");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as TikTokUserInfoResponse | null;
  if (!response.ok || payload?.error?.code) {
    throw new TikTokApiError(response.status, payload?.error?.message ?? "Could not load TikTok account.");
  }

  const user = payload?.data?.user;
  return {
    id: user?.open_id ?? "tiktok-user",
    name: user?.display_name ?? "TikTok account",
    imageUrl: user?.avatar_url ?? null,
  };
}
