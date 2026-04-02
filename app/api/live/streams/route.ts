import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source")?.trim();
  const id = searchParams.get("id")?.trim();

  if (!source || !id) {
    return NextResponse.json({ error: "Missing required source or id" }, { status: 400 });
  }

  const endpoint = `https://streamed.pk/api/stream/${encodeURIComponent(source)}/${encodeURIComponent(id)}`;

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch stream details" }, { status: response.status });
    }

    const payload = await response.json();
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Unable to reach stream provider" }, { status: 502 });
  }
}
