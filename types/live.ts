export type LiveSport = {
  id: string;
  name: string;
};

export type LiveSource = {
  source: string;
  id: string;
};

export type LiveTeam = {
  name: string;
  badge: string;
};

export type LiveMatch = {
  id: string;
  title: string;
  category: string;
  date: number;
  poster?: string;
  popular: boolean;
  teams?: {
    home?: LiveTeam;
    away?: LiveTeam;
  };
  sources: LiveSource[];
};

export type LiveStream = {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
  viewers?: number;
};

export type LiveMatchScope = "live" | "all-today";

export type RankedLiveMetric = {
  source: string;
  id: string;
  latencyMs: number | null;
  streamCount: number;
  hdCount: number;
};

export type RankedLiveSelection = {
  bestSource: LiveSource | null;
  metrics: RankedLiveMetric[];
};
