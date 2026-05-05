"use client";

import { useEffect } from "react";

import { FeatureGate } from "@/components/feedback/FeatureGate";
import { useSettingsContext } from "@/context/SettingsContext";

const DEFAULT_ANIME_URL = "https://anime.nexus/";

const normalizeAnimeUrl = (input?: string | null) => {
  const value = (input ?? "").trim();
  if (!value) return DEFAULT_ANIME_URL;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return DEFAULT_ANIME_URL;
  }
  return DEFAULT_ANIME_URL;
};

function AnimeRedirector() {
  const { settings } = useSettingsContext();

  useEffect(() => {
    const animeUrl = normalizeAnimeUrl(settings.animeUrl);
    window.location.href = animeUrl;
  }, [settings.animeUrl]);

  return <section className="page-shell py-8 text-sm text-[var(--muted)]">Redirecting to Anime…</section>;
}

export default function AnimePage() {
  return (
    <FeatureGate feature="anime">
      <AnimeRedirector />
    </FeatureGate>
  );
}
