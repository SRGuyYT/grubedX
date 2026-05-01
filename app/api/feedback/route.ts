import { NextResponse } from "next/server";

import { getClientIp, checkRateLimit } from "@/lib/http/rateLimit";
import { sendMatrixAlert } from "@/lib/grubx/matrix";
import type { GrubXFeedbackCategory } from "@/types/grubx";

export const runtime = "nodejs";

const CATEGORIES = ["add", "fix", "remove", "change", "report", "other"] as const;
const AREAS = [
  "player",
  "movies",
  "tv",
  "live",
  "search",
  "settings",
  "watchlist",
  "continue-watching",
  "design-ui",
  "account-data",
  "external-media",
  "other",
] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

const CATEGORY_LABELS: Record<GrubXFeedbackCategory, string> = {
  add: "Add",
  fix: "Fix",
  remove: "Remove",
  change: "Change",
  report: "Report",
  other: "Other",
};

const CATEGORY_ICON: Record<GrubXFeedbackCategory, string> = {
  add: "[Add]",
  fix: "[Fix]",
  remove: "[Remove]",
  change: "[Change]",
  report: "[Report]",
  other: "[Other]",
};

const AREA_LABELS: Record<(typeof AREAS)[number], string> = {
  player: "Player",
  movies: "Movies",
  tv: "TV",
  live: "Live TV",
  search: "Search",
  settings: "Settings",
  watchlist: "Watchlist",
  "continue-watching": "Continue Watching",
  "design-ui": "Design/UI",
  "account-data": "Account/Data",
  "external-media": "External Media",
  other: "Other",
};

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const clampText = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit({ key: `feedback:${ip}` });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const category = body.category;
    const area = body.area;
    const priority = body.priority;
    const title = clampText(body.title, 120);
    const message = clampText(body.message, 1500);
    const pageUrl = clampText(body.pageUrl, 500);

    if (typeof category !== "string" || !CATEGORIES.includes(category as GrubXFeedbackCategory)) {
      return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
    }

    if (typeof area !== "string" || !AREAS.includes(area as (typeof AREAS)[number])) {
      return NextResponse.json({ error: "Choose a valid area." }, { status: 400 });
    }

    if (typeof priority !== "string" || !PRIORITIES.includes(priority as (typeof PRIORITIES)[number])) {
      return NextResponse.json({ error: "Choose a valid priority." }, { status: 400 });
    }

    if (!title || !message) {
      return NextResponse.json({ error: "Add a title and message before sending." }, { status: 400 });
    }

    const feedbackCategory = category as GrubXFeedbackCategory;
    const feedbackArea = area as (typeof AREAS)[number];

    await sendMatrixAlert(
      [
        `${CATEGORY_ICON[feedbackCategory]} GrubX Feedback`,
        "",
        `Category: ${CATEGORY_LABELS[feedbackCategory]}`,
        `Area: ${AREA_LABELS[feedbackArea]}`,
        `Priority: ${toTitleCase(priority)}`,
        `Title: ${title}`,
        `Page: ${pageUrl || "Unknown page"}`,
        "",
        "Message:",
        message,
      ].join("\n"),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Feedback submission failed", error);
    return NextResponse.json({ error: "Unable to send your feedback right now." }, { status: 500 });
  }
}
