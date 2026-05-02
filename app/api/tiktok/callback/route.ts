import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { applyTikTokTokenCookies, clearTikTokCookies, exchangeTikTokCode, TIKTOK_COOKIE_NAMES } from "@/lib/tiktok";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get(TIKTOK_COOKIE_NAMES.state)?.value;

  const redirect = new URL("/tiktok", request.url);

  if (!code || !state || !expectedState || decodeURIComponent(expectedState) !== state) {
    redirect.searchParams.set("tiktok", "failed");
    redirect.searchParams.set("reason", "state");
    const response = NextResponse.redirect(redirect);
    clearTikTokCookies(response);
    return response;
  }

  try {
    const token = await exchangeTikTokCode(code, request);
    redirect.searchParams.set("tiktok", "connected");
    const response = NextResponse.redirect(redirect);
    applyTikTokTokenCookies(response, token);
    response.cookies.set(TIKTOK_COOKIE_NAMES.state, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("TikTok OAuth callback failed", error);
    redirect.searchParams.set("tiktok", "failed");
    const response = NextResponse.redirect(redirect);
    clearTikTokCookies(response);
    return response;
  }
}
