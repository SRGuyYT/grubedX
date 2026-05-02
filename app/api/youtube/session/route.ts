import { type NextRequest, NextResponse } from "next/server";

import {
  applyYouTubeTokenCookies,
  getYouTubeAccessToken,
  getYouTubeApiKey,
  getYouTubeConfig,
  getYouTubeUser,
} from "@/lib/youtube";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const config = getYouTubeConfig(request);
  const apiKeyConfigured = Boolean(getYouTubeApiKey());

  if (!config.configured && !apiKeyConfigured) {
    return NextResponse.json({
      configured: false,
      authenticated: false,
      apiKeyConfigured,
      setup: { redirectUri: config.redirectUri },
    });
  }

  const tokenState = await getYouTubeAccessToken(request).catch((error) => {
    console.error("YouTube token refresh failed", error);
    return null;
  });

  if (!tokenState?.accessToken) {
    return NextResponse.json({
      configured: config.configured,
      authenticated: false,
      apiKeyConfigured,
      setup: { redirectUri: config.redirectUri },
    });
  }

  try {
    const user = await getYouTubeUser(tokenState.accessToken);
    const response = NextResponse.json({
      configured: config.configured,
      authenticated: true,
      apiKeyConfigured,
      user,
      setup: { redirectUri: config.redirectUri },
    });

    if (tokenState.refreshedToken) {
      applyYouTubeTokenCookies(response, tokenState.refreshedToken, tokenState.refreshToken ?? undefined);
    }

    return response;
  } catch (error) {
    console.error("YouTube session lookup failed", error);
    return NextResponse.json({
      configured: config.configured,
      authenticated: false,
      apiKeyConfigured,
      setup: { redirectUri: config.redirectUri },
    });
  }
}
