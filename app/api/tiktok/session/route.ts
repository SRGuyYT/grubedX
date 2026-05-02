import { type NextRequest, NextResponse } from "next/server";

import { applyTikTokTokenCookies, getTikTokAccessToken, getTikTokConfig, getTikTokUser } from "@/lib/tiktok";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const config = getTikTokConfig(request);
  if (!config.configured) {
    return NextResponse.json({
      configured: false,
      authenticated: false,
      setup: { redirectUri: config.redirectUri },
    });
  }

  const tokenState = await getTikTokAccessToken(request).catch((error) => {
    console.error("TikTok token refresh failed", error);
    return null;
  });

  if (!tokenState?.accessToken) {
    return NextResponse.json({
      configured: config.configured,
      authenticated: false,
      setup: { redirectUri: config.redirectUri },
    });
  }

  try {
    const user = await getTikTokUser(tokenState.accessToken);
    const response = NextResponse.json({
      configured: config.configured,
      authenticated: true,
      user,
      setup: { redirectUri: config.redirectUri },
    });

    if (tokenState.refreshedToken) {
      applyTikTokTokenCookies(response, tokenState.refreshedToken, tokenState.refreshToken ?? undefined);
    }

    return response;
  } catch (error) {
    console.error("TikTok session lookup failed", error);
    return NextResponse.json({
      configured: config.configured,
      authenticated: false,
      setup: { redirectUri: config.redirectUri },
    });
  }
}
