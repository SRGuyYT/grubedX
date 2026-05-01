import type {
  LiveMatch,
  LiveMatchScope,
  LiveSource,
  LiveSport,
  LiveStream,
  RankedLiveSelection,
} from "@/types/live";

const STREAMED_BASE = "https://streamed.pk";

const fetchJson = async <T>(input: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(input, {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
};

export const getClientLiveSports = (signal?: AbortSignal) => fetchJson<LiveSport[]>("/api/live/sports", signal);

export const getClientLiveMatches = (
  options: {
    scope: LiveMatchScope;
    popular?: boolean;
  },
  signal?: AbortSignal,
) => {
  const params = new URLSearchParams({
    scope: options.scope,
  });

  if (options.popular) {
    params.set("popular", "true");
  }

  return fetchJson<LiveMatch[]>(`/api/live/matches?${params.toString()}`, signal);
};

export const getClientLiveStreams = (source: LiveSource, signal?: AbortSignal) => {
  const params = new URLSearchParams({
    source: source.source,
    id: source.id,
  });

  return fetchJson<LiveStream[]>(`/api/live/streams?${params.toString()}`, signal);
};

export const getClientBestLiveSource = async (sources: LiveSource[], signal?: AbortSignal) => {
  const response = await fetch("/api/live/best", {
    body: JSON.stringify({ sources }),
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to rank live sources.");
  }

  return (await response.json()) as RankedLiveSelection;
};

export const resolveLivePosterUrl = (match: LiveMatch) => {
  if (match.poster) {
    const path = match.poster.startsWith("/") ? match.poster : `/${match.poster}`;
    return path.endsWith(".webp") ? `${STREAMED_BASE}${path}` : `${STREAMED_BASE}${path}.webp`;
  }

  const homeBadge = match.teams?.home?.badge;
  const awayBadge = match.teams?.away?.badge;
  if (homeBadge && awayBadge) {
    return `${STREAMED_BASE}/api/images/poster/${homeBadge}/${awayBadge}.webp`;
  }

  return "/512x512.png";
};

export const resolveLiveBadgeUrl = (badge?: string | null) => {
  if (!badge) {
    return null;
  }

  return `${STREAMED_BASE}/api/images/badge/${badge}.webp`;
};

export const formatLiveStart = (timestamp: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
