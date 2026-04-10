"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Maximize2, Minimize2, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { dataLayer } from "@/lib/dataLayer";
import { getClientMediaDetails, getClientSeasonEpisodes } from "@/lib/tmdb/client";
import { useSettingsContext } from "@/context/SettingsContext";
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
  const { ready, settings } = useSettingsContext();
  const [isTheaterMode, setIsTheaterMode] = useState(settings.theaterModeDefault);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const lastProgressRef = useRef(0);
  const progressLoadedRef = useRef(false);

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
    queryKey: ["player", mediaId, "progress"],
    queryFn: () => dataLayer.getPlaybackProgress(mediaId),
    enabled: open && ready && settings.resumePlayback,
    staleTime: 1000 * 30,
  });

  const playerSourceQuery = useQuery({
    queryKey: [
      "player",
      "resolved-source",
      mediaType,
      mediaId,
      selectedSeason,
      selectedEpisode,
      settings.autoplayNextEpisode,
      progressQuery.data?.currentTime ?? null,
    ],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        mediaType,
        mediaId,
        season: String(selectedSeason),
        episode: String(selectedEpisode),
        autoplayNextEpisode: settings.autoplayNextEpisode ? "true" : "false",
      });

      if (
        settings.resumePlayback &&
        progressQuery.data &&
        progressQuery.data.currentTime > 0 &&
        (mediaType === "movie" ||
          (progressQuery.data.season === selectedSeason && progressQuery.data.episode === selectedEpisode))
      ) {
        params.set("progress", String(Math.floor(progressQuery.data.currentTime)));
      }

      const response = await fetch(`/api/player/resolve?${params.toString()}`, {
        credentials: "same-origin",
        signal,
      });

      if (!response.ok) {
        throw new Error("Unable to resolve player source.");
      }

      return (await response.json()) as { url: string; latencyMs: number | null; candidateCount: number };
    },
    enabled: open,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (!open) {
      setIsTheaterMode(settings.theaterModeDefault);
      setSelectedSeason(1);
      setSelectedEpisode(1);
      progressLoadedRef.current = false;
      return;
    }

    setIsTheaterMode(settings.theaterModeDefault);
  }, [open, settings.theaterModeDefault]);

  useEffect(() => {
    if (!open || mediaType !== "tv" || !settings.rememberLastEpisode || !progressQuery.data || progressLoadedRef.current) {
      return;
    }

    if (progressQuery.data.season) {
      setSelectedSeason(progressQuery.data.season);
    }
    if (progressQuery.data.episode) {
      setSelectedEpisode(progressQuery.data.episode);
    }
    progressLoadedRef.current = true;
  }, [mediaType, open, progressQuery.data, settings.rememberLastEpisode]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (isTheaterMode) {
        setIsTheaterMode(false);
        return;
      }

      onClose();
    };

    const onMessage = (event: MessageEvent) => {
      const payload = event.data as
        | { type?: string; data?: { event?: string; currentTime?: number; duration?: number } }
        | undefined;
      if (!ready || !settings.resumePlayback || !payload || payload.type !== "PLAYER_EVENT") {
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
      void dataLayer.savePlaybackProgress({
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
    selectedEpisode,
    selectedSeason,
    settings.resumePlayback,
    title,
  ]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-start justify-center bg-black/88 px-3 pb-3 pt-[calc(4.9rem+env(safe-area-inset-top))] backdrop-blur-md md:px-4 md:pt-8">
      {!isTheaterMode ? (
        <button type="button" aria-label="Close player overlay" className="absolute inset-0" onClick={onClose} />
      ) : null}

      <div
        className={cn(
          "relative z-[86] flex overflow-hidden bg-black transition-all duration-300",
          isTheaterMode
            ? "liquid-glass h-[calc(100vh-6.4rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col rounded-[2rem] p-3 md:h-[calc(100vh-4rem)]"
            : "liquid-glass h-[min(calc(100vh-7rem),880px)] w-full max-w-6xl flex-col rounded-[2rem] p-3",
        )}
      >
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.4rem] border border-white/10 bg-black">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#0d1117]/90 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                {mediaType === "tv" ? `Season ${selectedSeason} Episode ${selectedEpisode}` : "Movie playback"}
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

          <div className="relative flex-1 bg-black">
            {playerSourceQuery.isPending ? (
              <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-[var(--muted)]">
                Resolving the healthiest playback server...
              </div>
            ) : playerSourceQuery.isError ? (
              <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-red-100">
                Unable to resolve a stable playback server right now.
              </div>
            ) : (
              <iframe
                src={playerSourceQuery.data?.url}
                title={`${title} player`}
                className="absolute inset-0 h-full w-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                allowFullScreen
              />
            )}
          </div>

          {settings.showPlaybackTips ? (
            <div className="absolute bottom-4 left-4 z-10 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-xs text-[var(--muted)]">
              Press Esc to close. Popups stay blocked. Playback progress saves locally every few seconds.
            </div>
          ) : null}

          {playerSourceQuery.data?.latencyMs ? (
            <div className="absolute bottom-4 right-4 z-10 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-xs text-[var(--muted)]">
              Server picked in {playerSourceQuery.data.latencyMs}ms from {playerSourceQuery.data.candidateCount} candidate
              {playerSourceQuery.data.candidateCount === 1 ? "" : "s"}.
            </div>
          ) : null}

          {detailsQuery.isError ? (
            <div className="absolute right-4 top-4 z-10 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
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
