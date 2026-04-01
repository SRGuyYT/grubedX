"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Maximize2, Minimize2, X } from "lucide-react";

import { env } from "@/lib/env";
import { cn } from "@/lib/cn";
import { getClientMediaDetails, getClientSeasonEpisodes } from "@/lib/tmdb/client";
import { useSettingsContext } from "@/context/SettingsContext";
import { dataLayer } from "@/lib/dataLayer";
import type { MediaType, SeasonSummary } from "@/types/media";

export function PlaybackTheater({
  open,
  onClose,
  mediaType,
  mediaId,
  title,
  posterPath,
  backdropPath,
  seasons,
}: {
  open: boolean;
  onClose: () => void;
  mediaType: MediaType;
  mediaId: string;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  seasons?: SeasonSummary[];
}) {
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const lastProgressRef = useRef(0);

  const { ready, scope, settings } = useSettingsContext();

  const detailsQuery = useQuery({
    queryKey: ["player", mediaType, mediaId, "details"],
    queryFn: ({ signal }) => getClientMediaDetails(mediaType, mediaId, signal),
    enabled: open && mediaType === "tv" && (!seasons || seasons.length === 0),
    staleTime: 1000 * 60 * 10,
  });

  const resolvedSeasons = seasons && seasons.length > 0 ? seasons : detailsQuery.data?.seasons ?? [];
  const seasonEpisodesQuery = useQuery({
    queryKey: ["player", mediaId, "season", selectedSeason],
    queryFn: ({ signal }) => getClientSeasonEpisodes(mediaId, selectedSeason, signal),
    enabled: open && mediaType === "tv",
    staleTime: 1000 * 60 * 10,
  });

  const progressQuery = useQuery({
    queryKey: ["player", mediaId, "progress", scope],
    queryFn: () => dataLayer.getPlaybackProgress(scope, mediaId),
    enabled: open && ready,
  });

  const hasLoadedProgressRef = useRef(false);

  useEffect(() => {
    if (open && mediaType === "tv" && progressQuery.data && !hasLoadedProgressRef.current) {
      if (progressQuery.data.season && progressQuery.data.episode) {
        setSelectedSeason(progressQuery.data.season);
        setSelectedEpisode(progressQuery.data.episode);
      }
      hasLoadedProgressRef.current = true;
    }
  }, [open, mediaType, progressQuery.data]);

  useEffect(() => {
    if (!open) {
      hasLoadedProgressRef.current = false;
      // Reset episodes/seasons selection logic here if needed, or allow it to be preserved
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isTheaterMode) {
          setIsTheaterMode(false);
          return;
        }
        onClose();
      }
    };

    const onMessage = (event: MessageEvent) => {
      const payload = event.data as
        | { type?: string; data?: { event?: string; currentTime?: number; duration?: number } }
        | undefined;
      if (!ready || !payload || payload.type !== "PLAYER_EVENT") {
        return;
      }

      const currentTime = payload.data?.currentTime ?? 0;
      const duration = payload.data?.duration ?? 0;
      if (payload.data?.event !== "timeupdate" || duration <= 0) {
        return;
      }

      const now = Date.now();
      if (now - lastProgressRef.current < 10000) {
        return;
      }

      lastProgressRef.current = now;
      void dataLayer.savePlaybackProgress(scope, {
        mediaId,
        mediaType,
        title,
        posterPath,
        backdropPath,
        season: mediaType === "tv" ? selectedSeason : null,
        episode: mediaType === "tv" ? selectedEpisode : null,
        currentTime,
        duration,
        progress: Math.round((currentTime / duration) * 100),
      });
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEscape);
    window.addEventListener("message", onMessage);

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("message", onMessage);
    };
  }, [
    backdropPath,
    isTheaterMode,
    mediaId,
    mediaType,
    onClose,
    posterPath,
    ready,
    scope,
    selectedEpisode,
    selectedSeason,
    title,
  ]);

  if (!open) {
    return null;
  }

  let sourceUrl =
    mediaType === "movie"
      ? `${env.vidkingBase}/movie/${mediaId}?color=ff5a2a&autoPlay=true`
      : `${env.vidkingBase}/tv/${mediaId}/${selectedSeason}/${selectedEpisode}?color=ff5a2a&autoPlay=true&nextEpisode=true&episodeSelector=true`;

  if (progressQuery.data && progressQuery.data.currentTime > 0) {
    if (
      mediaType === "movie" ||
      (mediaType === "tv" &&
        progressQuery.data.season === selectedSeason &&
        progressQuery.data.episode === selectedEpisode)
    ) {
      sourceUrl += `&progress=${Math.floor(progressQuery.data.currentTime)}`;
    }
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/88 px-4 py-4 backdrop-blur-md">
      {!isTheaterMode ? (
        <button type="button" aria-label="Close player overlay" className="absolute inset-0" onClick={onClose} />
      ) : null}

      <div
        className={cn(
          "relative z-[86] overflow-hidden bg-black transition-all duration-300",
          isTheaterMode
            ? "h-full w-full rounded-none"
            : "liquid-glass h-[min(88vh,880px)] w-full max-w-6xl rounded-[2rem] p-4",
        )}
      >
        <div className="relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-white/10 bg-black">
          <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-b from-black/90 to-transparent px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                {mediaType === "tv" ? `Season ${selectedSeason} Episode ${selectedEpisode}` : "Movie Playback"}
              </p>
              <h3 className="text-2xl font-semibold text-white">{title}</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {mediaType === "tv" && resolvedSeasons.length > 0 ? (
                <>
                  <select
                    value={selectedSeason}
                    onChange={(event) => {
                      setSelectedSeason(Number(event.target.value));
                      setSelectedEpisode(1);
                    }}
                    className="rounded-full border border-white/10 bg-black/45 px-4 py-2 text-sm text-white outline-none"
                  >
                    {resolvedSeasons.map((season) => (
                      <option key={season.seasonNumber} value={season.seasonNumber}>
                        Season {season.seasonNumber}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedEpisode}
                    onChange={(event) => setSelectedEpisode(Number(event.target.value))}
                    className="rounded-full border border-white/10 bg-black/45 px-4 py-2 text-sm text-white outline-none"
                  >
                    {(seasonEpisodesQuery.data?.episodes ?? []).map((episode) => (
                      <option key={episode.episodeNumber} value={episode.episodeNumber}>
                        Episode {episode.episodeNumber}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setIsTheaterMode((value) => !value)}
                className="rounded-full border border-white/10 bg-black/45 p-3 text-[var(--muted)] transition hover:text-white"
              >
                {isTheaterMode ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-black/45 p-3 text-[var(--muted)] transition hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          <iframe
            src={sourceUrl}
            title={`${title} player`}
            className="h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            sandbox={
              settings.blockPopups
                ? "allow-scripts allow-same-origin allow-forms allow-presentation"
                : undefined
            }
          />

          {detailsQuery.isError ? (
            <div className="absolute bottom-4 left-4 right-4 z-10 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="size-4" />
                TV metadata could not be loaded. Playback is still available.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
