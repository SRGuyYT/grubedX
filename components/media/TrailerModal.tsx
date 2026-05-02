"use client";

import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useSettingsContext } from "@/context/SettingsContext";
import { useTrailer } from "@/hooks/useTrailer";
import { toYouTubeWatchUrl } from "@/lib/youtubeEmbed";
import type { MediaType } from "@/types/media";

const youtubeIframeAllow =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

export function TrailerModal({
  open,
  onClose,
  mediaType,
  mediaId,
  title,
}: {
  open: boolean;
  onClose: () => void;
  mediaType: MediaType;
  mediaId: string;
  title: string;
}) {
  const { settings } = useSettingsContext();
  const trailerQuery = useTrailer(mediaType, mediaId, open);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", onEscape);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const trailer = trailerQuery.data;
  const autoplay = settings.autoplayTrailers ? "1" : "0";
  const muted = settings.inlineTrailerMuted ? "1" : "0";
  const embedUrl = trailer ? `${trailer.embedUrl}?autoplay=${autoplay}&mute=${muted}&rel=0&modestbranding=1` : null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/82 px-3 py-6 backdrop-blur-md md:px-4">
      <button type="button" aria-label="Close trailer modal" className="absolute inset-0" onClick={onClose} />

      <div className="liquid-glass relative z-[91] w-full max-w-5xl rounded-[2rem] p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Trailer</p>
            <h2 className="text-2xl font-semibold">{title}</h2>
          </div>

          <div className="flex items-center gap-2">
            {trailer ? (
              <a
                href={toYouTubeWatchUrl(trailer.key)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--muted)] transition hover:text-white"
              >
                <span className="inline-flex items-center gap-2">
                  Open YouTube
                  <ExternalLink className="size-4" />
                </span>
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 p-3 text-[var(--muted)] transition hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {trailerQuery.isPending ? (
          <LoadingState title="Loading trailer" description="Pulling the first playable YouTube trailer for this title." />
        ) : trailerQuery.isError ? (
          <EmptyState title="Trailer unavailable" description="No playable trailer is available for this title right now." />
        ) : trailer && embedUrl ? (
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
            <div className="aspect-video">
              <iframe
                src={embedUrl}
                title={`${title} trailer`}
                className="h-full w-full border-0"
                allow={youtubeIframeAllow}
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        ) : (
          <EmptyState title="No trailer found" description="Only click-open YouTube trailers are allowed here." />
        )}
      </div>
    </div>
  );
}
