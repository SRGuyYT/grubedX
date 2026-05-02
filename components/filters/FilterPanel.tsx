"use client";

import { SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { CONTENT_RATING_OPTIONS, type FilterActions, type FilterOption, type FilterState } from "@/hooks/useFilters";

export function FilterPanel({
  title = "Filters",
  genreLabel = "Genres",
  genres,
  filters,
  actions,
  yearOptions,
  ratingOptions = CONTENT_RATING_OPTIONS,
  showRatings = true,
  hasActiveFilters,
}: {
  title?: string;
  genreLabel?: string;
  genres: FilterOption[];
  filters: FilterState;
  actions: FilterActions;
  yearOptions: number[];
  ratingOptions?: readonly string[];
  showRatings?: boolean;
  hasActiveFilters: boolean;
}) {
  return (
    <section className="liquid-glass rounded-[1.35rem] border border-white/10 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full border border-white/10 bg-black/35 text-[var(--accent)]">
            <SlidersHorizontal className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-xs text-[var(--muted)]">Combine filters to narrow the shelf.</p>
          </div>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={actions.resetFilters}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 text-sm font-semibold text-[var(--muted)] transition hover:border-white/20 hover:text-white"
          >
            <X className="size-4" />
            Clear
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{genreLabel}</p>
          <div className="scrollbar-hidden flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
            {genres.map((genre) => {
              const active = filters.genres.includes(genre.id);
              return (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => actions.toggleGenre(genre.id)}
                  className={cn(
                    "min-h-11 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition",
                    active
                      ? "border-white/18 bg-white text-black"
                      : "border-white/10 bg-white/6 text-[var(--muted)] hover:border-white/20 hover:text-white",
                  )}
                >
                  {genre.name}
                </button>
              );
            })}
          </div>
        </div>

        {showRatings && ratingOptions.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Ratings</p>
            <div className="flex flex-wrap gap-2">
              {ratingOptions.map((rating) => {
                const active = filters.ratings.includes(rating);
                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => actions.toggleRating(rating)}
                    className={cn(
                      "min-h-11 rounded-full border px-4 text-sm font-semibold transition",
                      active
                        ? "border-white/18 bg-white text-black"
                        : "border-white/10 bg-white/6 text-[var(--muted)] hover:border-white/20 hover:text-white",
                    )}
                  >
                    {rating}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Release Year</p>
          <div className="mb-4 rounded-[1rem] border border-white/8 bg-black/24 px-4 py-4">
            <div className="flex items-center justify-between text-sm font-semibold text-white">
              <span>{filters.yearFrom}</span>
              <span>{filters.yearTo}</span>
            </div>
            <div className="mt-3 grid gap-3">
              <input
                type="range"
                min={Math.min(...yearOptions)}
                max={Math.max(...yearOptions)}
                value={filters.yearFrom}
                onChange={(event) => actions.setYearFrom(Number(event.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <input
                type="range"
                min={Math.min(...yearOptions)}
                max={Math.max(...yearOptions)}
                value={filters.yearTo}
                onChange={(event) => actions.setYearTo(Number(event.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-white">
              From
              <select
                value={filters.yearFrom}
                onChange={(event) => actions.setYearFrom(Number(event.target.value))}
                className="min-h-11 rounded-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-white">
              To
              <select
                value={filters.yearTo}
                onChange={(event) => actions.setYearTo(Number(event.target.value))}
                className="min-h-11 rounded-full border border-white/10 bg-black/40 px-4 text-sm text-white outline-none"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
