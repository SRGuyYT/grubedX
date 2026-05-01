export type YouTubeSearchItem = {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
};

export type SpotifyEmbedType = "track" | "album" | "playlist" | "artist" | "episode" | "show";

export type TikTokOEmbedResponse = {
  html: string;
  title?: string;
  authorName?: string;
  thumbnailUrl?: string;
};
