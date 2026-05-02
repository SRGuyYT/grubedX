"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ExternalLink, LogIn, LogOut, Play, Search, Youtube } from "lucide-react";
import { toast } from "sonner";

import { ExternalEmbedFrame } from "@/components/media/ExternalEmbedFrame";
import { ScreenMirrorButton } from "@/components/media/ScreenMirrorButton";
import { cn } from "@/lib/cn";
import type { YouTubeSearchItem, YouTubeSessionResponse } from "@/types/external";

type YouTubeMode = "videos" | "shorts";

const modeOptions: Array<{ value: YouTubeMode; label: string }> = [
  { value: "videos", label: "Videos" },
  { value: "shorts", label: "Shorts" },
];

const youtubeEmbedBase = (process.env.NEXT_PUBLIC_YOUTUBE_PROXY_BASE || "https://www.youtube-nocookie.com").replace(/\/+$/, "");
const youtubeWebBase = (process.env.NEXT_PUBLIC_YOUTUBE_WEB_PROXY_BASE || "https://www.youtube.com").replace(/\/+$/, "");

const embedUrlFor = (id: string) => `${youtubeEmbedBase}/embed/${encodeURIComponent(id)}`;
const watchUrlFor = (id: string) => `${youtubeWebBase}/watch?v=${encodeURIComponent(id)}`;

function SetupPanel({ redirectUri }: { redirectUri?: string }) {
  return (
    <div className="liquid-glass-soft rounded-[1rem] border border-white/10 p-5">
      <p className="text-sm font-semibold text-white">YouTube setup is needed</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Add a YouTube API key for search, or connect Google OAuth so users can sign in with their YouTube account.
      </p>
      <div className="mt-4 grid gap-2 rounded-[0.9rem] border border-white/10 bg-black/34 p-4 text-xs text-white/82">
        <code>YOUTUBE_API_KEY=</code>
        <code>YOUTUBE_CLIENT_ID=</code>
        <code>YOUTUBE_CLIENT_SECRET=</code>
        <code>YOUTUBE_REDIRECT_URI={redirectUri ?? "http://127.0.0.1:3000/api/youtube/callback"}</code>
      </div>
    </div>
  );
}

