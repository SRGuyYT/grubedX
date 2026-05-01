"use client";

import { MediaRow } from "@/components/media/MediaRow";
import { useSettingsContext } from "@/context/SettingsContext";
import type { MediaItem } from "@/types/media";

export function NotFoundTrending({ items }: { items: MediaItem[] }) {
  const { settings } = useSettingsContext();

  if (!settings.showTrendingOn404 || items.length === 0) {
    return null;
  }

  return (
    <MediaRow
      title="Trending right now"
      description="Jump back into the live catalog with titles that are currently moving."
      items={items}
    />
  );
}
