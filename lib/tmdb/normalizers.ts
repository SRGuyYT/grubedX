import type {
  CastMember,
  EpisodeSummary,
  Genre,
  MediaDetails,
  MediaItem,
  MediaPage,
  MediaType,
  SeasonSummary,
  TrailerResult,
} from "@/types/media";

type TmdbMediaRecord = Record<string, unknown>;

const normalizeTitle = (item: TmdbMediaRecord) => {
  const value = item.title ?? item.name ?? item.original_title ?? item.original_name;
  return typeof value === "string" ? value : "Untitled";
};

export const normalizeMediaItem = (item: TmdbMediaRecord, mediaType?: MediaType): MediaItem => {
  const resolvedMediaType =
    mediaType ?? (item.media_type === "tv" ? "tv" : item.media_type === "movie" ? "movie" : "movie");

  return {
    id: String(item.id ?? ""),
    tmdbId: Number(item.id ?? 0),
    title: normalizeTitle(item),
    mediaType: resolvedMediaType,
    overview: typeof item.overview === "string" ? item.overview : "",
    posterPath: typeof item.poster_path === "string" ? item.poster_path : null,
    backdropPath: typeof item.backdrop_path === "string" ? item.backdrop_path : null,
    releaseDate:
      typeof item.release_date === "string"
        ? item.release_date
        : typeof item.first_air_date === "string"
          ? item.first_air_date
          : null,
    rating: typeof item.vote_average === "number" ? item.vote_average : null,
    voteCount: typeof item.vote_count === "number" ? item.vote_count : null,
  };
};

export const normalizeGenreList = (input: unknown): Genre[] =>
  Array.isArray(input)
    ? input
        .map((genre) => ({
          id: Number((genre as { id?: number }).id ?? 0),
          name: String((genre as { name?: string }).name ?? ""),
        }))
        .filter((genre) => genre.id > 0 && genre.name.length > 0)
    : [];

export const normalizeTrailer = (input: unknown): TrailerResult | null => {
  if (!Array.isArray(input)) {
    return null;
  }

  const match = input.find((entry) => {
    const candidate = entry as { site?: string; type?: string };
    return candidate.site === "YouTube" && candidate.type === "Trailer";
  }) as { id?: string; key?: string; name?: string } | undefined;

  if (!match?.key) {
    return null;
  }

  return {
    id: String(match.id ?? match.key),
    key: match.key,
    name: String(match.name ?? "Official Trailer"),
    site: "YouTube",
    type: "Trailer",
    embedUrl: `https://www.youtube.com/embed/${match.key}`,
    thumbnailUrl: `https://img.youtube.com/vi/${match.key}/hqdefault.jpg`,
  };
};

export const normalizeCast = (input: unknown): CastMember[] =>
  Array.isArray(input)
    ? input.slice(0, 12).map((person) => ({
        name: String((person as { name?: string }).name ?? "Unknown"),
        character: String((person as { character?: string }).character ?? ""),
        profilePath: typeof (person as { profile_path?: string }).profile_path === "string"
          ? ((person as { profile_path?: string }).profile_path as string)
          : null,
      }))
    : [];

export const normalizeSeasons = (input: unknown): SeasonSummary[] =>
  Array.isArray(input)
    ? input
        .map((season) => ({
          seasonNumber: Number((season as { season_number?: number }).season_number ?? 0),
          name: String((season as { name?: string }).name ?? ""),
          episodeCount: Number((season as { episode_count?: number }).episode_count ?? 0),
          posterPath:
            typeof (season as { poster_path?: string }).poster_path === "string"
              ? ((season as { poster_path?: string }).poster_path as string)
              : null,
        }))
        .filter((season) => season.seasonNumber > 0)
    : [];

export const normalizeEpisodes = (input: unknown): EpisodeSummary[] =>
  Array.isArray(input)
    ? input.map((episode) => ({
        episodeNumber: Number((episode as { episode_number?: number }).episode_number ?? 0),
        name: String((episode as { name?: string }).name ?? ""),
        overview: String((episode as { overview?: string }).overview ?? ""),
        stillPath:
          typeof (episode as { still_path?: string }).still_path === "string"
            ? ((episode as { still_path?: string }).still_path as string)
            : null,
        airDate:
          typeof (episode as { air_date?: string }).air_date === "string"
            ? ((episode as { air_date?: string }).air_date as string)
            : null,
        runtime: typeof (episode as { runtime?: number }).runtime === "number"
          ? ((episode as { runtime?: number }).runtime as number)
          : null,
      }))
    : [];

export const normalizeMediaPage = (payload: TmdbMediaRecord, mediaType?: MediaType): MediaPage => ({
  page: Number(payload.page ?? 1),
  totalPages: Number(payload.total_pages ?? 1),
  totalResults: typeof payload.total_results === "number" ? payload.total_results : undefined,
  results: Array.isArray(payload.results)
    ? (payload.results as TmdbMediaRecord[])
        .filter((entry) => {
          if (!mediaType) {
            return entry.media_type === "movie" || entry.media_type === "tv" || !entry.media_type;
          }
          return true;
        })
        .map((entry) => normalizeMediaItem(entry, mediaType))
    : [],
});

export const normalizeMediaDetails = (payload: TmdbMediaRecord, mediaType: MediaType): MediaDetails => ({
  ...normalizeMediaItem(payload, mediaType),
  runtime: typeof payload.runtime === "number" ? payload.runtime : null,
  status: typeof payload.status === "string" ? payload.status : null,
  tagline: typeof payload.tagline === "string" ? payload.tagline : null,
  genres: normalizeGenreList(payload.genres),
  trailer: normalizeTrailer((payload.videos as { results?: unknown[] } | undefined)?.results),
  cast: normalizeCast((payload.credits as { cast?: unknown[] } | undefined)?.cast),
  seasons: normalizeSeasons(payload.seasons),
  totalSeasons: typeof payload.number_of_seasons === "number" ? payload.number_of_seasons : null,
});
