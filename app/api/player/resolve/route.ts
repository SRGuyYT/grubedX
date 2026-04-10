import { NextResponse } from "next/server";

import { buildEdgeCacheHeaders } from "@/lib/http/cache";
import { env, readServerEnv } from "@/lib/env";

export const runtime = "nodejs";

const PLAYER_CACHE_TTL_SECONDS = 60;

const MEDIA_ID_PATTERN = /^\d+$/;
const PLAYER_HEALTH_WINDOW_MS = 5 * 60 * 1000;
const playerHealthCache = new Map<string, { checkedAt: number; latencyMs: number; ok: boolean }>();

const normalizeMediaType = (value: string | null) => {
  if (value === "movie" || value === "tv") {
    return value;
  }

  throw new Error("Unsupported media type.");
};

const normalizePositiveNumber = (value: string | null, fallback = 1) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Invalid numeric parameter.");
  }

  return parsed;
};

const getPlayerCandidates = () => {
  const configured = readServerEnv("PLAYER_EMBED_BASES") ?? env.vidkingBase;
  const deduped = new Set(
    configured
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  return Array.from(deduped).map((entry) => {
    const url = new URL(entry);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Player candidate must use http or https.");
    }

    return url.toString().replace(/\/$/, "");
  });
};

const buildPlayerUrl = (
  baseUrl: string,
  options: {
    mediaType: "movie" | "tv";
    mediaId: string;
    season: number;
    episode: number;
    autoplayNextEpisode: boolean;
    progress: number | null;
  },
) => {
  const params = new URLSearchParams({
    autoPlay: "true",
    color: "ff5a2a",
  });

  if (options.mediaType === "tv") {
    params.set("episodeSelector", "true");
    if (options.autoplayNextEpisode) {
      params.set("nextEpisode", "true");
    }
  }

  if (typeof options.progress === "number" && options.progress > 0) {
    params.set("progress", String(Math.floor(options.progress)));
  }

  const path =
    options.mediaType === "movie"
      ? `/movie/${options.mediaId}`
      : `/tv/${options.mediaId}/${options.season}/${options.episode}`;

  return `${baseUrl}${path}?${params.toString()}`;
};

const probeCandidate = async (candidateUrl: string) => {
  const cached = playerHealthCache.get(candidateUrl);
  if (cached && Date.now() - cached.checkedAt < PLAYER_HEALTH_WINDOW_MS) {
    return cached;
  }

  const startedAt = Date.now();
  try {
    let response = await fetch(candidateUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
      },
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(2500),
    });

    if (response.status === 405 || response.status === 501) {
      response = await fetch(candidateUrl, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(3500),
      });
    }

    if (!response.ok) {
      throw new Error(`Probe failed with ${response.status}`);
    }

    const result = {
      checkedAt: Date.now(),
      latencyMs: Date.now() - startedAt,
      ok: true,
    };
    playerHealthCache.set(candidateUrl, result);
    return result;
  } catch {
    const result = {
      checkedAt: Date.now(),
      latencyMs: Date.now() - startedAt,
      ok: false,
    };
    playerHealthCache.set(candidateUrl, result);
    return result;
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaType = normalizeMediaType(searchParams.get("mediaType"));
    const mediaId = searchParams.get("mediaId")?.trim() ?? "";

    if (!MEDIA_ID_PATTERN.test(mediaId)) {
      throw new Error("Invalid media id.");
    }

    const season = normalizePositiveNumber(searchParams.get("season"), 1);
    const episode = normalizePositiveNumber(searchParams.get("episode"), 1);
    const autoplayNextEpisode = searchParams.get("autoplayNextEpisode") === "true";
    const progressValue = searchParams.get("progress");
    const progress = progressValue ? Math.max(0, Number(progressValue)) : null;

    const candidates = getPlayerCandidates();
    const resolvedUrls = candidates.map((baseUrl) =>
      buildPlayerUrl(baseUrl, {
        autoplayNextEpisode,
        episode,
        mediaId,
        mediaType,
        progress,
        season,
      }),
    );

    const probes = await Promise.all(
      resolvedUrls.map(async (url) => ({
        url,
        probe: await probeCandidate(url),
      })),
    );

    const best = probes
      .slice()
      .sort((left, right) => {
        if (left.probe.ok !== right.probe.ok) {
          return Number(right.probe.ok) - Number(left.probe.ok);
        }

        return left.probe.latencyMs - right.probe.latencyMs;
      })[0];

    return NextResponse.json(
      {
        url: best?.url ?? resolvedUrls[0],
        latencyMs: best?.probe.latencyMs ?? null,
        candidateCount: resolvedUrls.length,
      },
      {
        headers: buildEdgeCacheHeaders(PLAYER_CACHE_TTL_SECONDS, PLAYER_CACHE_TTL_SECONDS * 2),
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to resolve player source.",
      },
      { status: 400 },
    );
  }
}
