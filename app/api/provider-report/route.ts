import { NextResponse } from "next/server";

import { getClientIp, checkRateLimit } from "@/lib/http/rateLimit";
import { sendMatrixAlert } from "@/lib/grubx/matrix";
import { getProviderById } from "@/lib/grubx/providers";
import type { GrubXProviderReportReason } from "@/types/grubx";

export const runtime = "nodejs";

const REPORT_REASONS = ["popups", "adult-ads", "redirects", "broken", "wrong-title", "other"] as const;
const REASON_LABELS: Record<GrubXProviderReportReason, string> = {
  popups: "Popups / new tabs",
  "adult-ads": "Adult or unsafe ads",
  redirects: "Redirects",
  broken: "Broken player",
  "wrong-title": "Wrong movie/show",
  other: "Other",
};

const clampText = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({ key: `provider-report:${ip}` });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many reports. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const providerId = clampText(body.providerId, 80).toLowerCase();
    const provider = providerId ? getProviderById(providerId) : null;
    const providerName = clampText(body.providerName, 120) || provider?.name || "Unknown server";
    const reason = body.reason;

    if (!providerId || !provider) {
      return NextResponse.json({ error: "Choose a valid server to report." }, { status: 400 });
    }

    if (typeof reason !== "string" || !REPORT_REASONS.includes(reason as GrubXProviderReportReason)) {
      return NextResponse.json({ error: "Choose a valid report reason." }, { status: 400 });
    }

    const mediaType = body.mediaType === "movie" || body.mediaType === "tv" ? body.mediaType : "unknown";
    const tmdbId = clampText(body.tmdbId, 40) || "Unknown";
    const title = clampText(body.title, 160) || "Unknown title";
    const pageUrl = clampText(body.pageUrl, 500) || "Unknown page";
    const details = clampText(body.details, 1000);
    const reasonLabel = REASON_LABELS[reason as GrubXProviderReportReason];

    await sendMatrixAlert(
      [
        "[Report] GrubX Provider Report",
        "",
        `Provider: ${providerName} (${providerId})`,
        `Reason: ${reasonLabel}`,
        `Title: ${title}`,
        `Type: ${mediaType}`,
        `TMDB ID: ${tmdbId}`,
        `Page: ${pageUrl}`,
        "",
        "Details:",
        details || "No extra details provided.",
      ].join("\n"),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Provider report failed", error);
    return NextResponse.json({ error: "Unable to send your report right now." }, { status: 500 });
  }
}
