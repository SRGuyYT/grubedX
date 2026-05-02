import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { applyYouTubeTokenCookies, clearYouTubeCookies, exchangeYouTubeCode, YOUTUBE_COOKIE_NAMES } from "@/lib/youtube";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get(YOUTUBE_COOKIE_NAMES.state)?.value;

  const redirect = new URL("/youtube", request.url);

  if (!code || !state || !expectedState || decodeURIComponent(expectedState) !== state) {
    redirect.searchParams.set("youtube", "failed");
    redirect.searchParams.set("reason", "state");
    const response = NextResponse.redirect(redirect);
    clearYouTubeCookies(response);
    return response;
  }

  try {
    const token = await exchangeYouTubeCode(code, request);
    redirect.searchParams.set("youtube", "connected");
    const response = NextResponse.redirect(redirect);
    applyYouTubeTokenCookies(response, token);
    response.cookies.set(YOUTUBE_COOKIE_NAMES.state, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("YouTube OAuth callback failed", error);
    redirect.searchParams.set("youtube", "failed");
    const response = NextResponse.redirect(redirect);
    clearYouTubeCookies(response);
    return response;
  }
}