export function YouTubeConsole() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<YouTubeMode>("videos");
  const [results, setResults] = useState<YouTubeSearchItem[]>([]);
  const [selected, setSelected] = useState<YouTubeSearchItem | null>(null);
  const [session, setSession] = useState<YouTubeSessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedEmbedUrl = useMemo(() => (selected ? embedUrlFor(selected.id) : ""), [selected]);

  const loadSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const response = await fetch("/api/youtube/session", { cache: "no-store" });
      setSession((await response.json()) as YouTubeSessionResponse);
    } catch {
      setSession({ configured: true, authenticated: false });
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const logout = async () => {
    await fetch("/api/youtube/logout", { method: "POST", credentials: "same-origin" });
    setSession({ configured: true, authenticated: false, apiKeyConfigured: session?.apiKeyConfigured });
    toast.success("YouTube disconnected.");
  };

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const params = new URLSearchParams({ q: query.trim(), mode });
      const response = await fetch(`/api/youtube/search?${params.toString()}`, { credentials: "same-origin" });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; setupRequired?: boolean; results?: YouTubeSearchItem[]; setup?: { redirectUri: string } }
        | null;

      if (!response.ok || body?.setupRequired) {
        setResults([]);
        setSelected(null);
        setMessage(body?.error ?? "YouTube search is not available yet.");
        return;
      }

      const nextResults = body?.results ?? [];
      setResults(nextResults);
      setSelected(nextResults[0] ?? null);
      if (nextResults.length === 0) {
        setMessage(mode === "shorts" ? "No Shorts found." : "No videos found.");
      }
    });
  };

  return (
    <section className="page-shell space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <Youtube className="size-5 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">YouTube</p>
          </div>
          <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">YouTube in GrubX</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Search videos and Shorts, sign in with YouTube, and play through the privacy-friendly embed route.
          </p>
        </div>

        <div className="liquid-glass-soft rounded-[1rem] border border-white/10 p-4 lg:min-w-[320px]">
          {sessionLoading ? (
            <p className="min-h-11 text-sm text-[var(--muted)]">Checking YouTube account...</p>
          ) : session?.authenticated ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">{session.user?.name ?? "YouTube account"}</p>
              <p className="text-xs leading-5 text-[var(--muted)]">
                Premium features depend on YouTube. GrubX uses standard YouTube embeds.
              </p>
              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 text-sm font-semibold text-white"
              >
                <LogOut className="size-4" />
                Disconnect
              </button>
            </div>
          ) : (
            <a
              href="/api/youtube/login"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold !text-black transition active:scale-[0.98]"
            >
              <LogIn className="size-4" />
              Log in with YouTube
            </a>
          )}
        </div>
      </div>

      {session?.configured === false ? <SetupPanel redirectUri={session.setup?.redirectUri} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="min-w-0 space-y-5">
          <form onSubmit={search} className="liquid-glass-soft rounded-[1rem] border border-white/10 p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="flex rounded-full border border-white/10 bg-white/6 p-1">
                {modeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={cn(
                      "min-h-11 flex-1 rounded-full px-5 text-sm font-bold transition lg:flex-none",
                      mode === option.value ? "bg-white text-black" : "text-[var(--muted)] hover:text-white",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={mode === "shorts" ? "Search Shorts..." : "Search videos..."}
                className="min-h-12 flex-1 rounded-full border border-white/10 bg-black/40 px-5 text-sm text-white outline-none placeholder:text-[var(--muted)]"
              />
              <button
                type="submit"
                disabled={isPending || query.trim().length === 0}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search className="size-4" />
                {isPending ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {message ? (
            <div className="rounded-[1rem] border border-white/10 bg-white/[0.035] p-4 text-sm text-[var(--muted)]">
              {message}
            </div>
          ) : null}

          {results.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className={cn(
                    "group overflow-hidden rounded-[1rem] border bg-white/[0.035] text-left transition active:scale-[0.99]",
                    selected?.id === item.id ? "border-[var(--accent)]" : "border-white/10 hover:border-white/22",
                  )}
                >
                  <div className="aspect-video bg-black">
                    {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-4">
                    <div className="mb-2 inline-flex rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                      {item.kind === "short" ? "Short" : "Video"}
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 truncate text-xs text-[var(--muted)]">{item.channelTitle}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid min-h-[260px] place-items-center rounded-[1rem] border border-white/10 bg-white/[0.03] px-6 text-center text-sm text-[var(--muted)]">
              Search YouTube videos or Shorts to start watching.
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="aspect-video overflow-hidden rounded-[1rem] border border-white/10 bg-black">
            {selected ? (
              <ExternalEmbedFrame src={selectedEmbedUrl} title={selected.title} className="h-full w-full border-0" />
            ) : (
              <div className="grid h-full place-items-center px-6 text-center text-sm text-[var(--muted)]">
                Select a result to play.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ScreenMirrorButton label="Cast / Mirror" />
            {selected ? (
              <a
                href={watchUrlFor(selected.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 text-sm font-semibold text-white"
              >
                <ExternalLink className="size-4" />
                Open on YouTube
              </a>
            ) : null}
          </div>
          {selected ? (
            <div className="rounded-[1rem] border border-white/10 bg-white/[0.035] p-4">
              <p className="text-sm font-semibold text-white">{selected.title}</p>
              <p className="mt-2 line-clamp-4 text-sm leading-6 text-[var(--muted)]">{selected.description}</p>
              <button
                type="button"
                onClick={() => setSelected(selected)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black"
              >
                <Play className="size-4" />
                Play Here
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
