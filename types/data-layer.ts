import type { MediaType, SearchTarget } from "@/types/media";
import type { Settings } from "@/types/settings";

export type WatchlistItem = {
  mediaId: string;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  rating: number | null;
  addedAt: string;
};

export type PlaybackProgress = {
  mediaId: string;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  season: number | null;
  episode: number | null;
  currentTime: number;
  duration: number;
  progress: number;
  updatedAt: string;
};

export type SavePlaybackProgressInput = {
  mediaId: string;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  season?: number | null;
  episode?: number | null;
  currentTime: number;
  duration: number;
  progress: number;
};

export type SearchPreferences = {
  target: SearchTarget;
  lastQuery: string;
};

export type UpdaterState = {
  lastCheckedAt: string | null;
  latestVersion: string | null;
  dismissedVersion: string | null;
  lastError: string | null;
};

export type RecentLiveItem = {
  matchId: string;
  title: string;
  category: string;
  posterUrl: string;
  source: string;
  streamNo: number;
  watchedAt: string;
};

export interface DataLayer {
  loadSettings(): Promise<Settings>;
  saveSettings(settings: Partial<Settings>): Promise<Settings>;
  loadWatchlist(): Promise<WatchlistItem[]>;
  clearWatchlist(): Promise<void>;
  loadContinueWatching(): Promise<PlaybackProgress[]>;
  subscribeWatchlist(
    onChange: (items: WatchlistItem[]) => void,
    onError?: (error: Error) => void,
  ): () => void;
  subscribeContinueWatching(
    onChange: (items: PlaybackProgress[]) => void,
    onError?: (error: Error) => void,
  ): () => void;
  getPlaybackProgress(mediaId: string): Promise<PlaybackProgress | null>;
  savePlaybackProgress(input: SavePlaybackProgressInput): Promise<void>;
  clearContinueWatching(): Promise<void>;
  toggleWatchlist(
    item: Omit<WatchlistItem, "addedAt">,
  ): Promise<{ saved: boolean; items?: WatchlistItem[] }>;
  loadSearchPreferences(): Promise<SearchPreferences>;
  saveSearchPreferences(next: Partial<SearchPreferences>): Promise<SearchPreferences>;
  loadUpdaterState(): Promise<UpdaterState>;
  saveUpdaterState(next: Partial<UpdaterState>): Promise<UpdaterState>;
  loadRecentLive(): Promise<RecentLiveItem[]>;
  saveRecentLive(item: RecentLiveItem): Promise<RecentLiveItem[]>;
}
