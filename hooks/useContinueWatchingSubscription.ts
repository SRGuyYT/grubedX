"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { dataLayer } from "@/lib/dataLayer";
import type { PlaybackProgress } from "@/types/data-layer";

export const useContinueWatchingSubscription = () => {
  const queryClient = useQueryClient();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const queryKey = queryKeys.continueWatching;

  useEffect(() => {
    setIsBootstrapping(true);
    return dataLayer.subscribeContinueWatching(
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

  const query = useQuery<PlaybackProgress[]>({
    queryKey,
    queryFn: () => dataLayer.loadContinueWatching(),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return {
    ...query,
    isBootstrapping,
  };
};
