import type { PlaybackOptions } from "@/types/grubx";

export const GRUBX_PLAYER_PARAM_KEYS = [
  "theme",
  "color",
  "title",
  "poster",
  "overlay",
  "autoplay",
  "autoPlay",
  "startAt",
  "progress",
  "server",
  "sub",
  "nextEpisode",
  "autoNext",
  "episodeSelector",
  "fullscreenButton",
  "chromecast",
  "hideServer",
] as const;

const GRUBX_PLAYER_PARAM_SET = new Set<string>(GRUBX_PLAYER_PARAM_KEYS);

export const parsePlaybackOptions = (input: URLSearchParams | Record<string, string | string[] | undefined>) => {
  const options: PlaybackOptions = {};

  if (input instanceof URLSearchParams) {
    input.forEach((value, key) => {
      if (GRUBX_PLAYER_PARAM_SET.has(key) && value.length > 0) {
        options[key as keyof PlaybackOptions] = value;
      }
    });
    return options;
  }

  Object.entries(input).forEach(([key, value]) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    if (GRUBX_PLAYER_PARAM_SET.has(key) && normalized) {
      options[key as keyof PlaybackOptions] = normalized;
    }
  });

  return options;
};

export const appendPlaybackOptions = (url: string, options?: PlaybackOptions) => {
  if (!options) {
    return url;
  }

  const parsed = new URL(url);
  GRUBX_PLAYER_PARAM_KEYS.forEach((key) => {
    const value = options[key];
    if (typeof value === "string" && value.length > 0) {
      parsed.searchParams.set(key, value);
    }
  });

  return parsed.toString();
};
