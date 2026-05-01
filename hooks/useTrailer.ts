"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { getClientTrailer } from "@/lib/tmdb/client";
import type { MediaType } from "@/types/media";

export const useTrailer = (mediaType: MediaType, id: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.trailer(mediaType, id),
    queryFn: ({ signal }) => getClientTrailer(mediaType, id, signal),
    enabled: enabled && Boolean(id),
    staleTime: 1000 * 60 * 10,
  });
