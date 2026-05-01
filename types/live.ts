export type LiveMatchScope = "live" | "all-today";

export type LiveSport = {
  id: string;
  name: string;
};

export type LiveTeam = {
  name?: string;
  badge?: string | null;
};

export type LiveSource = {
  source: string;
  id: string;
};

export type LiveStream = {
  streamNo: number;
  source: string;
  embedUrl?: string;
  language?: string;
  hd?: boolean;
};

export type LiveScoreInfo = {
  provider: "ESPN";
  homeScore: string | null;
  awayScore: string | null;
  state: "pre" | "in" | "post";
  detail: string | null;
  shortDetail: string | null;
  lastUpdated: string;
};

export type LiveMatch = {
  id: string;
  title: string;
  category: string;
  date: number;
  poster?: string;
  popular?: boolean;
  teams?: {
    home?: LiveTeam;
    away?: LiveTeam;
  };
  sources: LiveSource[];
  score?: LiveScoreInfo | null;
};

export type RankedLiveSelection = {
  bestSource: LiveSource | null;
  metrics: Array<{
    source: string;
    id: string;
    latencyMs: number | null;
    streamCount: number;
    hdCount: number;
  }>;
};
