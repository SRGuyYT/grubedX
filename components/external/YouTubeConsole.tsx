"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Music2, Search, Youtube } from "lucide-react";

import { ExternalEmbedFrame } from "@/components/media/ExternalEmbedFrame";
import type { YouTubeSearchItem } from "@/types/external";

export function YouTubeConsole({ musicMode = false }: { musicMode?: boolean }) {
  const [query, setQuery] = useState(musicMode ? "official music video" : "");
  const [results, setResults] = useState<YouTubeSearchItem[]>([]);
  const [selected, setSelected] = useState<YouTubeSearchItem | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const params = new URLSearchParams({ q: query, music: musicMode ? "true" : "false" });
      const response = await fetch(`/api/youtube/search?${params.toString()}`, { credentials: "same-origin" });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; setupRequired?: boolean; results?: YouTubeSearchItem[] }
        | null;

      if (!response.ok || body?.setupRequired) {
        setResults([]);
        setSelected(null);
        setMessage(body?.error ?? "Search is not available yet.");
        return;
      }

      const nextResults = body?.results ?? [];
      setResults(nextResults);
      setSelected(nextResults[0] ?? null);
      if (nextResults.length === 0) {
        setMessage("No videos found.");
      }
    });
  };

  return (
    <section className="page-shell space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {musicMode ? <Music2 className="size-5 text-[var(--accent)]" /> : <Youtube className="size-5 text-[var(--accent)]" />}
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
              {musicMode ? "YT Music" : "YouTube"}
            </p>
          </div>
          <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">
            {musicMode ? "Find music on YouTube" : "Watch YouTube inside GrubX"}
          </h1>
          <form onSubmit={search} className="mt-7 flex flex-col gap-3 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={musicMode ? "Search songs, artists, live sessions..." : "Search videos..."}
              className="min-h-11 flex-1 rounded-full border border-white/10 bg-black/40 px-5 py-3 text-sm text-white outline-none placeholder:text-[var(--muted)]"
            />
            <button
              type="submit"
              disabled={isPending || query.trim().length === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="size-4" />
              {isPending ? "Searching..." : "Search"}
            </button>
          </form>
          {message ? (
            <div className="mt-5 rounded-[1rem] border border-white/10 bg-white/[0.035] p-4 text-sm text-[var(--muted)]">
              {message}
            </div>
          ) : null}
        </div>

        <div className="aspect-video overflow-hidden rounded-[1rem] border border-white/10 bg-black">
          {selected ? (
            <ExternalEmbedFrame
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(selected.id)}`}
              title={selected.title}
              className="h-full w-full border-0"
            />
          ) : (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-[var(--muted)]">
              Search and select a video to play.
            </div>
          )}
        </div>
      </div>

      {results.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="group overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.035] text-left transition hover:border-white/22"
            >
              <div className="aspect-video bg-black">
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="p-4">
                <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-2 truncate text-xs text-[var(--muted)]">{item.channelTitle}</p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
