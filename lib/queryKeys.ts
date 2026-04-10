export const queryKeys = {
  hero: ["tmdb", "hero"] as const,
  list: (scope: string, values: Record<string, string | number | null | undefined>) =>
    ["tmdb", scope, JSON.stringify(values)] as const,
  details: (mediaType: string, id: string) => ["tmdb", "details", mediaType, id] as const,
  season: (id: string, season: number) => ["tmdb", "season", id, season] as const,
  trailer: (mediaType: string, id: string) => ["tmdb", "trailer", mediaType, id] as const,
  genres: (mediaType: string) => ["tmdb", "genres", mediaType] as const,
  search: (target: string, query: string) => ["tmdb", "search", target, query] as const,
  settings: ["local", "settings"] as const,
  watchlist: ["local", "watchlist"] as const,
  continueWatching: ["local", "continue-watching"] as const,
  progress: (mediaId: string) => ["local", "progress", mediaId] as const,
  searchPreferences: ["local", "search-preferences"] as const,
  updaterState: ["local", "updater-state"] as const,
  recentLive: ["local", "recent-live"] as const,
  updateStatus: ["system", "update-status"] as const,
};
