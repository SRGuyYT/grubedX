"use client";

import { EmptyState } from "@/components/feedback/EmptyState";
import { MediaRow } from "@/components/media/MediaRow";
import { useSettingsContext } from "@/context/SettingsContext";
import { useWatchlistSubscription } from "@/hooks/useWatchlistSubscription";
import type { MediaItem } from "@/types/media";

export function WatchlistRow({
  showEmpty = false,
  title = "Watchlist",
  description = "Your saved queue, ready when you are.",
  emptyTitle = "Your watchlist is empty",
  emptyDescription = "Save a movie or show and it will appear here.",
}: {
  showEmpty?: boolean;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { ready, settings } = useSettingsContext();
  const query = useWatchlistSubscription();
  const items = (query.data ?? []).map(
    (item) =>
      ({
        id: item.mediaId,
        tmdbId: Number(item.mediaId),
        title: item.title,
        mediaType: item.mediaType,
        overview: "Saved for later.",
        posterPath: item.posterPath,
        backdropPath: item.backdropPath,
        releaseDate: item.addedAt,
        rating: item.rating,
        voteCount: null,
      }) satisfies MediaItem,
  );

  if (!ready || query.isBootstrapping || !settings.showWatchlist) {
    return null;
  }

  if (items.length === 0) {
    return showEmpty ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null;
  }

  return <MediaRow title={title} description={description} items={items} />;
}
