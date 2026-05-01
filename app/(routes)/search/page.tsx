"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Search } from "lucide-react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { MovieCard } from "@/components/media/MovieCard";
import { useSettingsContext } from "@/context/SettingsContext";
import { dataLayer } from "@/lib/dataLayer";
import { queryKeys } from "@/lib/queryKeys";
import { getClientMediaPage } from "@/lib/tmdb/client";
import type { MediaItem, MediaPage, SearchTarget } from "@/types/media";

const filterOptions: Array<{ value: SearchTarget; label: string }> = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV" },
];

const mergeSearchPages = (moviePage: MediaPage, tvPage: MediaPage) => {
  const items = [...moviePage.results, ...tvPage.results].sort((left, right) => {
    const rightVotes = right.voteCount ?? 0;
    const leftVotes = left.voteCount ?? 0;
    if (rightVotes !== leftVotes) {
      return rightVotes - leftVotes;
    }

    const rightRating = right.rating ?? 0;
    const leftRating = left.rating ?? 0;
    if (rightRating !== leftRating) {
      return rightRating - leftRating;
    }

    return (right.releaseDate ?? "").localeCompare(left.releaseDate ?? "");
  });

  const deduped = new Map<string, MediaItem>();
  items.forEach((item) => {
    deduped.set(`${item.mediaType}:${item.id}`, item);
  });

  return Array.from(deduped.values());
};

export default function SearchPage() {
  const { settings } = useSettingsContext();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [target, setTarget] = useState<SearchTarget>("all");

  useEffect(() => {
    let cancelled = false;

    if (!settings.rememberSearchFilters) {
      return;
    }

    void dataLayer.loadSearchPreferences().then((prefs) => {
      if (cancelled) {
        return;
      }
      setQuery(prefs.lastQuery);
      setDebouncedQuery(prefs.lastQuery);
      setTarget(prefs.target);
    });

    return () => {
      cancelled = true;
    };
  }, [settings.rememberSearchFilters]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQuery = query.trim();
      setDebouncedQuery(nextQuery);
      if (settings.rememberSearchFilters) {
        void dataLayer.saveSearchPreferences({ lastQuery: nextQuery, target });
      }
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query, settings.rememberSearchFilters, target]);

  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("focus") === "1" && settings.autoFocusSearch) {
        window.requestAnimationFrame(focusInput);
      }
    }

    window.addEventListener("grubx:focus-search", focusInput);
    return () => window.removeEventListener("grubx:focus-search", focusInput);
  }, [settings.autoFocusSearch]);

  const searchQuery = useQuery({
    queryKey: queryKeys.search(target, debouncedQuery),
    enabled: debouncedQuery.length > 1,
    staleTime: 1000 * 60 * 5,
    queryFn: async ({ signal }) => {
      if (target === "all") {
        const [moviePage, tvPage] = await Promise.all([
          getClientMediaPage({ mediaType: "movie", query: debouncedQuery, signal }),
          getClientMediaPage({ mediaType: "tv", query: debouncedQuery, signal }),
        ]);
        return mergeSearchPages(moviePage, tvPage);
      }

      const page = await getClientMediaPage({ mediaType: target, query: debouncedQuery, signal });
      return page.results;
    },
  });

  const results = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  return (
    <section className="page-shell space-y-7 py-8 md:space-y-9 md:py-12">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--accent)]">Search</p>
        <h1 className="mt-4 text-5xl font-bold leading-none md:text-6xl">Find your next favorite story</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-[var(--muted)]">
          Search movies and TV together, then narrow the wall when you already know the lane.
        </p>

        <div className="mt-7 flex flex-col gap-4">
          <div className="liquid-glass-soft flex items-center gap-3 rounded-full px-5 py-4">
            <Search className="size-4 text-[var(--muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search all, movies, or TV titles"
              className="w-full bg-transparent text-base text-white outline-none placeholder:text-[var(--muted)]"
              autoFocus={settings.autoFocusSearch}
            />
            {searchQuery.isFetching ? <LoaderCircle className="size-4 animate-spin text-[var(--accent)]" /> : null}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hidden">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTarget(option.value);
                  if (settings.rememberSearchFilters) {
                    void dataLayer.saveSearchPreferences({ target: option.value });
                  }
                }}
                className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                  target === option.value
                    ? "border-white/18 bg-white text-black"
                    : "border-white/10 bg-white/6 text-[var(--muted)] hover:border-white/20 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {debouncedQuery.length <= 1 ? (
        <EmptyState
          title="Search to begin"
          description="Type at least two characters to bring the catalog into focus."
        />
      ) : searchQuery.isPending ? (
        <div className="grid grid-cols-2 gap-[var(--card-gap)] sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-[360px] animate-pulse rounded-[1rem] border border-white/8 bg-white/[0.04]" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <EmptyState title="No results found" description="Try a broader query or switch between All, Movies, and TV." />
      ) : (
        <div className="grid grid-cols-2 gap-[var(--card-gap)] sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {results.map((item) => (
            <MovieCard key={`${item.mediaType}-${item.id}`} media={item} />
          ))}
        </div>
      )}
    </section>
  );
}
