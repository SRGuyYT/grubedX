import { NextResponse } from "next/server";

import { clearTikTokCookies } from "@/lib/tiktok";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearTikTokCookies(response);
  return response;
}
