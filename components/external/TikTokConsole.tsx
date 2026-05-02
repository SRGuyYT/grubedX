"use client";

import { type FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import { ExternalLink, LogIn, LogOut, Search, Video } from "lucide-react";
import { toast } from "sonner";

import { ScreenMirrorButton } from "@/components/media/ScreenMirrorButton";
import { cn } from "@/lib/cn";
import type { TikTokOEmbedResponse, TikTokSearchItem, TikTokSearchResponse, TikTokSessionResponse } from "@/types/external";

type TikTokMode = "videos" | "shorts";

const modeOptions: Array<{ value: TikTokMode; label: string }> = [
  { value: "videos", label: "Videos" },
  { value: "shorts", label: "Shorts" },
];

const tiktokWebBase = (process.env.NEXT_PUBLIC_TIKTOK_PROXY_BASE || "https://www.tiktok.com").replace(/\/+$/, "");

function SetupPanel({ redirectUri }: { redirectUri?: string }) {
  return (
    <div className="liquid-glass-soft rounded-[1rem] border border-white/10 p-5">
      <p className="text-sm font-semibold text-white">TikTok login setup is optional</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        TikTok embeds work from pasted links. Search needs a configured TikTok search proxy, and login needs TikTok OAuth credentials.
      </p>
      <div className="mt-4 grid gap-2 rounded-[0.9rem] border border-white/10 bg-black/34 p-4 text-xs text-white/82">
        <code>TIKTOK_SEARCH_PROXY_BASE=</code>
        <code>TIKTOK_CLIENT_KEY=</code>
        <code>TIKTOK_CLIENT_SECRET=</code>
        <code>TIKTOK_REDIRECT_URI={redirectUri ?? "http://127.0.0.1:3000/api/tiktok/callback"}</code>
      </div>
    </div>
  );
}

export function TikTokConsole() {
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<TikTokMode>("videos");
  const [results, setResults] = useState<TikTokSearchItem[]>([]);
  const [searchUrl, setSearchUrl] = useState("");
  const [embed, setEmbed] = useState<TikTokOEmbedResponse | null>(null);
  const [session, setSession] = useState<TikTokSessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadSession = useCallback(async () => {
    setSessionLoading(true);
    try {
      const response = await fetch("/api/tiktok/session", { cache: "no-store" });
      setSession((await response.json()) as TikTokSessionResponse);
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
    await fetch("/api/tiktok/logout", { method: "POST", credentials: "same-origin" });
    setSession({ configured: true, authenticated: false });
    toast.success("TikTok disconnected.");
  };

  const loadEmbed = (inputUrl: string) => {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/tiktok/oembed?url=${encodeURIComponent(inputUrl)}`, {
        credentials: "same-origin",
      });
      const body = (await response.json().catch(() => null)) as (TikTokOEmbedResponse & { error?: string }) | null;
      if (!response.ok || !body?.html) {
        setEmbed(null);
        setMessage(body?.error ?? "TikTok embed is unavailable right now.");
        return;
      }

      setEmbed(body);
    });
  };

  const submitUrl = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loadEmbed(url.trim());
  };

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const params = new URLSearchParams({ q: query.trim(), mode });
      const response = await fetch(`/api/tiktok/search?${params.toString()}`, { credentials: "same-origin" });
      const body = (await response.json().catch(() => null)) as TikTokSearchResponse | null;
      const nextResults = body?.results ?? [];
      setResults(nextResults);
      setSearchUrl(body?.searchUrl ?? `${tiktokWebBase}/search?q=${encodeURIComponent(query.trim())}`);
      if (body?.message) {
        setMessage(body.message);
      } else if (nextResults.length === 0) {
        setMessage("No TikTok results found here. You can open TikTok search directly.");
      }
    });
  };

  return (
    <section className="page-shell space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <Video className="size-5 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">TikTok</p>
          </div>
          <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">TikTok in GrubX</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Search videos and Shorts through your proxy, paste TikTok links, and sign in when OAuth is configured.
          </p>
        </div>

        <div className="liquid-glass-soft rounded-[1rem] border border-white/10 p-4 lg:min-w-[320px]">
          {sessionLoading ? (
            <p className="min-h-11 text-sm text-[var(--muted)]">Checking TikTok account...</p>
          ) : session?.authenticated ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">{session.user?.name ?? "TikTok account"}</p>
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
              href="/api/tiktok/login"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold !text-black transition active:scale-[0.98]"
            >
              <LogIn className="size-4" />
              Log in with TikTok
            </a>
          )}
        </div>
      </div>

      {session?.configured === false ? <SetupPanel redirectUri={session.setup?.redirectUri} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-5">
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
                placeholder={mode === "shorts" ? "Search TikTok Shorts..." : "Search TikTok videos..."}
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

          <form onSubmit={submitUrl} className="liquid-glass-soft rounded-[1rem] border border-white/10 p-4">
            <p className="mb-3 text-sm font-semibold text-white">Open a TikTok link</p>
            <div className="flex flex-col gap-3 md:flex-row">
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://www.tiktok.com/@user/video/..."
                className="min-h-12 flex-1 rounded-full border border-white/10 bg-black/40 px-5 text-sm text-white outline-none placeholder:text-[var(--muted)]"
              />
              <button
                type="submit"
                disabled={isPending || url.trim().length === 0}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Loading..." : "Open"}
              </button>
            </div>
          </form>

          {message ? (
            <div className="rounded-[1rem] border border-white/10 bg-white/[0.035] p-4 text-sm text-[var(--muted)]">
              {message}
              {searchUrl ? (
                <a
                  href={searchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 inline-flex font-semibold text-white underline decoration-white/30 underline-offset-4"
                >
                  Open TikTok Search
                </a>
              ) : null}
            </div>
          ) : null}

          {results.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setUrl(item.url);
                    loadEmbed(item.url);
                  }}
                  className="group overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.035] text-left transition hover:border-white/22 active:scale-[0.99]"
                >
                  <div className="aspect-[9/12] bg-black">
                    {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-4">
                    <div className="mb-2 inline-flex rounded-full border border-white/10 bg-white/8 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                      {item.kind === "short" ? "Short" : "Video"}
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
                    {item.authorName ? <p className="mt-2 truncate text-xs text-[var(--muted)]">{item.authorName}</p> : null}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="space-y-3">
          <div className="overflow-hidden rounded-[1rem] border border-white/10 bg-black p-4">
            {embed?.html ? (
              <div className="mx-auto max-w-xl" dangerouslySetInnerHTML={{ __html: embed.html }} />
            ) : (
              <div className="grid min-h-[420px] place-items-center px-6 text-center text-sm text-[var(--muted)]">
                Search TikTok or paste a link to show the embed here.
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ScreenMirrorButton label="Cast / Mirror" />
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 text-sm font-semibold text-white"
              >
                <ExternalLink className="size-4" />
                Open on TikTok
              </a>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
