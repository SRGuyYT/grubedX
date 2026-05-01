"use client";

import { type FormEvent, useState, useTransition } from "react";
import { Video } from "lucide-react";

import type { TikTokOEmbedResponse } from "@/types/external";

export function TikTokConsole() {
  const [url, setUrl] = useState("");
  const [embed, setEmbed] = useState<TikTokOEmbedResponse | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/tiktok/oembed?url=${encodeURIComponent(url)}`, {
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

  return (
    <section className="page-shell space-y-8">
      <div className="max-w-3xl">
        <div className="flex items-center gap-3">
          <Video className="size-5 text-[var(--accent)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">TikTok</p>
        </div>
        <h1 className="mt-4 text-4xl font-bold text-white md:text-6xl">Open TikTok posts</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Paste a TikTok link. GrubX uses TikTok oEmbed through a server route and does not scrape TikTok.
        </p>
        <form onSubmit={submit} className="mt-7 flex flex-col gap-3 sm:flex-row">
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.tiktok.com/@user/video/..."
            className="min-h-11 flex-1 rounded-full border border-white/10 bg-black/40 px-5 py-3 text-sm text-white outline-none placeholder:text-[var(--muted)]"
          />
          <button
            type="submit"
            disabled={isPending || url.trim().length === 0}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Loading..." : "Open"}
          </button>
        </form>
        {message ? <p className="mt-4 text-sm text-red-200">{message}</p> : null}
      </div>

      <div className="overflow-hidden rounded-[1rem] border border-white/10 bg-black p-4">
        {embed?.html ? (
          <div className="mx-auto max-w-xl" dangerouslySetInnerHTML={{ __html: embed.html }} />
        ) : (
          <div className="grid min-h-[360px] place-items-center px-6 text-center text-sm text-[var(--muted)]">
            Your TikTok embed will appear here.
          </div>
        )}
      </div>
    </section>
  );
}
