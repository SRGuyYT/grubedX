"use client";

import { useEffect, useEffectEvent, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { BookmarkPlus, ChevronLeft, ChevronRight, Play, Star, Ticket } from "lucide-react";

import { useSettingsContext } from "@/context/SettingsContext";
import { cn } from "@/lib/cn";
import type { MediaItem } from "@/types/media";

const TrailerModal = dynamic(
  () => import("@/components/media/TrailerModal").then((module) => module.TrailerModal),
  { ssr: false },
);

export function HeroCarousel({ items }: { items: MediaItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const { settings } = useSettingsContext();

  const activeItem = items[activeIndex] ?? items[0];
  const advance = useEffectEvent(() => {
    setActiveIndex((current) => (items.length === 0 ? 0 : (current + 1) % items.length));
  });

  useEffect(() => {
    if (!settings.enableAnimations || items.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => advance(), 8000);
    return () => window.clearInterval(timer);
  }, [advance, items.length, settings.enableAnimations]);

  if (!activeItem) {
    return null;
  }

  return (
    <>
      <section className="relative -mt-[calc(4.75rem+env(safe-area-inset-top))] overflow-hidden border-b border-white/8 md:-mt-[calc(5.5rem+env(safe-area-inset-top))]">
        <div className="absolute inset-0">
          {items.slice(0, 5).map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-[1200ms]",
                index === activeIndex ? "opacity-100" : "opacity-0",
              )}
            >
              <Image
                src={
                  item.backdropPath
                    ? `https://image.tmdb.org/t/p/original${item.backdropPath}`
                    : item.posterPath
                      ? `https://image.tmdb.org/t/p/original${item.posterPath}`
                      : "/opengraph.jpg"
                }
                alt={item.title}
                fill
                priority={index === 0}
                sizes="100vw"
                className={cn(
                  "scale-[1.02] object-cover object-center transition duration-700",
                  settings.reduceBackdropUsage ? "opacity-42 blur-[1px] brightness-[0.36]" : "brightness-[0.58]",
                )}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/78 to-black/18" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030304] via-[#03030488] to-black/42" />

        <div className="page-shell relative flex min-h-[74vh] items-end pb-20 pt-28 md:min-h-[78vh] md:pb-24 md:pt-32 xl:min-h-[82vh]">
          <div className="relative z-10 w-full max-w-[22rem] sm:max-w-3xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.38em] text-[var(--accent)]">Featured tonight</p>
            <h1 className="max-w-full text-5xl font-bold leading-none text-white sm:max-w-2xl sm:text-6xl md:text-7xl">
              {activeItem.title}
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-white/82">
              {activeItem.rating ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/42 px-3 py-1.5">
                  <Star className="size-3.5 fill-[var(--accent)] text-[var(--accent)]" />
                  {activeItem.rating.toFixed(1)}
                </span>
              ) : null}
              {activeItem.releaseDate ? (
                <span className="rounded-full border border-white/10 bg-black/42 px-3 py-1.5">
                  {new Date(activeItem.releaseDate).getFullYear()}
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-black/42 px-3 py-1.5 capitalize">{activeItem.mediaType}</span>
            </div>
            <p className="mt-6 w-full max-w-[22rem] break-words text-base font-medium leading-8 text-white/74 sm:max-w-2xl sm:text-lg">
              {activeItem.overview}
            </p>
            <div className="mt-8 grid w-full max-w-[22rem] grid-cols-2 gap-3 sm:flex sm:max-w-none sm:flex-wrap sm:items-center">
              <Link
                href={`/title/${activeItem.mediaType}/${activeItem.id}`}
                prefetch={settings.prefetchRoutes && !settings.lowBandwidthMode}
                className="col-span-2 rounded-full bg-white px-6 py-3.5 text-center text-sm font-bold text-black transition hover:brightness-95 active:scale-[0.98] sm:col-span-1"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Play className="size-4 fill-current" />
                  Open
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setTrailerOpen(true)}
                className="liquid-glass-soft min-w-0 rounded-full px-3 py-3.5 text-sm font-semibold text-white transition hover:border-white/18 sm:px-6"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Ticket className="size-4" />
                  Trailer
                </span>
              </button>
              <Link
                href="/search?focus=1"
                className="min-w-0 rounded-full border border-white/12 bg-black/28 px-3 py-3.5 text-sm font-semibold text-white/90 transition hover:border-white/22 hover:text-white sm:px-6"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <BookmarkPlus className="size-4" />
                  Explore
                </span>
              </Link>
            </div>
          </div>

          <div className="absolute bottom-8 right-5 z-10 hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => setActiveIndex((current) => (current === 0 ? items.length - 1 : current - 1))}
              className="rounded-full border border-white/10 bg-black/45 p-3 text-[var(--muted)] backdrop-blur-xl transition hover:border-white/20 hover:text-white"
              aria-label="Previous hero slide"
            >
              <ChevronLeft className="size-5" />
            </button>
            <div className="flex items-center gap-2">
              {items.slice(0, 5).map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                  "h-2.5 rounded-full transition",
                  index === activeIndex ? "w-8 bg-white" : "w-2.5 bg-white/28",
                )}
                  aria-label={`Go to hero slide ${index + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setActiveIndex((current) => (current + 1) % items.length)}
              className="rounded-full border border-white/10 bg-black/45 p-3 text-[var(--muted)] backdrop-blur-xl transition hover:border-white/20 hover:text-white"
              aria-label="Next hero slide"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </section>

      <TrailerModal
        open={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        mediaType={activeItem.mediaType}
        mediaId={activeItem.id}
        title={activeItem.title}
      />
    </>
  );
}
