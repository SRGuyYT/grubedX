"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import { MessageSquarePlus, Send } from "lucide-react";
import { toast } from "sonner";

import type { GrubXFeedbackCategory } from "@/types/grubx";

const categories: Array<{ value: GrubXFeedbackCategory; label: string }> = [
  { value: "add", label: "Add" },
  { value: "fix", label: "Fix" },
  { value: "remove", label: "Remove" },
  { value: "change", label: "Change" },
  { value: "report", label: "Report" },
  { value: "other", label: "Other" },
];

const areas = [
  { value: "player", label: "Player" },
  { value: "movies", label: "Movies" },
  { value: "tv", label: "TV" },
  { value: "live", label: "Live TV" },
  { value: "search", label: "Search" },
  { value: "settings", label: "Settings" },
  { value: "watchlist", label: "Watchlist" },
  { value: "continue-watching", label: "Continue Watching" },
  { value: "design-ui", label: "Design/UI" },
  { value: "account-data", label: "Account/Data" },
  { value: "external-media", label: "External Media" },
  { value: "other", label: "Other" },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function FeedbackPanel() {
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<GrubXFeedbackCategory>("add");
  const [area, setArea] = useState("player");
  const [priority, setPriority] = useState("medium");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(`${window.location.pathname}${window.location.search}`);
  }, []);

  const submitFeedback = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          category,
          area,
          priority,
          title,
          message,
          pageUrl,
        }),
      });

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        toast.error(body?.error ?? "Unable to send feedback right now.");
        return;
      }

      toast.success("Thanks - your feedback was sent.");
      setTitle("");
      setMessage("");
    });
  };

  return (
    <section className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] px-5 py-7 md:px-7 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <MessageSquarePlus className="size-5 text-[var(--accent)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--accent)]">
              Feedback & Requests
            </p>
          </div>
          <h2 className="mt-4 text-3xl font-bold md:text-4xl">Send a note to GrubX</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            Request a feature, report a problem, suggest content, or flag something unsafe.
          </p>
        </div>
      </div>

      <form onSubmit={submitFeedback} className="mt-7 grid gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-white">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as GrubXFeedbackCategory)}
              className="rounded-full border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
            >
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-white">
            Area
            <select
              value={area}
              onChange={(event) => setArea(event.target.value)}
              className="rounded-full border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
            >
              {areas.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-white">
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="rounded-full border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
            >
              {priorities.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-white">
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
            placeholder="Short summary"
            className="rounded-[0.95rem] border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-[var(--muted)]"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-white">
          Message
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1500}
            required
            rows={5}
            placeholder="What should be added, fixed, removed, changed, or reviewed?"
            className="resize-none rounded-[0.95rem] border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-[var(--muted)]"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-white">
          Page
          <input
            value={pageUrl}
            onChange={(event) => setPageUrl(event.target.value)}
            maxLength={500}
            placeholder="/settings"
            className="rounded-[0.95rem] border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-[var(--muted)]"
          />
        </label>

        <div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="size-4" />
            {isPending ? "Sending..." : "Submit feedback"}
          </button>
        </div>
      </form>
    </section>
  );
}
