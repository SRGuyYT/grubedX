const YOUTUBE_EMBED_BASE = "https://www.youtube-nocookie.com/embed";
const YOUTUBE_WATCH_BASE = "https://www.youtube.com/watch";

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{6,}$/;

export function getYouTubeVideoId(input: string) {
  const value = input.trim();
  if (!value) {
    return null;
  }

  if (YOUTUBE_ID_PATTERN.test(value) && !value.includes(".") && !value.includes("/")) {
    return value;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/").filter(Boolean)[1] ?? null;
      }

      const watchId = url.searchParams.get("v");
      if (watchId) {
        return watchId;
      }

      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/").filter(Boolean)[1] ?? null;
      }
    }

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }
  } catch {
    return null;
  }

  return null;
}

export function toYouTubeEmbedUrl(input: string) {
  const videoId = getYouTubeVideoId(input);
  return videoId ? `${YOUTUBE_EMBED_BASE}/${encodeURIComponent(videoId)}` : null;
}

export function toYouTubeWatchUrl(input: string) {
  const videoId = getYouTubeVideoId(input);
  if (!videoId) {
    return "https://www.youtube.com/";
  }

  const url = new URL(YOUTUBE_WATCH_BASE);
  url.searchParams.set("v", videoId);
  return url.toString();
}
