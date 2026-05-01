import type { Settings } from "@/types/settings";
import { DEFAULT_GRUBX_PROVIDER, getGrubXProvider, isProviderAllowed } from "@/lib/grubx/providers";

export const SETTINGS_STORAGE_KEY = "grubx_settings";
export const WATCHLIST_STORAGE_KEY = "grubx_watchlist";
export const PROGRESS_STORAGE_KEY = "grubx_progress";
export const SEARCH_STORAGE_KEY = "grubx_search";
export const UPDATER_STORAGE_KEY = "grubx_updater";
export const LIVE_HISTORY_STORAGE_KEY = "grubx_recent_live";
export const STORAGE_EVENT_NAME = "grubx:storage";

export const DEFAULT_SETTINGS: Settings = {
  autoplayTrailers: false,
  theaterModeDefault: false,
  resumePlayback: true,
  rememberLastEpisode: true,
  autoplayNextEpisode: true,
  inlineTrailerMuted: true,
  showPlaybackTips: true,
  blockPopups: true,
  strictIframeSandbox: true,
  avoidLimitedProtectionServers: true,
  allowLimitedProtectionProviders: false,
  autoplayPlayback: true,
  defaultProvider: DEFAULT_GRUBX_PROVIDER,
  uiTheme: "dark",
  compactMode: false,
  historyEnabled: true,
  trackingEnabled: true,
  enableAnimations: true,
  amoledMode: false,
  accentGlow: true,
  largeText: false,
  showRatings: true,
  showReleaseYear: true,
  cardDensity: "comfortable",
  blurStrength: "balanced",
  showClock24h: false,
  liveClock: true,
  dataSaver: false,
  reduceBackdropUsage: false,
  lowBandwidthMode: false,
  offlineCaching: true,
  prefetchRoutes: true,
  lazyLoadRows: true,
  posterQuality: "balanced",
  liveAutoRefresh: true,
  autoFocusSearch: true,
  rememberSearchFilters: true,
  showContinueWatching: true,
  showWatchlist: true,
  showTrendingOn404: true,
  audioProfile: "cinema",
  accentTone: "ember",
};

const readBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const readEnum = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === "string" && options.includes(value as T) ? (value as T) : fallback;

const readProvider = (value: unknown, fallback: Settings["defaultProvider"]) =>
  typeof value === "string" && getGrubXProvider(value) && isProviderAllowed(value)
    ? (value as Settings["defaultProvider"])
    : fallback;

