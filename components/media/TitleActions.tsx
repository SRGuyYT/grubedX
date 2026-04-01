"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Play, Ticket } from "lucide-react";
import { toast } from "sonner";

import { PlaybackTheater } from "@/components/media/PlaybackTheater";
import { TrailerModal } from "@/components/media/TrailerModal";
import { useSettingsContext } from "@/context/SettingsContext";
import { useWatchlistSubscription } from "@/hooks/useWatchlistSubscription";
import { queryKeys } from "@/lib/queryKeys";
import { dataLayer } from "@/lib/dataLayer";
import type { MediaDetails } from "@/types/media";

export function TitleActions({ media }: { media: MediaDetails }) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const queryClient = useQueryClient();
  const { ready, mode, scope } = useSettingsContext();
  const watchlistKey = queryKeys.watchlist(mode, scope.mode === "account" ? scope.uid : null);
  const progressKey = queryKeys.progress(mode, scope.mode === "account" ? scope.uid : null, media.id);
  const watchlistQuery = useWatchlistSubscription();

  const progressQuery = useQuery({
    queryKey: progressKey,
    queryFn: () => dataLayer.getPlaybackProgress(scope, media.id),
    enabled: ready,
    staleTime: 1000 * 30,
  });

  const isSaved = useMemo(
    () => (watchlistQuery.data ?? []).some((item) => item.mediaId === media.id),
    [media.id, watchlistQuery.data],
  );

  const toggleWatchlist = async () => {
    const result = await dataLayer.toggleWatchlist(scope, {
      mediaId: media.id,
      mediaType: media.mediaType,
      title: media.title,
      posterPath: media.posterPath,
      backdropPath: media.backdropPath,
      rating: media.rating,
    });

    if (result.items) {
      queryClient.setQueryData(watchlistKey, result.items);
    }

    toast.success(result.saved ? "Added to watchlist." : "Removed from watchlist.");
  };

  const hasProgress = (progressQuery.data?.progress ?? 0) > 0 && (progressQuery.data?.progress ?? 0) < 95;

  return (
    <>
      <div className="relative z-20 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => setPlayerOpen(true)}
          className="flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
        >
          <Play className="size-4 fill-current shrink-0" />
          <span>{hasProgress ? "Resume" : "Play now"}</span>
        </button>

        <button
          type="button"
          onClick={() => void toggleWatchlist()}
          className="liquid-glass-soft flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white"
        >
          {isSaved ? <BookmarkCheck className="size-4 shrink-0" /> : <Bookmark className="size-4 shrink-0" />}
          <span>{isSaved ? "Saved" : "Save to watchlist"}</span>
        </button>

        <button
          type="button"
          onClick={() => setTrailerOpen(true)}
          className="flex items-center justify-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm text-[var(--muted)] transition hover:text-white"
        >
          <Ticket className="size-4 shrink-0" />
          <span>Trailer</span>
        </button>
      </div>

      <PlaybackTheater
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        mediaType={media.mediaType}
        mediaId={media.id}
        title={media.title}
        posterPath={media.posterPath}
        backdropPath={media.backdropPath}
        seasons={media.seasons}
      />
      <TrailerModal
        open={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        mediaType={media.mediaType}
        mediaId={media.id}
        title={media.title}
      />
    </>
  );
}
