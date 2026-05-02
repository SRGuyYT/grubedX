export type YouTubeSearchItem = {
  id: string;
  kind: "video" | "short";
  title: string;
  description: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  watchUrl?: string;
  embedUrl?: string;
};

export type YouTubeSessionResponse = {
  configured: boolean;
  authenticated: boolean;
  apiKeyConfigured?: boolean;
  user?: {
    id: string;
    name: string;
    email: string | null;
    imageUrl: string | null;
    channelId: string | null;
  };
  setup?: {
    redirectUri: string;
  };
};

export type SpotifyEmbedType = "track" | "album" | "playlist" | "artist" | "episode" | "show";

export type TikTokOEmbedResponse = {
  html: string;
  title?: string;
  authorName?: string;
  thumbnailUrl?: string;
};

export type TikTokSearchItem = {
  id: string;
  url: string;
  title: string;
  authorName?: string;
  thumbnailUrl: string | null;
  kind: "video" | "short";
};

export type TikTokSearchResponse = {
  results: TikTokSearchItem[];
  searchUrl?: string;
  setupRequired?: boolean;
  message?: string;
};

export type TikTokSessionResponse = {
  configured: boolean;
  authenticated: boolean;
  user?: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
  setup?: {
    redirectUri: string;
  };
};
