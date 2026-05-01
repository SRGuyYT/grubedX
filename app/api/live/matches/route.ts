import { NextResponse } from "next/server";

import { buildEdgeCacheHeaders } from "@/lib/http/cache";
import type { LiveMatch, LiveScoreInfo } from "@/types/live";

const LIVE_MATCHES_ENDPOINT = "https://streamed.pk/api/matches/live";
const TODAY_MATCHES_ENDPOINT = "https://streamed.pk/api/matches/all-today";
const ESPN_SCOREBOARD_BASE = "https://site.api.espn.com/apis/site/v2/sports";

const SCOREBOARD_BY_CATEGORY: Partial<Record<string, Array<{ sport: string; league: string }>>> = {
  "american-football": [{ sport: "football", league: "nfl" }],
  baseball: [{ sport: "baseball", league: "mlb" }],
  basketball: [{ sport: "basketball", league: "nba" }],
  hockey: [{ sport: "hockey", league: "nhl" }],
};

export const runtime = "nodejs";

type EspnCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  team?: {
    displayName?: string;
    shortDisplayName?: string;
    name?: string;
    location?: string;
  };
};

type EspnEvent = {
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    status?: EspnStatus;
  }>;
  status?: EspnStatus;
};

type EspnStatus = {
  type?: {
    state?: "pre" | "in" | "post";
    detail?: string;
    shortDetail?: string;
  };
};

type EspnScoreboard = {
  events?: EspnEvent[];
};

const getEasternDayKey = (timestamp: number) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).format(new Date(timestamp));

const getEspnDateKey = (timestamp: number) =>
  new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  })
    .format(new Date(timestamp))
    .replaceAll("-", "");

const normalizeName = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(fc|cf|sc|the)\b/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const competitorNames = (competitor?: EspnCompetitor) =>
  [
    competitor?.team?.displayName,
    competitor?.team?.shortDisplayName,
    competitor?.team?.name,
    competitor?.team?.location,
  ]
    .map(normalizeName)
    .filter(Boolean);

const namesMatch = (left?: string, rightNames: string[] = []) => {
  const normalized = normalizeName(left);
  if (!normalized) {
    return false;
  }

  return rightNames.some((candidate) => candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate));
};

const fetchEspnEvents = async (category: string, dateKey: string) => {
  const scoreboards = SCOREBOARD_BY_CATEGORY[category] ?? [];
  const results = await Promise.allSettled(
    scoreboards.map(async ({ sport, league }) => {
      const response = await fetch(`${ESPN_SCOREBOARD_BASE}/${sport}/${league}/scoreboard?dates=${dateKey}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(3500),
      });

      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as EspnScoreboard;
      return payload.events ?? [];
    }),
  );

  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
};

const buildScoreInfo = (event: EspnEvent, swapped = false): LiveScoreInfo | null => {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];
  const home = competitors.find((competitor) => competitor.homeAway === "home");
  const away = competitors.find((competitor) => competitor.homeAway === "away");
  const status = competition?.status ?? event.status;
  const state = status?.type?.state;

  if (!home || !away || !state) {
    return null;
  }

  return {
    provider: "ESPN",
    homeScore: (swapped ? away.score : home.score) ?? null,
    awayScore: (swapped ? home.score : away.score) ?? null,
    state,
    detail: status.type?.detail ?? null,
    shortDetail: status.type?.shortDetail ?? null,
    lastUpdated: new Date().toISOString(),
  };
};

const enrichMatchesWithScores = async (matches: LiveMatch[]) => {
  const supportedMatches = matches.filter((match) => SCOREBOARD_BY_CATEGORY[match.category]?.length);
  const requestedBoards = Array.from(
    new Set(supportedMatches.map((match) => `${match.category}:${getEspnDateKey(match.date)}`)),
  ).slice(0, 12);

  const eventsByBoard = new Map<string, EspnEvent[]>();
  await Promise.all(
    requestedBoards.map(async (key) => {
      const [category, dateKey] = key.split(":");
      eventsByBoard.set(key, await fetchEspnEvents(category, dateKey));
    }),
  );

  return matches.map((match) => {
    const key = `${match.category}:${getEspnDateKey(match.date)}`;
    const events = eventsByBoard.get(key) ?? [];
    const homeName = match.teams?.home?.name;
    const awayName = match.teams?.away?.name;

    let score: LiveScoreInfo | null = null;

    events.find((candidate) => {
      const competitors = candidate.competitions?.[0]?.competitors ?? [];
      const home = competitors.find((competitor) => competitor.homeAway === "home");
      const away = competitors.find((competitor) => competitor.homeAway === "away");
      const directMatch = namesMatch(homeName, competitorNames(home)) && namesMatch(awayName, competitorNames(away));
      const swappedMatch = namesMatch(homeName, competitorNames(away)) && namesMatch(awayName, competitorNames(home));

      if (directMatch || swappedMatch) {
        score = buildScoreInfo(candidate, swappedMatch);
        return true;
      }

      return false;
    });

    return {
      ...match,
      score,
    };
  });
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "all-today" ? "all-today" : "live";
  const popular = searchParams.get("popular") === "true";
  const endpoint = `${scope === "all-today" ? TODAY_MATCHES_ENDPOINT : LIVE_MATCHES_ENDPOINT}${popular ? "/popular" : ""}`;
  const ttlSeconds = scope === "live" ? 30 : 120;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: ttlSeconds },
      redirect: "error",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch live matches" }, { status: response.status });
    }

    const payload = (await response.json()) as LiveMatch[];
    const todayKey = getEasternDayKey(Date.now());
    const matches = scope === "all-today" ? payload.filter((match) => getEasternDayKey(match.date) === todayKey) : payload;
    const enrichedMatches = await enrichMatchesWithScores(matches);

    return NextResponse.json(enrichedMatches, {
      headers: buildEdgeCacheHeaders(ttlSeconds, scope === "live" ? 90 : 600),
    });
  } catch {
    return NextResponse.json({ error: "Unable to reach live matches provider" }, { status: 502 });
  }
}
