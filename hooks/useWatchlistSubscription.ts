"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { dataLayer } from "@/lib/dataLayer";
import type { WatchlistItem } from "@/types/data-layer";

export const useWatchlistSubscription = () => {
  const queryClient = useQueryClient();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const queryKey = queryKeys.watchlist;

  useEffect(() => {
    setIsBootstrapping(true);
    return dataLayer.subscribeWatchlist(
      (items) => {
        queryClient.setQueryData(queryKey, items);
        setIsBootstrapping(false);
      },
      () => {
        queryClient.setQueryData(queryKey, []);
        setIsBootstrapping(false);
      },
    );
  }, [queryClient]);

  const query = useQuery<WatchlistItem[]>({
    queryKey,
    queryFn: () => dataLayer.loadWatchlist(),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return {
    ...query,
    isBootstrapping,
  };
};
