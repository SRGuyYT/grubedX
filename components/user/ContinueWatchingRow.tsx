"use client";

import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { useSettingsContext } from "@/context/SettingsContext";
import { useContinueWatchingSubscription } from "@/hooks/useContinueWatchingSubscription";

export function ContinueWatchingRow({
  showEmpty = false,
  title = "Continue Watching",
  description = "Resume from the exact point you left off. Progress stays on-device and is available offline.",
  emptyTitle = "Nothing to resume yet",
  emptyDescription = "Start a movie or show and your progress rail will appear here.",
}: {
  showEmpty?: boolean;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { ready, settings } = useSettingsContext();
  const query = useContinueWatchingSubscription();

  if (!ready || query.isBootstrapping || !settings.showContinueWatching) {
    return null;
  }

  const items = query.data ?? [];
  if (items.length === 0) {
    return showEmpty ? <EmptyState title={emptyTitle} description={emptyDescription} /> : null;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold md:text-[2.2rem]">{title}</h2>
        <p className="max-w-3xl text-sm leading-7 text-[var(--muted)]">{description}</p>
      </div>

      <div className="scrollbar-hidden flex gap-[var(--card-gap)] overflow-x-auto pb-4">
        {items.map((item) => (
          <article
            key={item.mediaId}
            className="liquid-glass-soft min-w-[260px] max-w-[320px] shrink-0 overflow-hidden rounded-[2rem] border border-white/8 sm:min-w-[320px] md:min-w-[340px]"
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <Image
                src={
                  item.backdropPath
                    ? `https://image.tmdb.org/t/p/w780${item.backdropPath}`
                    : item.posterPath
                      ? `https://image.tmdb.org/t/p/w500${item.posterPath}`
                      : "/512x512.png"
                }
                alt={item.title}
                fill
                sizes="(max-width: 640px) 260px, (max-width: 768px) 320px, 340px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060912] via-[#06091280] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
                  {item.mediaType === "tv" && item.season && item.episode
                    ? ["S", item.season, " · E", item.episode].join("")
                    : "Resume ready"}
                </p>
                <h3 className="mt-2 line-clamp-2 text-2xl font-semibold text-white">{item.title}</h3>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted)]">
                  <span>{item.progress}% complete</span>
                  <span>{Math.max(0, Math.round(item.duration - item.currentTime))}s left</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-[width]"
                    style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                  />
                </div>
              </div>

              <Link
                href={`/title/${item.mediaType}/${item.mediaId}?resume=1`}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110"
              >
                <Play className="size-4 fill-current" />
                Resume
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
