import { NextRequest, NextResponse } from "next/server";

import {
  applySpotifyTokenCookies,
  buildFrontendRedirect,
  clearSpotifyCookies,
  exchangeSpotifyCode,
  SPOTIFY_COOKIE_NAMES,
  SpotifyApiError,
} from "@/lib/spotify";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const expectedState = request.cookies.get(SPOTIFY_COOKIE_NAMES.state)?.value;
  const redirectUrl = buildFrontendRedirect("/spotify", request);

  if (error) {
    redirectUrl.searchParams.set("spotify", "denied");
    const response = NextResponse.redirect(redirectUrl);
    clearSpotifyCookies(response);
    return response;
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    redirectUrl.searchParams.set("spotify", "invalid-state");
    const response = NextResponse.redirect(redirectUrl);
    clearSpotifyCookies(response);
    return response;
  }

  try {
    const token = await exchangeSpotifyCode(code, request);
    redirectUrl.searchParams.set("spotify", "connected");
    const response = NextResponse.redirect(redirectUrl);
    applySpotifyTokenCookies(response, token);
    response.cookies.set(SPOTIFY_COOKIE_NAMES.state, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (caught) {
    redirectUrl.searchParams.set("spotify", caught instanceof SpotifyApiError ? "auth-failed" : "error");
    const response = NextResponse.redirect(redirectUrl);
    clearSpotifyCookies(response);
    return response;
  }
}
