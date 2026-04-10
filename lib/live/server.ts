import "server-only";

import type { LiveSource, LiveStream } from "@/types/live";

export const STREAMED_BASE = "https://streamed.pk";

const ALLOWED_SOURCES = new Set([
  "alpha",
  "bravo",
  "charlie",
  "delta",
  "echo",
  "foxtrot",
  "golf",
  "hotel",
  "intel",
]);

const LIVE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/;

export const assertAllowedLiveSource = (source: string) => {
  const normalized = source.trim().toLowerCase();
  if (!ALLOWED_SOURCES.has(normalized)) {
    throw new Error("Live source is not allowlisted.");
  }
  return normalized;
};

export const assertAllowedLiveId = (id: string) => {
  const normalized = id.trim();
  if (!LIVE_ID_PATTERN.test(normalized)) {
    throw new Error("Live source id is invalid.");
  }
  return normalized;
};

export const fetchLiveJson = async <T>(path: string, ttlSeconds: number) => {
  const response = await fetch(`${STREAMED_BASE}${path}`, {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: ttlSeconds },
    redirect: "error",
  });

  if (!response.ok) {
    throw new Error(`Live provider request failed: ${response.status} ${path}`);
  }

  return (await response.json()) as T;
};

export type RankedLiveSource = {
  source: LiveSource;
  streams: LiveStream[];
  latencyMs: number | null;
  score: number;
};

const getSourceScore = (streams: LiveStream[], latencyMs: number | null) => {
  const hdCount = streams.filter((stream) => stream.hd).length;
  const englishCount = streams.filter((stream) => /english/i.test(stream.language)).length;

  return streams.length * 12 + hdCount * 5 + englishCount * 4 - (latencyMs ?? 4000) / 180;
};

export const rankLiveSources = async (sources: LiveSource[]) => {
  const results = await Promise.all(
    sources.map(async (source) => {
      try {
        const safeSource = assertAllowedLiveSource(source.source);
        const safeId = assertAllowedLiveId(source.id);
        const startedAt = Date.now();
        const response = await fetch(`${STREAMED_BASE}/api/stream/${safeSource}/${encodeURIComponent(safeId)}`, {
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
          redirect: "error",
          signal: AbortSignal.timeout(4000),
        });

        if (!response.ok) {
          throw new Error(`Live provider request failed: ${response.status}`);
        }

        const streams = (await response.json()) as LiveStream[];
        const latencyMs = Date.now() - startedAt;

        return {
          source: { source: safeSource, id: safeId },
          streams,
          latencyMs,
          score: getSourceScore(streams, latencyMs),
        } satisfies RankedLiveSource;
      } catch {
        return {
          source,
          streams: [],
          latencyMs: null,
          score: Number.NEGATIVE_INFINITY,
        } satisfies RankedLiveSource;
      }
    }),
  );

  return results.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return (left.latencyMs ?? Number.POSITIVE_INFINITY) - (right.latencyMs ?? Number.POSITIVE_INFINITY);
  });
};
