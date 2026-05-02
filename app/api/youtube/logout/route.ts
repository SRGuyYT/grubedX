import { NextResponse } from "next/server";

import { clearYouTubeCookies } from "@/lib/youtube";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearYouTubeCookies(response);
  return response;
}
