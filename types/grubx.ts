export type GrubXMediaType = "movie" | "tv" | "anime";

export type GrubXProviderId =
  | "vidfast"
  | "vidfast-pro"
  | "vidfast-in"
  | "vidfast-io"
  | "vidfast-me"
  | "vidfast-net"
  | "vidfast-pm"
  | "vidfast-xyz"
  | "vidcore"
  | "vidlink"
  | "vidfun"
  | "vidrock"
  | "videasy"
  | "vidking"
  | "zxcstream";

export type GrubXProviderSafety = "safe" | "unknown" | "blocked";

export type PlaybackOptions = {
  theme?: string;
  color?: string;
  title?: string;
  poster?: string;
  overlay?: string;
  autoplay?: string;
  autoPlay?: string;
  startAt?: string;
  progress?: string;
  server?: string;
  sub?: string;
  nextEpisode?: string;
  autoNext?: string;
  episodeSelector?: string;
  fullscreenButton?: string;
  chromecast?: string;
  hideServer?: string;
};

export type GrubXProvider = {
  id: GrubXProviderId;
  name: string;
  baseUrl: string;
  enabled: boolean;
  safety: GrubXProviderSafety;
  priority: number;
  supportsMovie: boolean;
  supportsTv: boolean;
  requiresRelaxedSandbox?: boolean;
  notes?: string;
  movie(id: string, options?: PlaybackOptions): string;
  tv(id: string, season: number, episode: number, options?: PlaybackOptions): string;
  anime?(id: string, episode?: number, options?: PlaybackOptions): string;
  capabilities: {
    subtitles: boolean;
    quality: boolean;
    casting: boolean;
  };
};

export type GrubXServerCandidate = {
  providerId: string;
  providerName: string;
  embedUrl: string;
  latencyMs: number | null;
  score: number;
  status: "untested" | "testing" | "ready" | "failed" | "blocked";
  requiresRelaxedSandbox?: boolean;
  reason?: string;
};

export type GrubXProviderReportReason =
  | "popups"
  | "adult-ads"
  | "redirects"
  | "broken"
  | "wrong-title"
  | "other";

export type GrubXFeedbackCategory =
  | "add"
  | "fix"
  | "remove"
  | "change"
  | "report"
  | "other";

export type GrubXEventName =
  | "play"
  | "pause"
  | "seeked"
  | "ended"
  | "timeupdate"
  | "mediaReady"
  | "providerSwitch"
  | "popupToggle";

export type GrubXEventPayload = {
  type: "GRUBX_EVENT";
  provider: string;
  data: {
    event: GrubXEventName;
    currentTime?: number;
    duration?: number;
    id?: string;
  };
};

export type GrubXControlMessage =
  | { type: "GRUBX_CONTROL"; action: "play" }
  | { type: "GRUBX_CONTROL"; action: "pause" }
  | { type: "GRUBX_CONTROL"; action: "seek"; time: number }
  | { type: "GRUBX_CONTROL"; action: "setVolume"; value: number }
  | { type: "GRUBX_CONTROL"; action: "mute"; muted: boolean }
  | { type: "GRUBX_CONTROL"; action: "getStatus" };

export type GrubXPopupState = {
  enabled: boolean;
  ads: boolean;
  serverSwitch: boolean;
  nextEpisode: boolean;
  overlays: boolean;
};

export type GrubXAccount = {
  userId: "local";
  favorites: string[];
  watchHistory: GrubXWatchHistoryItem[];
  settings: Record<string, unknown>;
  lastWatched: Record<string, GrubXWatchProgress>;
};

export type GrubXWatchProgress = {
  id: string;
  mediaType: GrubXMediaType;
  provider: string;
  title?: string;
  season?: number | null;
  episode?: number | null;
  currentTime: number;
  duration: number;
  updatedAt: string;
};

export type GrubXWatchHistoryItem = GrubXWatchProgress & {
  progress: number;
};