export const sanitizeSettings = (input?: Partial<Settings> | null): Settings => ({
  autoplayTrailers: readBoolean(input?.autoplayTrailers, DEFAULT_SETTINGS.autoplayTrailers),
  theaterModeDefault: readBoolean(input?.theaterModeDefault, DEFAULT_SETTINGS.theaterModeDefault),
  resumePlayback: readBoolean(input?.resumePlayback, DEFAULT_SETTINGS.resumePlayback),
  rememberLastEpisode: readBoolean(input?.rememberLastEpisode, DEFAULT_SETTINGS.rememberLastEpisode),
  autoplayNextEpisode: readBoolean(input?.autoplayNextEpisode, DEFAULT_SETTINGS.autoplayNextEpisode),
  inlineTrailerMuted: readBoolean(input?.inlineTrailerMuted, DEFAULT_SETTINGS.inlineTrailerMuted),
  showPlaybackTips: readBoolean(input?.showPlaybackTips, DEFAULT_SETTINGS.showPlaybackTips),
  blockPopups: true,
  strictIframeSandbox: readBoolean(input?.strictIframeSandbox, DEFAULT_SETTINGS.strictIframeSandbox),
  avoidLimitedProtectionServers: readBoolean(input?.avoidLimitedProtectionServers, DEFAULT_SETTINGS.avoidLimitedProtectionServers),
  allowLimitedProtectionProviders: readBoolean(input?.allowLimitedProtectionProviders, DEFAULT_SETTINGS.allowLimitedProtectionProviders),
  autoplayPlayback: readBoolean(input?.autoplayPlayback, DEFAULT_SETTINGS.autoplayPlayback),
  defaultProvider: readProvider(input?.defaultProvider, DEFAULT_SETTINGS.defaultProvider),
  uiTheme: readEnum(input?.uiTheme, ["dark", "light"], DEFAULT_SETTINGS.uiTheme),
  compactMode: readBoolean(input?.compactMode, DEFAULT_SETTINGS.compactMode),
  historyEnabled: readBoolean(input?.historyEnabled, DEFAULT_SETTINGS.historyEnabled),
  trackingEnabled: readBoolean(input?.trackingEnabled, DEFAULT_SETTINGS.trackingEnabled),
  enableAnimations: readBoolean(input?.enableAnimations, DEFAULT_SETTINGS.enableAnimations),
  amoledMode: readBoolean(input?.amoledMode, DEFAULT_SETTINGS.amoledMode),
  accentGlow: readBoolean(input?.accentGlow, DEFAULT_SETTINGS.accentGlow),
  largeText: readBoolean(input?.largeText, DEFAULT_SETTINGS.largeText),
  showRatings: readBoolean(input?.showRatings, DEFAULT_SETTINGS.showRatings),
  showReleaseYear: readBoolean(input?.showReleaseYear, DEFAULT_SETTINGS.showReleaseYear),
  cardDensity: readEnum(input?.cardDensity, ["comfortable", "compact"], DEFAULT_SETTINGS.cardDensity),
  blurStrength: readEnum(input?.blurStrength, ["soft", "balanced", "intense"], DEFAULT_SETTINGS.blurStrength),
  showClock24h: readBoolean(input?.showClock24h, DEFAULT_SETTINGS.showClock24h),
  liveClock: readBoolean(input?.liveClock, DEFAULT_SETTINGS.liveClock),
  dataSaver: readBoolean(input?.dataSaver, DEFAULT_SETTINGS.dataSaver),
  reduceBackdropUsage: readBoolean(input?.reduceBackdropUsage, DEFAULT_SETTINGS.reduceBackdropUsage),
  lowBandwidthMode: readBoolean(input?.lowBandwidthMode, DEFAULT_SETTINGS.lowBandwidthMode),
  offlineCaching: readBoolean(input?.offlineCaching, DEFAULT_SETTINGS.offlineCaching),
  prefetchRoutes: readBoolean(input?.prefetchRoutes, DEFAULT_SETTINGS.prefetchRoutes),
  lazyLoadRows: readBoolean(input?.lazyLoadRows, DEFAULT_SETTINGS.lazyLoadRows),
  posterQuality: readEnum(input?.posterQuality, ["balanced", "high", "data-saver"], DEFAULT_SETTINGS.posterQuality),
  liveAutoRefresh: readBoolean(input?.liveAutoRefresh, DEFAULT_SETTINGS.liveAutoRefresh),
  autoFocusSearch: readBoolean(input?.autoFocusSearch, DEFAULT_SETTINGS.autoFocusSearch),
  rememberSearchFilters: readBoolean(input?.rememberSearchFilters, DEFAULT_SETTINGS.rememberSearchFilters),
  showContinueWatching: readBoolean(input?.showContinueWatching, DEFAULT_SETTINGS.showContinueWatching),
  showWatchlist: readBoolean(input?.showWatchlist, DEFAULT_SETTINGS.showWatchlist),
  showTrendingOn404: readBoolean(input?.showTrendingOn404, DEFAULT_SETTINGS.showTrendingOn404),
  audioProfile: readEnum(input?.audioProfile, ["cinema", "dialog", "night"], DEFAULT_SETTINGS.audioProfile),
  accentTone: readEnum(input?.accentTone, ["ember", "electric", "aurora"], DEFAULT_SETTINGS.accentTone),
});

export const readLocalJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const emitStorageChange = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(STORAGE_EVENT_NAME, {
      detail: { key },
    }),
  );
};

export const writeLocalJson = <T>(key: string, value: T) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
  emitStorageChange(key);
};

export const removeLocalValue = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
  emitStorageChange(key);
};

export const subscribeToLocalKey = (key: string, callback: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === key) {
      callback();
    }
  };

  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<{ key?: string }>).detail;
    if (!detail?.key || detail.key === key) {
      callback();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(STORAGE_EVENT_NAME, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STORAGE_EVENT_NAME, onCustom);
  };
};
