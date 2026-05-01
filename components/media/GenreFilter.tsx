"use client";

import { cn } from "@/lib/cn";
import type { Genre } from "@/types/media";

export function GenreFilter({
  genres,
  selectedGenre,
  onChange,
}: {
  genres: Genre[];
  selectedGenre: string | null;
  onChange: (genre: string | null) => void;
}) {
  return (
    <div className="scrollbar-hidden flex gap-2 overflow-x-auto pb-2 pt-1">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold transition",
          selectedGenre === null
            ? "border-white/18 bg-white text-black"
            : "border-white/10 bg-white/6 text-[var(--muted)] hover:border-white/20 hover:text-white",
        )}
      >
        All Genres
      </button>
      {genres.map((genre) => (
        <button
          key={genre.id}
          type="button"
          onClick={() => onChange(String(genre.id))}
          className={cn(
            "whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-semibold transition",
            selectedGenre === String(genre.id)
              ? "border-white/18 bg-white text-black"
              : "border-white/10 bg-white/6 text-[var(--muted)] hover:border-white/20 hover:text-white",
          )}
        >
          {genre.name}
        </button>
      ))}
    </div>
  );
}
