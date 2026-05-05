import type { CustomProviderSettings, Settings } from "@/types/settings";
import { DEFAULT_GRUBX_PROVIDER, getGrubXProvider, isProviderAllowed } from "@/lib/grubx/providers";
import { appConfig } from "@/config/appConfig";

export const SETTINGS_STORAGE_KEY = "grubx_settings";
export const WATCHLIST_STORAGE_KEY = "grubx_watchlist";
export const PROGRESS_STORAGE_KEY = "grubx_progress";
export const SEARCH_STORAGE_KEY = "grubx_search";
export const LIVE_HISTORY_STORAGE_KEY = "grubx_recent_live";
export const STORAGE_EVENT_NAME = "grubx:storage";

const defaultProviderSettings = Object.fromEntries(
  appConfig.providers.map((provider) => [provider.id, provider.enabled]),
);

export const DEFAULT_FEATURE_TOGGLES: Settings["featureToggles"] = {
  movies: true,
  tv: true,
  live: true,
  anime: true,
  youtube: true,
  spotify: true,
  tiktok: true,
  search: true,
  watchlist: true,
  continueWatching: true,
  aiServer: true,
  providerReports: true,
  feedbackContact: true,
  safetyLegalPages: true,
  proxyPlayback: false,
  thirdPartyPlayback: true,
  tvModeScreenMirroring: true,
};

export const DEFAULT_SETTINGS: Settings = {
  featureToggles: DEFAULT_FEATURE_TOGGLES,
  safeMode: appConfig.SAFE_MODE,
  popupBlockerStrictness: "medium",
  recommendationsEnabled: appConfig.featureFlags.recommendations,
  embedQualityMode: "auto",
  playbackMode: "auto",
  enableServerSwitcher: true,
  showPlaybackWarnings: true,
  youtubeSafeSearch: "moderate",
  youtubeResultCount: 12,
  spotifyEmbedSize: "large",
  navStyle: "auto",
  mobileNavStyle: "auto",
  aiOpenMode: "new-tab",
  showBuildInfo: true,
  showUpdateStatus: false,
  websitePreset: "cinematic-console",
  websiteName: "GrubX",
  websiteSubtitle: "A cinematic all-in-one streaming console.",
  showLogo: true,
  logoSize: "medium",
  homeHeroTitle: "Find your next favorite story",
  homeHeroSubtitle: "Movies, TV, live streams, music, and external media in one quiet console.",
  footerText: "Progress, watchlist, and preferences stay on this device.",
  aiServerLabel: "AI Server",
  aiServerUrl: "https://xthat.sky0cloud.dpdns.org",
  themePreference: "dark",
  accentColor: "#f2b35a",
  backgroundStyle: "cinematic-gradient",
  panelOpacity: 0.035,
  borderStrength: 0.1,
  shadowStrength: 0.32,
  textSize: "normal",
  highContrastMode: false,
  cardSize: "medium",
  customCardDensity: "comfortable",
  posterShape: "rounded",
  rowSpacing: "comfortable",
  gridColumns: "auto",
  showCardMetadata: true,
  showCardDescriptions: true,
  showNavLabels: true,
  showNavIcons: true,
  navItemOrder: ["home", "movies", "tv", "live", "anime", "youtube", "tiktok", "spotify", "aiServer", "search", "settings"],
  showHomeHero: true,
  heroStyle: "full-bleed",
  autoRotateHero: true,
  heroRotationSpeed: 6500,
  showTrendingRows: true,
  defaultHomeSections: ["continueWatching", "watchlist", "trending", "popularMovies", "popularTv", "topRated"],
  homeSectionOrder: ["continueWatching", "watchlist", "trending", "popularMovies", "popularTv", "topRated"],
  defaultMediaPage: "home",
  defaultSort: "popular",
  defaultFilters: [],
  showGenreFilters: true,
  showRatingFilters: true,
  showYearFilters: true,
  resultsPerPage: 20,
  infiniteScroll: true,
  playerLayout: "fullscreen-overlay",
  autoHidePlayerControls: true,
  controlBarPosition: "top",
  defaultServerBehavior: "auto",
  showTvMirrorButton: true,
  autoFullscreenOnPlay: false,
  rememberLastProvider: true,
  tiktokEmbedMode: "embed",
  under13SafePageEnabled: true,
  providerSettings: defaultProviderSettings,
  customProviders: [],
  autoplayTrailers: false,
  theaterModeDefault: false,
  resumePlayback: true,
  rememberLastEpisode: true,
  autoplayNextEpisode: true,
  inlineTrailerMuted: true,
  showPlaybackTips: true,
  blockPopups: true,
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

const readNumberEnum = <T extends number>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === "number" && options.includes(value as T) ? (value as T) : fallback;

const readString = (value: unknown, fallback: string, maxLength = 240) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) || fallback : fallback;

