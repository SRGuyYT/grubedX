"use client";

import { useEffect, useEffectEvent, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Ticket } from "lucide-react";

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
      <section className="relative overflow-hidden border-b border-white/8">
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
                  "scale-[1.04] object-cover object-center transition duration-700",
                  settings.reduceBackdropUsage ? "opacity-35 blur-[1px] brightness-[0.32]" : "blur-[1.5px] brightness-[0.48]",
                )}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#05070f] via-[#05070fe6] to-[#05070f66]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070f] via-[#05070f88] to-[#05070fbf]" />

        <div className="page-shell relative flex min-h-[56vh] items-center py-6 md:min-h-[66vh] md:py-10 xl:min-h-[70vh] xl:py-12">
          <div className="liquid-glass relative z-10 max-w-3xl rounded-[2.2rem] px-7 py-8 md:px-9 md:py-10">
            <p className="mb-4 text-xs uppercase tracking-[0.45em] text-[var(--muted)]">Trending Today</p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-none sm:text-5xl md:text-6xl">
              {activeItem.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              {activeItem.overview}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={`/title/${activeItem.mediaType}/${activeItem.id}`}
                prefetch={settings.prefetchRoutes && !settings.lowBandwidthMode}
                className="rounded-full bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-black transition hover:brightness-110"
              >
                <span className="inline-flex items-center gap-2">
                  <Play className="size-4 fill-current" />
                  Open title
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setTrailerOpen(true)}
                className="liquid-glass-soft rounded-full px-6 py-3.5 text-sm font-semibold text-white"
              >
                <span className="inline-flex items-center gap-2">
                  <Ticket className="size-4" />
                  Watch trailer
                </span>
              </button>
              <Link
                href="/search?focus=1"
                className="rounded-full border border-white/10 px-6 py-3.5 text-sm font-semibold text-white/90 transition hover:border-white/20 hover:text-white"
              >
                Search all
              </Link>
            </div>
          </div>

          <div className="absolute bottom-8 right-5 z-10 hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => setActiveIndex((current) => (current === 0 ? items.length - 1 : current - 1))}
              className="rounded-full border border-white/10 bg-black/35 p-3 text-[var(--muted)] transition hover:border-white/20 hover:text-white"
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
                  "size-2.5 rounded-full transition",
                  index === activeIndex ? "bg-[var(--accent)]" : "bg-white/25",
                )}
                  aria-label={`Go to hero slide ${index + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setActiveIndex((current) => (current + 1) % items.length)}
              className="rounded-full border border-white/10 bg-black/35 p-3 text-[var(--muted)] transition hover:border-white/20 hover:text-white"
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
