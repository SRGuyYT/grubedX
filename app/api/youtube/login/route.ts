import { NextResponse } from "next/server";

import { buildYouTubeAuthorizeUrl, getYouTubeConfig, YOUTUBE_COOKIE_NAMES } from "@/lib/youtube";

export const runtime = "nodejs";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 10,
};

export async function GET(request: Request) {
  const config = getYouTubeConfig(request);
  if (!config.configured) {
    return NextResponse.redirect(new URL("/youtube?setup=youtube", request.url));
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildYouTubeAuthorizeUrl(request, state));
  response.cookies.set(YOUTUBE_COOKIE_NAMES.state, state, cookieOptions);
  return response;
}
