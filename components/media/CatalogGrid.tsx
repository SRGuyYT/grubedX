"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { LoadingState } from "@/components/feedback/LoadingState";
import { MovieCard } from "@/components/media/MovieCard";
import { MediaRecommendationSections } from "@/components/recommendations/MediaRecommendationSections";
import { useSettingsContext } from "@/context/SettingsContext";
import { filterByYear, useFilters } from "@/hooks/useFilters";
import { useInfiniteMedia } from "@/hooks/useInfiniteMedia";
import { useRecommendations } from "@/hooks/useRecommendations";
import { queryKeys } from "@/lib/queryKeys";
import { mediaItemToRecommendationItem, trackSearchQuery } from "@/lib/recommendationEngine";
import { getClientGenres } from "@/lib/tmdb/client";
import type { MediaItem, MediaType } from "@/types/media";

export function CatalogGrid({
  mediaType,
  title,
  description,
  allowSearch = false,
}: {
  mediaType: MediaType;
  title: string;
  description: string;
  allowSearch?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const { settings } = useSettingsContext();
  const { filters, actions, yearOptions, hasActiveFilters } = useFilters({ startYear: 1980, endYear: new Date().getFullYear() });

  const genresQuery = useQuery({
    queryKey: queryKeys.genres(mediaType),
    queryFn: ({ signal }) => getClientGenres(mediaType, signal),
    staleTime: 1000 * 60 * 60,
  });

  const mediaQuery = useInfiniteMedia({
    mediaType,
    genres: filters.genres,
    ratings: filters.ratings,
    yearFrom: filters.yearFrom,
    yearTo: filters.yearTo,
    query: allowSearch ? searchQuery : undefined,
    enabled: !allowSearch || searchQuery.trim().length > 0,
  });

  useEffect(() => {
    setPage(mediaQuery.data?.pages.length ?? 1);
    setResults(mediaQuery.items);
  }, [mediaQuery.data?.pages.length, mediaQuery.items]);

  const filteredResults = useMemo(() => {
    const yearFiltered = filterByYear(results, filters, (item) => {
      if (!item.releaseDate) {
        return null;
      }
      const year = Number(item.releaseDate.slice(0, 4));
      return Number.isFinite(year) ? year : null;
    });

    if (!allowSearch || filters.genres.length === 0) {
      return yearFiltered;
    }

    return yearFiltered.filter((item) =>
      filters.genres.every((genreId) => item.genreIds.includes(Number(genreId))),
    );
  }, [allowSearch, filters, results]);

  const subtitle = useMemo(() => {
    if (!allowSearch) {
      return description;
    }

    return searchQuery ? `Results for "${searchQuery}"` : description;
  }, [allowSearch, description, searchQuery]);

  const recommendations = useRecommendations({
    content: filteredResults,
    filters,
    toRecommendationItem: mediaItemToRecommendationItem,
    mediaType,
    enabled: settings.recommendationsEnabled,
  });

  const resetAndScroll = () => {
    setPage(1);
    setResults([]);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = searchInput.trim();
    resetAndScroll();
    setSearchQuery(nextQuery);
    trackSearchQuery(nextQuery);
  };

  useEffect(() => {
    resetAndScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.genres.join(","), filters.ratings.join(","), filters.yearFrom, filters.yearTo]);

  return (
    <section className="page-shell py-8 md:py-12 xl:py-16">
      <div className="mb-9 grid gap-6 lg:grid-cols-[minmax(0,0.9fr),minmax(420px,1fr)] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--accent)]">{mediaType}</p>
          <h1 className="mt-4 text-5xl font-bold leading-none md:text-6xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base font-medium leading-7 text-[var(--muted)]">{subtitle}</p>
        </div>

        <div className="space-y-4">
          {allowSearch ? (
            <form onSubmit={submitSearch} className="liquid-glass-soft flex items-center gap-3 rounded-full px-5 py-3.5">
              <Search className="size-4 text-[var(--muted)]" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={`Search ${mediaType} titles`}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--muted)]"
              />
              <button
                type="submit"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-95"
              >
                Search
              </button>
            </form>
          ) : null}

          <FilterPanel
            genres={(genresQuery.data ?? []).map((genre) => ({ id: String(genre.id), name: genre.name }))}
            filters={filters}
            actions={actions}
            yearOptions={yearOptions}
            hasActiveFilters={hasActiveFilters}
          />
          </div>
      </div>

        {allowSearch && !searchQuery ? (
          <EmptyState
            title="Search to begin"
            description={`Enter a ${mediaType} title and GrubX will build a focused wall of results.`}
          />
        ) : mediaQuery.isPending ? (
          <LoadingState title="Loading titles" description="Bringing the next shelf into view." />
        ) : filteredResults.length === 0 ? (
          <EmptyState title="No titles found" description="Try another genre or search phrase." />
        ) : (
          <>
            {settings.recommendationsEnabled ? (
              <div className="mb-10">
                <MediaRecommendationSections recommendations={recommendations} />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-[var(--card-gap)] sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {filteredResults.map((item) => (
                <MovieCard key={`${item.mediaType}-${item.id}`} media={item} />
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center gap-3">
              <div ref={mediaQuery.loadMoreRef} className="h-1 w-full" />
              {mediaQuery.isFetchingNextPage ? (
                <p className="text-sm text-[var(--muted)]">Loading more titles...</p>
              ) : mediaQuery.hasNextPage ? (
                <p className="text-sm text-[var(--muted)]">Scroll to load more.</p>
              ) : (
                <p className="text-sm text-[var(--muted)]">You've reached the end of this list.</p>
              )}
            </div>
          </>
        )}
    </section>
  );
}
