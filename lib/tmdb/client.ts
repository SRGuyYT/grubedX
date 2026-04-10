"use client";

import type { Genre, MediaDetails, MediaPage, MediaType } from "@/types/media";
import {
  normalizeEpisodes,
  normalizeGenreList,
  normalizeMediaDetails,
  normalizeMediaPage,
  normalizeTrailer,
} from "@/lib/tmdb/normalizers";

const buildUrl = (path: string, params: Record<string, string | number | undefined>) => {
  const url = new URLSearchParams();
  url.set("path", path);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.set(key, String(value));
    }
  });
  return `/api/tmdb?${url.toString()}`;
};

const tmdbClientFetch = async <T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
) => {
  const response = await fetch(buildUrl(path, params), {
    credentials: "same-origin",
    signal,
  });
  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status} ${path}`);
  }
  return (await response.json()) as T;
};

export const getClientMediaPage = async (options: {
  mediaType: MediaType;
  genre?: string | null;
  page?: number;
  query?: string;
  category?: "popular" | "top_rated";
  signal?: AbortSignal;
}): Promise<MediaPage> => {
  const { mediaType, genre, page = 1, query, category = "popular", signal } = options;

  if (query && query.trim().length > 0) {
    const payload = await tmdbClientFetch<Record<string, unknown>>(`/search/${mediaType}`, { query, page }, signal);
    return normalizeMediaPage(payload, mediaType);
  }

  if (genre) {
    const payload = await tmdbClientFetch<Record<string, unknown>>(
      `/discover/${mediaType}`,
      { with_genres: genre, page, sort_by: "popularity.desc" },
      signal,
    );
    return normalizeMediaPage(payload, mediaType);
  }

  const payload = await tmdbClientFetch<Record<string, unknown>>(`/${mediaType}/${category}`, { page }, signal);
  return normalizeMediaPage(payload, mediaType);
};

export const getClientMediaDetails = async (
  mediaType: MediaType,
  id: string,
  signal?: AbortSignal,
): Promise<MediaDetails> => {
  const payload = await tmdbClientFetch<Record<string, unknown>>(
    `/${mediaType}/${id}`,
    { append_to_response: "videos,credits" },
    signal,
  );
  return normalizeMediaDetails(payload, mediaType);
};

export const getClientSeasonEpisodes = async (id: string, season: number, signal?: AbortSignal) => {
  const payload = await tmdbClientFetch<Record<string, unknown>>(`/tv/${id}/season/${season}`, {}, signal);
  return {
    seasonNumber: Number(payload.season_number ?? season),
    episodes: normalizeEpisodes(payload.episodes),
  };
};

export const getClientTrailer = async (mediaType: MediaType, id: string, signal?: AbortSignal) => {
  const payload = await tmdbClientFetch<{ results?: unknown[] }>(`/${mediaType}/${id}/videos`, {}, signal);
  return normalizeTrailer(payload.results);
};

export const getClientGenres = async (mediaType: MediaType, signal?: AbortSignal): Promise<Genre[]> => {
  const payload = await tmdbClientFetch<{ genres?: unknown[] }>(`/genre/${mediaType}/list`, {}, signal);
  return normalizeGenreList(payload.genres);
};
