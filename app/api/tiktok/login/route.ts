import { NextResponse } from "next/server";

import { buildTikTokAuthorizeUrl, getTikTokConfig, TIKTOK_COOKIE_NAMES } from "@/lib/tiktok";

export const runtime = "nodejs";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 10,
};

export async function GET(request: Request) {
  const config = getTikTokConfig(request);
  if (!config.configured) {
    return NextResponse.redirect(new URL("/tiktok?setup=tiktok", request.url));
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildTikTokAuthorizeUrl(request, state));
  response.cookies.set(TIKTOK_COOKIE_NAMES.state, state, cookieOptions);
  return response;
}
