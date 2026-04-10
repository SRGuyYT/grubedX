"use client";

import {
  DEFAULT_SETTINGS,
  PROGRESS_STORAGE_KEY,
  SEARCH_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  UPDATER_STORAGE_KEY,
  LIVE_HISTORY_STORAGE_KEY,
  WATCHLIST_STORAGE_KEY,
  removeLocalValue,
  readLocalJson,
  sanitizeSettings,
  subscribeToLocalKey,
  writeLocalJson,
} from "@/lib/settings";
import type {
  DataLayer,
  PlaybackProgress,
  RecentLiveItem,
  SearchPreferences,
  UpdaterState,
  WatchlistItem,
} from "@/types/data-layer";

const DEFAULT_SEARCH_PREFERENCES: SearchPreferences = {
  target: "all",
  lastQuery: "",
};

const DEFAULT_UPDATER_STATE: UpdaterState = {
  lastCheckedAt: null,
  latestVersion: null,
  dismissedVersion: null,
  lastError: null,
};

const MAX_RECENT_LIVE_ITEMS = 12;

const normalizeWatchlist = (items: WatchlistItem[]) =>
  items
    .filter((item) => item.mediaId.length > 0 && item.title.length > 0)
    .sort((left, right) => right.addedAt.localeCompare(left.addedAt));

const normalizeProgressMap = (input: Record<string, PlaybackProgress>) =>
  Object.fromEntries(
    Object.entries(input).map(([mediaId, progress]) => [
      mediaId,
      {
        ...progress,
        mediaId,
        season: progress.season ?? null,
        episode: progress.episode ?? null,
      } satisfies PlaybackProgress,
    ]),
  );

const getContinueWatching = () =>
  Object.values(normalizeProgressMap(getProgressMap()))
    .filter((item) => item.progress > 0 && item.progress < 95)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

const getWatchlist = () => readLocalJson<WatchlistItem[]>(WATCHLIST_STORAGE_KEY, []);
const getProgressMap = () => readLocalJson<Record<string, PlaybackProgress>>(PROGRESS_STORAGE_KEY, {});
const getRecentLive = () => readLocalJson<RecentLiveItem[]>(LIVE_HISTORY_STORAGE_KEY, []);

export const dataLayer: DataLayer = {
  async loadSettings() {
    return sanitizeSettings(readLocalJson(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS));
  },

  async saveSettings(settings) {
    const nextSettings = sanitizeSettings({
      ...readLocalJson(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS),
      ...settings,
    });
    writeLocalJson(SETTINGS_STORAGE_KEY, nextSettings);
    return nextSettings;
  },

  async loadWatchlist() {
    return normalizeWatchlist(getWatchlist());
  },

  async clearWatchlist() {
    removeLocalValue(WATCHLIST_STORAGE_KEY);
  },

  async loadContinueWatching() {
    return getContinueWatching();
  },

  subscribeWatchlist(onChange) {
    const emit = () => onChange(normalizeWatchlist(getWatchlist()));
    emit();
    return subscribeToLocalKey(WATCHLIST_STORAGE_KEY, emit);
  },

  subscribeContinueWatching(onChange) {
    const emit = () => onChange(getContinueWatching());

    emit();
    return subscribeToLocalKey(PROGRESS_STORAGE_KEY, emit);
  },

  async getPlaybackProgress(mediaId) {
    return normalizeProgressMap(getProgressMap())[mediaId] ?? null;
  },

  async savePlaybackProgress(input) {
    const progressMap = normalizeProgressMap(getProgressMap());
    progressMap[input.mediaId] = {
      mediaId: input.mediaId,
      mediaType: input.mediaType,
      title: input.title,
      posterPath: input.posterPath,
      backdropPath: input.backdropPath,
      season: input.season ?? null,
      episode: input.episode ?? null,
      currentTime: input.currentTime,
      duration: input.duration,
      progress: input.progress,
      updatedAt: new Date().toISOString(),
    };

    writeLocalJson(PROGRESS_STORAGE_KEY, progressMap);
  },

  async clearContinueWatching() {
    removeLocalValue(PROGRESS_STORAGE_KEY);
  },

  async toggleWatchlist(item) {
    const watchlist = normalizeWatchlist(getWatchlist());
    const existingIndex = watchlist.findIndex((entry) => entry.mediaId === item.mediaId);

    if (existingIndex >= 0) {
      watchlist.splice(existingIndex, 1);
      writeLocalJson(WATCHLIST_STORAGE_KEY, watchlist);
      return { saved: false, items: watchlist };
    }

    const nextItems = normalizeWatchlist([
      { ...item, addedAt: new Date().toISOString() },
      ...watchlist,
    ]);
    writeLocalJson(WATCHLIST_STORAGE_KEY, nextItems);
    return { saved: true, items: nextItems };
  },

  async loadSearchPreferences() {
    return {
      ...DEFAULT_SEARCH_PREFERENCES,
      ...readLocalJson<SearchPreferences>(SEARCH_STORAGE_KEY, DEFAULT_SEARCH_PREFERENCES),
    };
  },

  async saveSearchPreferences(next) {
    const merged = {
      ...DEFAULT_SEARCH_PREFERENCES,
      ...readLocalJson<SearchPreferences>(SEARCH_STORAGE_KEY, DEFAULT_SEARCH_PREFERENCES),
      ...next,
    };
    writeLocalJson(SEARCH_STORAGE_KEY, merged);
    return merged;
  },

  async loadUpdaterState() {
    return {
      ...DEFAULT_UPDATER_STATE,
      ...readLocalJson<UpdaterState>(UPDATER_STORAGE_KEY, DEFAULT_UPDATER_STATE),
    };
  },

  async saveUpdaterState(next) {
    const merged = {
      ...DEFAULT_UPDATER_STATE,
      ...readLocalJson<UpdaterState>(UPDATER_STORAGE_KEY, DEFAULT_UPDATER_STATE),
      ...next,
    };
    writeLocalJson(UPDATER_STORAGE_KEY, merged);
    return merged;
  },

  async loadRecentLive() {
    return getRecentLive().sort((left, right) => right.watchedAt.localeCompare(left.watchedAt));
  },

  async saveRecentLive(item) {
    const nextItems = [
      item,
      ...getRecentLive().filter(
        (entry) =>
          !(
            entry.matchId === item.matchId &&
            entry.source === item.source &&
            entry.streamNo === item.streamNo
          ),
      ),
    ]
      .sort((left, right) => right.watchedAt.localeCompare(left.watchedAt))
      .slice(0, MAX_RECENT_LIVE_ITEMS);

    writeLocalJson(LIVE_HISTORY_STORAGE_KEY, nextItems);
    return nextItems;
  },
};
