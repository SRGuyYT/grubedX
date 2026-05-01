"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { MovieCard } from "@/components/media/MovieCard";
import type { MediaItem } from "@/types/media";

export function MediaRow({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: MediaItem[];
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p> : null}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => rowRef.current?.scrollBy({ left: -720, behavior: "smooth" })}
            className="rounded-full border border-white/10 bg-black/25 p-2.5 text-[var(--muted)] transition hover:border-white/20 hover:text-white"
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => rowRef.current?.scrollBy({ left: 720, behavior: "smooth" })}
            className="rounded-full border border-white/10 bg-black/25 p-2.5 text-[var(--muted)] transition hover:border-white/20 hover:text-white"
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div ref={rowRef} className="scrollbar-hidden -mx-[var(--shell-padding)] flex gap-[var(--card-gap)] overflow-x-auto px-[var(--shell-padding)] pb-5 pt-1">
        {items.map((item) => (
          <div key={`${item.mediaType}-${item.id}`} className="w-[156px] shrink-0 sm:w-[176px] md:w-[190px] xl:w-[204px]">
            <MovieCard media={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
