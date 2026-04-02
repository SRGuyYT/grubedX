"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LoaderCircle, Play, X } from "lucide-react";
import { cn } from "@/lib/cn";

type LiveSource = {
  source: string;
  id: string;
};

type LiveMatch = {
  id: string;
  title: string;
  category: string;
  date: number;
  poster?: string;
  teams?: {
    home?: { name: string; badge: string };
    away?: { name: string; badge: string };
  };
  sources: LiveSource[];
};

type LiveStream = {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
};

const API_BASE = "https://streamed.pk";

const resolvePosterUrl = (match: LiveMatch) => {
  if (match.poster) {
    const path = match.poster.startsWith("/") ? match.poster : `/${match.poster}`;
    return `${API_BASE}${path}.webp`;
  }

  const homeBadge = match.teams?.home?.badge;
  const awayBadge = match.teams?.away?.badge;
  if (homeBadge && awayBadge) {
    return `${API_BASE}/api/images/poster/${homeBadge}/${awayBadge}.webp`;
  }

  return "/512x512.png";
};

export default function LiveTVPage() {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<LiveMatch | null>(null);
  const [activeStreamUrl, setActiveStreamUrl] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<LiveSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMatches = async () => {
      setLoadingMatches(true);
      setMatchesError(null);

      try {
        const response = await fetch("/api/live/matches", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Unable to load live matches (${response.status})`);
        }

        const payload = (await response.json()) as LiveMatch[];
        if (!cancelled) {
          setMatches(Array.isArray(payload) ? payload : []);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unable to load live matches right now.";
          setMatchesError(message);
        }
      } finally {
        if (!cancelled) {
          setLoadingMatches(false);
        }
      }
    };

    void fetchMatches();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeStreamUrl) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [activeStreamUrl]);

  const closeOverlay = () => {
    setActiveMatch(null);
    setActiveStreamUrl(null);
    setActiveSource(null);
  };

  const openStream = async (match: LiveMatch, source?: LiveSource) => {
    const selectedSource = source ?? match.sources[0];
    if (!selectedSource) {
      return;
    }

    setLoadingStreams(true);
    setActiveMatch(match);
    setActiveSource(selectedSource);

    try {
      const streamResponse = await fetch(
        `/api/live/streams?source=${encodeURIComponent(selectedSource.source)}&id=${encodeURIComponent(selectedSource.id)}`,
        { cache: "no-store" }
      );
      if (!streamResponse.ok) {
        throw new Error(`Unable to load streams (${streamResponse.status})`);
      }
      const streams = (await streamResponse.json()) as LiveStream[];
      const playable = streams.find((stream) => stream.embedUrl) ?? null;
      setActiveStreamUrl(playable?.embedUrl ?? null);
    } catch {
      setActiveStreamUrl(null);
    } finally {
      setLoadingStreams(false);
    }
  };

  return (
    <div className="pb-12">
      <section className="relative overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 bg-gradient-to-r from-[#05070b] via-[#05070bf2] to-[#05070b30]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070b] via-[#05070b99] to-[#05070b80]" />
        
        <div className="page-shell relative z-10 py-10 md:py-16">
          <div className="liquid-glass rounded-[2rem] px-6 py-7 md:px-8 md:py-10">
            <p className="mb-4 text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Live TV</p>
            <h1 className="text-4xl font-semibold leading-none sm:text-5xl md:text-6xl">
              Always On
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              Tune into 24/7 streaming networks including news, music, games, and science. 
              Live streams are delivered directly to your device.
            </p>
          </div>
        </div>
      </section>

      <section className="page-shell mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loadingMatches ? (
          <div className="col-span-full flex items-center justify-center rounded-[1.6rem] border border-white/10 bg-black/40 px-6 py-12 text-[var(--muted)]">
            <LoaderCircle className="mr-3 size-5 animate-spin" /> Loading live matches…
          </div>
        ) : null}

        {matchesError ? (
          <div className="col-span-full rounded-[1.6rem] border border-red-400/20 bg-red-500/10 px-6 py-5 text-red-100">
            {matchesError}
          </div>
        ) : null}

        {!loadingMatches && !matchesError && matches.length === 0 ? (
          <div className="col-span-full rounded-[1.6rem] border border-white/10 bg-black/40 px-6 py-12 text-center text-[var(--muted)]">
            No live streams are available right now.
          </div>
        ) : null}

        {matches.map((match) => (
          <article
            key={match.id}
            onClick={() => void openStream(match)}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[1.6rem] transition-transform duration-300 hover:scale-[1.02]"
          >
            <div className="liquid-glass-soft flex h-full flex-col">
              <div className="relative aspect-video w-full overflow-hidden">
                <Image
                  src={resolvePosterUrl(match)}
                  alt={match.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
                <div className="absolute right-3 top-3 rounded-full bg-red-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-red-500/30">
                  <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white align-middle" />
                  Live
                </div>
                
                <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-black shadow-lg shadow-[var(--accent)]/30">
                    <Play className="h-6 w-6 fill-current" />
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="mb-1 text-xs uppercase tracking-wider text-[var(--accent)]">{match.category}</p>
                  <h3 className="truncate text-lg font-semibold text-white">{match.title}</h3>
                </div>
              </div>
              <div className="p-4">
                <p className="line-clamp-2 text-sm text-[var(--muted)]">
                  {new Date(match.date).toLocaleString()}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      {activeMatch && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/88 px-4 py-4 backdrop-blur-md">
          <button type="button" className="absolute inset-0" onClick={closeOverlay} aria-label="Close" />
          <div className="liquid-glass relative z-[86] flex h-[min(88vh,880px)] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] p-4">
            <div className="relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-white/10 bg-black">
              <div className="relative z-10 flex items-center justify-between border-b border-white/10 bg-[#0d1117]/90 px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Live Stream</p>
                  <h3 className="text-2xl font-semibold text-white">{activeMatch.title}</h3>
                  {activeSource ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                      Source: {activeSource.source}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="rounded-full border border-white/10 bg-black/45 p-3 text-[var(--muted)] transition hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="relative flex-1 bg-black">
                {loadingStreams ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)]">
                    <LoaderCircle className="mr-3 size-5 animate-spin" /> Loading stream…
                  </div>
                ) : null}
                {!loadingStreams && activeStreamUrl ? (
                  <iframe
                    src={activeStreamUrl}
                    title={activeMatch.title}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                ) : null}
                {!loadingStreams && !activeStreamUrl ? (
                  <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-[var(--muted)]">
                    Stream unavailable for this source. Try another live match.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
