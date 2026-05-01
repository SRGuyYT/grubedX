"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Star } from "lucide-react";

import { useSettingsContext } from "@/context/SettingsContext";
import { cn } from "@/lib/cn";
import type { MediaItem, SeasonSummary } from "@/types/media";

export function MovieCard({
  media,
  seasons,
}: {
  media: MediaItem;
  seasons?: SeasonSummary[];
}) {
  const { settings } = useSettingsContext();
  const imageWidth =
    settings.posterQuality === "high" ? "w500" : settings.posterQuality === "data-saver" || settings.dataSaver ? "w342" : "w500";
  const compact = settings.cardDensity === "compact";

  return (
    <article className="group relative flex h-full w-full flex-col transition-transform duration-300 hover:-translate-y-1 active:scale-[0.985]">
      <div className="pointer-events-none absolute -inset-1 rounded-[1.35rem] bg-white/8 opacity-0 blur-xl transition duration-300 group-hover:opacity-100" />
      <Link
        href={`/title/${media.mediaType}/${media.id}`}
        prefetch={settings.prefetchRoutes && !settings.lowBandwidthMode}
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[1.05rem] border border-white/8 bg-white/[0.035]",
          compact ? "p-2.5" : "p-3",
        )}
      >
        <div className="relative block aspect-[2/3] w-full overflow-hidden rounded-[0.82rem] border border-white/8 bg-black">
          <Image
            src={
              media.posterPath
                ? `https://image.tmdb.org/t/p/${imageWidth}${media.posterPath}`
                : "/512x512.png"
            }
            alt={media.title}
            fill
            sizes="(max-width: 640px) 180px, (max-width: 1024px) 230px, 260px"
            loading="lazy"
            className="object-cover transition duration-500 group-hover:scale-[1.045]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/12 to-transparent opacity-90" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3 text-xs text-[var(--muted)]">
            <span className="rounded-full border border-white/10 bg-black/58 px-2.5 py-1 uppercase tracking-[0.16em] text-white/82 backdrop-blur-md">
              {media.mediaType}
            </span>
            {seasons?.length ? (
              <span className="rounded-full border border-white/10 bg-black/58 px-2.5 py-1 backdrop-blur-md">
                {seasons.length} season{seasons.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 transition duration-300 group-hover:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-black shadow-[0_12px_30px_rgba(0,0,0,0.32)]">
              <Play className="size-3.5 fill-current" />
              Open
            </span>
          </div>
        </div>

        <div className={cn("flex flex-1 flex-col px-0.5 pb-0.5", compact ? "gap-2.5 pt-3" : "gap-3 pt-3.5")}>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            {settings.showRatings && media.rating ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/28 px-2.5 py-1">
                <Star className="size-3 fill-[var(--accent)] text-[var(--accent)]" />
                {media.rating.toFixed(1)}
              </span>
            ) : null}
            {settings.showReleaseYear && media.releaseDate ? (
              <span className="rounded-full border border-white/10 bg-black/28 px-2.5 py-1">
                {new Date(media.releaseDate).getFullYear()}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <h3 className="line-clamp-2 text-base font-semibold leading-tight text-white">{media.title}</h3>
            <p className="line-clamp-3 text-sm leading-5 text-[var(--muted)]">
              {media.overview || "No overview available."}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
