"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Play, Ticket } from "lucide-react";
import { toast } from "sonner";

import { useSettingsContext } from "@/context/SettingsContext";
import { useWatchlistSubscription } from "@/hooks/useWatchlistSubscription";
import { dataLayer } from "@/lib/dataLayer";
import { queryKeys } from "@/lib/queryKeys";
import type { MediaDetails } from "@/types/media";

const TrailerModal = dynamic(
  () => import("@/components/media/TrailerModal").then((module) => module.TrailerModal),
  { ssr: false },
);

const PlaybackTheater = dynamic(
  () => import("@/components/media/PlaybackTheater").then((module) => module.PlaybackTheater),
  { ssr: false },
);

export function TitleActions({ media }: { media: MediaDetails }) {
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(false);
  const queryClient = useQueryClient();
  const { ready } = useSettingsContext();
  const watchlistQuery = useWatchlistSubscription();

  const progressQuery = useQuery({
    queryKey: queryKeys.progress(media.id),
    queryFn: () => dataLayer.getPlaybackProgress(media.id),
    enabled: ready,
    staleTime: 1000 * 30,
  });

  const isSaved = useMemo(
    () => (watchlistQuery.data ?? []).some((item) => item.mediaId === media.id),
    [media.id, watchlistQuery.data],
  );

  const toggleWatchlist = async () => {
    const result = await dataLayer.toggleWatchlist({
      mediaId: media.id,
      mediaType: media.mediaType,
      title: media.title,
      posterPath: media.posterPath,
      backdropPath: media.backdropPath,
      rating: media.rating,
    });

    queryClient.setQueryData(queryKeys.watchlist, result.items ?? []);
    toast.success(result.saved ? "Added to watchlist." : "Removed from watchlist.");
  };

  const hasProgress = (progressQuery.data?.progress ?? 0) > 0 && (progressQuery.data?.progress ?? 0) < 95;

  return (
    <>
      <div className="relative z-20 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          onClick={() => setPlayerOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-black transition hover:brightness-95 active:scale-[0.98]"
        >
          <Play className="size-4 fill-current" />
          {hasProgress ? "Resume" : "Play now"}
        </button>

        <button
          type="button"
          onClick={() => void toggleWatchlist()}
          className="liquid-glass-soft inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/15 active:scale-[0.98]"
        >
          {isSaved ? <BookmarkCheck className="size-4 text-[var(--accent)]" /> : <Bookmark className="size-4" />}
          {isSaved ? "Saved locally" : "Save to watchlist"}
        </button>

        <button
          type="button"
          onClick={() => setTrailerOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-black/24 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white/22 active:scale-[0.98]"
        >
          <Ticket className="size-4" />
          Trailer
        </button>
      </div>

      <TrailerModal
        open={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        mediaType={media.mediaType}
        mediaId={media.id}
        title={media.title}
      />
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
    </>
  );
}
