"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { GenreFilter } from "@/components/media/GenreFilter";
import { MovieCard } from "@/components/media/MovieCard";
import { useInfiniteMedia } from "@/hooks/useInfiniteMedia";
import { queryKeys } from "@/lib/queryKeys";
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
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const genresQuery = useQuery({
    queryKey: queryKeys.genres(mediaType),
    queryFn: ({ signal }) => getClientGenres(mediaType, signal),
    staleTime: 1000 * 60 * 60,
  });

  const mediaQuery = useInfiniteMedia({
    mediaType,
    genre: selectedGenre,
    query: allowSearch ? searchQuery : undefined,
    enabled: !allowSearch || searchQuery.trim().length > 0,
  });

  useEffect(() => {
    setPage(mediaQuery.data?.pages.length ?? 1);
    setResults(mediaQuery.items);
  }, [mediaQuery.data?.pages.length, mediaQuery.items]);

  const subtitle = useMemo(() => {
    if (!allowSearch) {
      return description;
    }

    return searchQuery ? `Results for "${searchQuery}"` : description;
  }, [allowSearch, description, searchQuery]);

  const resetAndScroll = () => {
    setPage(1);
    setResults([]);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleGenreChange = (genre: string | null) => {
    resetAndScroll();
    setSelectedGenre(genre);
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetAndScroll();
    setSearchQuery(searchInput.trim());
  };

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

          <GenreFilter
            genres={genresQuery.data ?? []}
            selectedGenre={selectedGenre}
            onChange={handleGenreChange}
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
        ) : results.length === 0 ? (
          <EmptyState title="No titles found" description="Try another genre or search phrase." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-[var(--card-gap)] sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {results.map((item) => (
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
