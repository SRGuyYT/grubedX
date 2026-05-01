import { NextResponse } from "next/server";

import { buildSpotifyAuthorizeUrl, getSpotifyConfig, SPOTIFY_COOKIE_NAMES } from "@/lib/spotify";

export const runtime = "nodejs";

export function GET(request: Request) {
  const config = getSpotifyConfig(request);
  if (!config.configured) {
    return NextResponse.redirect(new URL("/spotify?spotify=setup-required", request.url));
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildSpotifyAuthorizeUrl(request, state));
  response.cookies.set(SPOTIFY_COOKIE_NAMES.state, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return response;
}
