import { NextResponse } from "next/server";

import { buildEdgeCacheHeaders } from "@/lib/http/cache";
import { parsePlaybackOptions } from "@/lib/grubx/params";
import {
  buildGrubXEmbedPath,
  getEnabledProviders,
  getProviderById,
  isProviderAllowed,
  resolveGrubXProviderUrl,
  scoreServerCandidate,
} from "@/lib/grubx/providers";
import type { GrubXProvider, GrubXServerCandidate } from "@/types/grubx";

export const runtime = "nodejs";

const PLAYER_CACHE_TTL_SECONDS = 60;
const MEDIA_ID_PATTERN = /^\d+$/;
const PLAYER_HEALTH_WINDOW_MS = 5 * 60 * 1000;
type PlayerHealthResult = { checkedAt: number; latencyMs: number; ok: boolean; reason?: string };
const playerHealthCache = new Map<string, PlayerHealthResult>();

type ResolvePlayerResponse = {
  selected: GrubXServerCandidate | null;
  candidates: GrubXServerCandidate[];
};

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

const probeCandidate = async (candidateUrl: string) => {
  const cached = playerHealthCache.get(candidateUrl);
  if (cached && Date.now() - cached.checkedAt < PLAYER_HEALTH_WINDOW_MS) {
    return cached;
  }

  const startedAt = Date.now();
  try {
    let response = await fetch(candidateUrl, {
      headers: { Accept: "text/html,application/xhtml+xml" },
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(2500),
    });

    if (response.status === 405 || response.status === 501) {
      response = await fetch(candidateUrl, {
        headers: { Accept: "text/html,application/xhtml+xml" },
        redirect: "follow",
        signal: AbortSignal.timeout(3500),
      });
    }

    if (!response.ok) {
      throw new Error(`Server answered with ${response.status}`);
    }

    const result: PlayerHealthResult = { checkedAt: Date.now(), latencyMs: Date.now() - startedAt, ok: true };
    playerHealthCache.set(candidateUrl, result);
    return result;
  } catch (error) {
    const result = {
      checkedAt: Date.now(),
      latencyMs: Date.now() - startedAt,
      ok: false,
      reason: error instanceof Error ? error.message : "Server did not respond.",
    };
    playerHealthCache.set(candidateUrl, result);
    return result;
  }
};

const buildCandidate = async ({
  provider,
  mediaType,
  mediaId,
  season,
  episode,
  providerOptions,
  allowLimitedProtectionProviders,
}: {
  provider: GrubXProvider;
  mediaType: "movie" | "tv";
  mediaId: string;
  season: number;
  episode: number;
  providerOptions: ReturnType<typeof parsePlaybackOptions>;
  allowLimitedProtectionProviders: boolean;
}): Promise<GrubXServerCandidate> => {
  if (!isProviderAllowed(provider.id, { allowLimitedProtectionProviders })) {
    return {
      providerId: provider.id,
      providerName: provider.name,
      embedUrl: "",
      latencyMs: null,
      score: -9999,
      status: "blocked",
      requiresRelaxedSandbox: provider.requiresRelaxedSandbox,
      reason: "This server is blocked.",
    };
  }

  const providerUrl = resolveGrubXProviderUrl(provider.id, mediaType, mediaId, season, episode, providerOptions);
  const embedUrl = buildGrubXEmbedPath({
    provider: provider.id,
    type: mediaType,
    id: mediaId,
    season,
    episode,
    options: providerOptions,
  });
  const probe = await probeCandidate(providerUrl);
  const score = scoreServerCandidate({
    safety: provider.safety,
    priority: provider.priority,
    latencyMs: probe.ok ? probe.latencyMs : null,
  });

  return {
    providerId: provider.id,
    providerName: provider.name,
    embedUrl,
    latencyMs: probe.ok ? probe.latencyMs : null,
    score,
    status: probe.ok ? "ready" : "failed",
    requiresRelaxedSandbox: provider.requiresRelaxedSandbox,
    reason: probe.ok ? undefined : probe.reason ?? "This server did not respond.",
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaType = normalizeMediaType(searchParams.get("mediaType"));
    const mediaId = (searchParams.get("mediaId") ?? searchParams.get("id") ?? "").trim();

    if (!MEDIA_ID_PATTERN.test(mediaId)) {
      throw new Error("Invalid media id.");
    }

    const season = normalizePositiveNumber(searchParams.get("season"), 1);
    const episode = normalizePositiveNumber(searchParams.get("episode"), 1);
    const autoplayNextEpisode = searchParams.get("autoplayNextEpisode") === "true";
    const progressValue = searchParams.get("progress");
    const progress = progressValue ? Math.max(0, Number(progressValue)) : null;
    const requestedProvider = searchParams.get("provider")?.trim().toLowerCase() ?? null;
    const allowLimitedProtectionProviders = searchParams.get("allowLimitedProtectionProviders") === "true";
    const providerOptions = parsePlaybackOptions(searchParams);

    providerOptions.autoplay = providerOptions.autoplay ?? "true";
    providerOptions.color = providerOptions.color ?? "f2b35a";
    providerOptions.episodeSelector = providerOptions.episodeSelector ?? (mediaType === "tv" ? "true" : undefined);
    providerOptions.nextEpisode =
      providerOptions.nextEpisode ?? (mediaType === "tv" && autoplayNextEpisode ? "true" : undefined);

    if (typeof progress === "number" && progress > 0) {
      providerOptions.startAt = providerOptions.startAt ?? String(Math.floor(progress));
      providerOptions.progress = providerOptions.progress ?? String(Math.floor(progress));
    }

    const providers = requestedProvider
      ? [getProviderById(requestedProvider)].filter((provider): provider is GrubXProvider => Boolean(provider))
      : getEnabledProviders(mediaType, { allowLimitedProtectionProviders });

    if (
      requestedProvider &&
      (!providers[0] || !isProviderAllowed(requestedProvider, { allowLimitedProtectionProviders }))
    ) {
      throw new Error("That server is not available.");
    }

    if (providers.length === 0) {
      throw new Error("No safe servers are available.");
    }

    const candidates = await Promise.all(
      providers.map((provider) =>
        buildCandidate({
          provider,
          mediaType,
          mediaId,
          season,
          episode,
          providerOptions,
          allowLimitedProtectionProviders,
        }),
      ),
    );

    const selected =
      candidates
        .filter((candidate) => candidate.status === "ready")
        .sort((left, right) => right.score - left.score)[0] ?? null;

    return NextResponse.json(
      { selected, candidates } satisfies ResolvePlayerResponse,
      { headers: buildEdgeCacheHeaders(PLAYER_CACHE_TTL_SECONDS, PLAYER_CACHE_TTL_SECONDS * 2) },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to find a playback server." },
      { status: 400 },
    );
  }
}
