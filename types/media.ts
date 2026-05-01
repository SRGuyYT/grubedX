export type MediaType = "movie" | "tv";
export type SearchTarget = "all" | MediaType;

export type Genre = {
  id: number;
  name: string;
};

export type MediaItem = {
  id: string;
  tmdbId: number;
  title: string;
  mediaType: MediaType;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  rating: number | null;
  voteCount: number | null;
};

export type CastMember = {
  name: string;
  character: string;
  profilePath: string | null;
};

export type SeasonSummary = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  posterPath: string | null;
};

export type EpisodeSummary = {
  episodeNumber: number;
  name: string;
  overview: string;
  stillPath: string | null;
  airDate: string | null;
  runtime: number | null;
};

export type TrailerResult = {
  id: string;
  key: string;
  name: string;
  site: "YouTube";
  type: "Trailer";
  embedUrl: string;
  thumbnailUrl: string;
};

export type MediaDetails = MediaItem & {
  runtime: number | null;
  status: string | null;
  tagline: string | null;
  genres: Genre[];
  trailer: TrailerResult | null;
  cast: CastMember[];
  seasons: SeasonSummary[];
  totalSeasons: number | null;
};

export type MediaPage = {
  page: number;
  totalPages: number;
  totalResults?: number;
  results: MediaItem[];
};