const readNumberRange = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

const readStringArray = (value: unknown, fallback: string[], maxItems = 16) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, maxItems)
    : fallback;

const readFeatureToggles = (value: unknown) => {
  const input = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_FEATURE_TOGGLES).map(([key, fallback]) => [
      key,
      readBoolean(input[key], fallback),
    ]),
  ) as Settings["featureToggles"];
};

const readProvider = (value: unknown, fallback: Settings["defaultProvider"]) =>
  typeof value === "string" && getGrubXProvider(value) && isProviderAllowed(value)
    ? (value as Settings["defaultProvider"])
    : fallback;

const readProviderSettings = (value: unknown) => {
  const input = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    appConfig.providers.map((provider) => [
      provider.id,
      readBoolean(input[provider.id], provider.enabled),
    ]),
  );
};

const sanitizeCustomProviders = (value: unknown): CustomProviderSettings[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((provider, index): CustomProviderSettings | null => {
      if (!provider || typeof provider !== "object") {
        return null;
      }

      const input = provider as Partial<CustomProviderSettings>;
      const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
      const baseUrl = typeof input.baseUrl === "string" ? input.baseUrl.trim().slice(0, 500) : "";
      const embedUrlPattern =
        typeof input.embedUrlPattern === "string" ? input.embedUrlPattern.trim().slice(0, 1000) : "";

      if (!name || !baseUrl || !embedUrlPattern) {
        return null;
      }

      try {
        const parsed = new URL(baseUrl);
        if (parsed.protocol !== "https:") {
          return null;
        }
      } catch {
        return null;
      }

      return {
        id:
          typeof input.id === "string" && input.id.trim()
            ? input.id.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64)
            : `custom-${Date.now()}-${index}`,
        name,
        baseUrl,
        embedUrlPattern,
        enabled: readBoolean(input.enabled, true),
        supportsMovie: readBoolean(input.supportsMovie, true),
        supportsTv: readBoolean(input.supportsTv, true),
      };
    })
    .filter((provider): provider is CustomProviderSettings => Boolean(provider))
    .slice(0, 12);
};

