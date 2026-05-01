export type SpotifyImage = {
  url: string;
  width?: number | null;
  height?: number | null;
};

export type SpotifyUserSummary = {
  id: string;
  displayName: string;
  email?: string | null;
  product?: string | null;
  imageUrl?: string | null;
};

export type SpotifyArtistSummary = {
  id: string;
  name: string;
  uri: string;
  externalUrl: string;
  imageUrl?: string | null;
};

export type SpotifyAlbumSummary = {
  id: string;
  name: string;
  uri: string;
  externalUrl: string;
  imageUrl?: string | null;
  artists: string[];
  releaseDate?: string | null;
};

export type SpotifyPlaylistSummary = {
  id: string;
  name: string;
  uri: string;
  externalUrl: string;
  imageUrl?: string | null;
  owner?: string | null;
  tracksTotal?: number | null;
};

export type SpotifyTrackSummary = {
  id: string;
  name: string;
  uri: string;
  externalUrl: string;
  imageUrl?: string | null;
  artists: string[];
  album?: string | null;
  durationMs: number;
  explicit: boolean;
};

export type SpotifySearchResponse = {
  tracks: SpotifyTrackSummary[];
  albums: SpotifyAlbumSummary[];
  artists: SpotifyArtistSummary[];
  playlists: SpotifyPlaylistSummary[];
};

export type SpotifySessionResponse = {
  configured: boolean;
  authenticated: boolean;
  accessToken?: string;
  expiresAt?: number;
  premium?: boolean;
  user?: SpotifyUserSummary;
  setup?: {
    requiredEnv: string[];
    redirectUri: string;
  };
};
