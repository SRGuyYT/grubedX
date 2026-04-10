"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

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
    <article className="group relative flex h-full w-full flex-col transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.985]">
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_top,rgba(255,106,61,0.16),transparent_52%),radial-gradient(circle_at_bottom_right,rgba(101,137,255,0.12),transparent_46%)] opacity-0 transition duration-300 group-hover:opacity-100" />
      <Link
        href={`/title/${media.mediaType}/${media.id}`}
        prefetch={settings.prefetchRoutes && !settings.lowBandwidthMode}
        className={cn(
          "liquid-glass-soft relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/8",
          compact ? "p-3" : "p-3.5 sm:p-4",
        )}
      >
        <div className="relative block aspect-[2/3] w-full overflow-hidden rounded-[1.45rem] border border-white/8">
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
            className="object-cover transition duration-500 group-hover:scale-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060912] via-[#06091233] to-transparent opacity-95" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-4 text-xs text-[var(--muted)]">
            <span className="rounded-full border border-white/10 bg-[#09101ccc] px-3 py-1.5 uppercase tracking-[0.22em] text-white/78">
              {media.mediaType}
            </span>
            {seasons?.length ? (
              <span className="rounded-full border border-white/10 bg-[#09101ccc] px-3 py-1.5">
                {seasons.length} season{seasons.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>

        <div className={cn("flex flex-1 flex-col px-1 pb-1", compact ? "gap-3 pt-4" : "gap-4 pt-4.5 sm:pt-5")}>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
            {settings.showRatings && media.rating ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                <Star className="size-3 fill-[var(--accent)] text-[var(--accent)]" />
                {media.rating.toFixed(1)}
              </span>
            ) : null}
            {settings.showReleaseYear && media.releaseDate ? (
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                {new Date(media.releaseDate).getFullYear()}
              </span>
            ) : null}
          </div>

          <div className="space-y-2.5">
            <h3 className="line-clamp-2 text-[1.15rem] font-semibold leading-tight text-white">{media.title}</h3>
            <p className="line-clamp-4 text-sm leading-6 text-[var(--muted)]">
              {media.overview || "No overview available."}
            </p>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-black/20 px-4 py-3 text-sm">
            <span className="font-medium text-white/90">Open title</span>
            <span className="text-[var(--muted)] transition group-hover:text-white">Play or save</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