export const sanitizeSettings = (input?: Partial<Settings> | null): Settings => ({
  featureToggles: readFeatureToggles(input?.featureToggles),
  safeMode: readBoolean(input?.safeMode, DEFAULT_SETTINGS.safeMode),
  popupBlockerStrictness: readEnum(
    input?.popupBlockerStrictness,
    ["low", "medium", "high"],
    DEFAULT_SETTINGS.popupBlockerStrictness,
  ),
  recommendationsEnabled: readBoolean(input?.recommendationsEnabled, DEFAULT_SETTINGS.recommendationsEnabled),
  embedQualityMode: readEnum(input?.embedQualityMode, ["auto", "data-saver", "high"], DEFAULT_SETTINGS.embedQualityMode),
  playbackMode: readEnum(input?.playbackMode, ["direct", "proxy", "auto"], DEFAULT_SETTINGS.playbackMode),
  enableServerSwitcher: readBoolean(input?.enableServerSwitcher, DEFAULT_SETTINGS.enableServerSwitcher),
  showPlaybackWarnings: readBoolean(input?.showPlaybackWarnings, DEFAULT_SETTINGS.showPlaybackWarnings),
  youtubeSafeSearch: readEnum(input?.youtubeSafeSearch, ["strict", "moderate", "off"], DEFAULT_SETTINGS.youtubeSafeSearch),
  youtubeResultCount: readNumberEnum(input?.youtubeResultCount, [8, 12, 20], DEFAULT_SETTINGS.youtubeResultCount),
  spotifyEmbedSize: readEnum(input?.spotifyEmbedSize, ["compact", "large"], DEFAULT_SETTINGS.spotifyEmbedSize),
  navStyle: readEnum(input?.navStyle, ["auto", "floating", "top-bar", "compact", "sidebar", "bottom-mobile"], DEFAULT_SETTINGS.navStyle),
  mobileNavStyle: readEnum(input?.mobileNavStyle, ["auto", "bottom-bar", "drawer", "compact-top"], DEFAULT_SETTINGS.mobileNavStyle),
  aiOpenMode: readEnum(input?.aiOpenMode, ["same-tab", "new-tab"], DEFAULT_SETTINGS.aiOpenMode),
  showBuildInfo: readBoolean(input?.showBuildInfo, DEFAULT_SETTINGS.showBuildInfo),
  showUpdateStatus: readBoolean(input?.showUpdateStatus, DEFAULT_SETTINGS.showUpdateStatus),
  websitePreset: readEnum(input?.websitePreset, ["cinematic-console", "minimal", "amoled", "glass", "compact", "big-screen-tv", "mobile-friendly"], DEFAULT_SETTINGS.websitePreset),
  websiteName: readString(input?.websiteName, DEFAULT_SETTINGS.websiteName, 80),
  websiteSubtitle: readString(input?.websiteSubtitle, DEFAULT_SETTINGS.websiteSubtitle, 180),
  showLogo: readBoolean(input?.showLogo, DEFAULT_SETTINGS.showLogo),
  logoSize: readEnum(input?.logoSize, ["small", "medium", "large"], DEFAULT_SETTINGS.logoSize),
  homeHeroTitle: readString(input?.homeHeroTitle, DEFAULT_SETTINGS.homeHeroTitle, 120),
  homeHeroSubtitle: readString(input?.homeHeroSubtitle, DEFAULT_SETTINGS.homeHeroSubtitle, 240),
  footerText: readString(input?.footerText, DEFAULT_SETTINGS.footerText, 240),
  aiServerLabel: readString(input?.aiServerLabel, DEFAULT_SETTINGS.aiServerLabel, 80),
  aiServerUrl: readString(input?.aiServerUrl, DEFAULT_SETTINGS.aiServerUrl, 500),
  themePreference: readEnum(input?.themePreference, ["system", "dark", "amoled"], DEFAULT_SETTINGS.themePreference),
  accentColor: readString(input?.accentColor, DEFAULT_SETTINGS.accentColor, 24),
  backgroundStyle: readEnum(input?.backgroundStyle, ["solid", "cinematic-gradient", "glass", "minimal"], DEFAULT_SETTINGS.backgroundStyle),
  panelOpacity: readNumberRange(input?.panelOpacity, DEFAULT_SETTINGS.panelOpacity, 0, 0.2),
  borderStrength: readNumberRange(input?.borderStrength, DEFAULT_SETTINGS.borderStrength, 0, 0.35),
  shadowStrength: readNumberRange(input?.shadowStrength, DEFAULT_SETTINGS.shadowStrength, 0, 0.8),
  textSize: readEnum(input?.textSize, ["small", "normal", "large"], DEFAULT_SETTINGS.textSize),
  highContrastMode: readBoolean(input?.highContrastMode, DEFAULT_SETTINGS.highContrastMode),
  cardSize: readEnum(input?.cardSize, ["small", "medium", "large"], DEFAULT_SETTINGS.cardSize),
  customCardDensity: readEnum(input?.customCardDensity, ["compact", "comfortable", "spacious"], DEFAULT_SETTINGS.customCardDensity),
  posterShape: readEnum(input?.posterShape, ["sharp", "rounded", "extra-rounded"], DEFAULT_SETTINGS.posterShape),
  rowSpacing: readEnum(input?.rowSpacing, ["compact", "comfortable", "spacious"], DEFAULT_SETTINGS.rowSpacing),
  gridColumns: readEnum(input?.gridColumns, ["auto", "2", "3", "4", "5", "6"], DEFAULT_SETTINGS.gridColumns),
  showCardMetadata: readBoolean(input?.showCardMetadata, DEFAULT_SETTINGS.showCardMetadata),
  showCardDescriptions: readBoolean(input?.showCardDescriptions, DEFAULT_SETTINGS.showCardDescriptions),
  showNavLabels: readBoolean(input?.showNavLabels, DEFAULT_SETTINGS.showNavLabels),
  showNavIcons: readBoolean(input?.showNavIcons, DEFAULT_SETTINGS.showNavIcons),
  navItemOrder: readStringArray(input?.navItemOrder, DEFAULT_SETTINGS.navItemOrder, 16),
  showHomeHero: readBoolean(input?.showHomeHero, DEFAULT_SETTINGS.showHomeHero),
  heroStyle: readEnum(input?.heroStyle, ["full-bleed", "compact", "poster-focused"], DEFAULT_SETTINGS.heroStyle),
  autoRotateHero: readBoolean(input?.autoRotateHero, DEFAULT_SETTINGS.autoRotateHero),
  heroRotationSpeed: readNumberRange(input?.heroRotationSpeed, DEFAULT_SETTINGS.heroRotationSpeed, 2500, 20000),
  showTrendingRows: readBoolean(input?.showTrendingRows, DEFAULT_SETTINGS.showTrendingRows),
  defaultHomeSections: readStringArray(input?.defaultHomeSections, DEFAULT_SETTINGS.defaultHomeSections, 16),
  homeSectionOrder: readStringArray(input?.homeSectionOrder, DEFAULT_SETTINGS.homeSectionOrder, 16),
  defaultMediaPage: readEnum(input?.defaultMediaPage, ["movies", "tv", "home"], DEFAULT_SETTINGS.defaultMediaPage),
  defaultSort: readEnum(input?.defaultSort, ["popular", "trending", "top-rated", "newest"], DEFAULT_SETTINGS.defaultSort),
  defaultFilters: readStringArray(input?.defaultFilters, DEFAULT_SETTINGS.defaultFilters, 24),
  showGenreFilters: readBoolean(input?.showGenreFilters, DEFAULT_SETTINGS.showGenreFilters),
  showRatingFilters: readBoolean(input?.showRatingFilters, DEFAULT_SETTINGS.showRatingFilters),
  showYearFilters: readBoolean(input?.showYearFilters, DEFAULT_SETTINGS.showYearFilters),
  resultsPerPage: readNumberRange(input?.resultsPerPage, DEFAULT_SETTINGS.resultsPerPage, 8, 60),
  infiniteScroll: readBoolean(input?.infiniteScroll, DEFAULT_SETTINGS.infiniteScroll),
  playerLayout: readEnum(input?.playerLayout, ["fullscreen-overlay", "theater", "compact"], DEFAULT_SETTINGS.playerLayout),
  autoHidePlayerControls: readBoolean(input?.autoHidePlayerControls, DEFAULT_SETTINGS.autoHidePlayerControls),
  controlBarPosition: readEnum(input?.controlBarPosition, ["top", "bottom", "floating"], DEFAULT_SETTINGS.controlBarPosition),
  defaultServerBehavior: readEnum(input?.defaultServerBehavior, ["auto", "ask-every-time", "last-used"], DEFAULT_SETTINGS.defaultServerBehavior),
  showTvMirrorButton: readBoolean(input?.showTvMirrorButton, DEFAULT_SETTINGS.showTvMirrorButton),
  autoFullscreenOnPlay: readBoolean(input?.autoFullscreenOnPlay, DEFAULT_SETTINGS.autoFullscreenOnPlay),
  rememberLastProvider: readBoolean(input?.rememberLastProvider, DEFAULT_SETTINGS.rememberLastProvider),
  tiktokEmbedMode: readEnum(input?.tiktokEmbedMode, ["embed", "link-fallback"], DEFAULT_SETTINGS.tiktokEmbedMode),
  under13SafePageEnabled: readBoolean(input?.under13SafePageEnabled, DEFAULT_SETTINGS.under13SafePageEnabled),
  providerSettings: readProviderSettings(input?.providerSettings),
  customProviders: sanitizeCustomProviders(input?.customProviders),
  autoplayTrailers: readBoolean(input?.autoplayTrailers, DEFAULT_SETTINGS.autoplayTrailers),
  theaterModeDefault: readBoolean(input?.theaterModeDefault, DEFAULT_SETTINGS.theaterModeDefault),
  resumePlayback: readBoolean(input?.resumePlayback, DEFAULT_SETTINGS.resumePlayback),
  rememberLastEpisode: readBoolean(input?.rememberLastEpisode, DEFAULT_SETTINGS.rememberLastEpisode),
  autoplayNextEpisode: readBoolean(input?.autoplayNextEpisode, DEFAULT_SETTINGS.autoplayNextEpisode),
  inlineTrailerMuted: readBoolean(input?.inlineTrailerMuted, DEFAULT_SETTINGS.inlineTrailerMuted),
  showPlaybackTips: readBoolean(input?.showPlaybackTips, DEFAULT_SETTINGS.showPlaybackTips),
  blockPopups: true,
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
