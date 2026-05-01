"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { getClientMediaPage } from "@/lib/tmdb/client";
import type { MediaItem, MediaType } from "@/types/media";

type UseInfiniteMediaInput = {
  mediaType: MediaType;
  genre?: string | null;
  query?: string;
  category?: "popular" | "top_rated";
  enabled?: boolean;
};

export const useInfiniteMedia = ({
  mediaType,
  genre,
  query,
  category = "popular",
  enabled = true,
}: UseInfiniteMediaInput) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const response = useInfiniteQuery({
    queryKey: queryKeys.list("catalog", {
      mediaType,
      genre: genre ?? null,
      query: query ?? "",
      category,
    }),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      getClientMediaPage({
        mediaType,
        genre,
        query,
        category,
        page: pageParam,
        signal,
      }),
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined),
    enabled,
    staleTime: 1000 * 60 * 5,
  });

  const items = useMemo(() => {
    const deduped = new Map<string, MediaItem>();
    response.data?.pages.forEach((page) => {
      page.results.forEach((item) => {
        deduped.set(`${item.mediaType}:${item.id}`, item);
      });
    });
    return Array.from(deduped.values());
  }, [response.data]);

  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      if (!node) {
        return;
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (
            entry?.isIntersecting &&
            response.hasNextPage &&
            !response.isFetchingNextPage &&
            !response.isPending
          ) {
            void response.fetchNextPage();
          }
        },
        {
          threshold: 0.1,
          rootMargin: "0px 0px 300px 0px",
        },
      );

      observerRef.current.observe(node);
    },
    [response.fetchNextPage, response.hasNextPage, response.isFetchingNextPage, response.isPending],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return {
    ...response,
    items,
    loadMoreRef,
  };
};
