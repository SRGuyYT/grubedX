import { NextResponse } from "next/server";

import { clearSpotifyCookies } from "@/lib/spotify";

export const runtime = "nodejs";

export function POST() {
  const response = NextResponse.json({ ok: true });
  clearSpotifyCookies(response);
  return response;
}
