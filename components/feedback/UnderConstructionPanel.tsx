"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, Construction } from "lucide-react";
import { toast } from "sonner";

export function UnderConstructionPanel({ featureName }: { featureName?: string }) {
  const [pageUrl, setPageUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPageUrl(`${window.location.pathname}${window.location.search}`);
  }, []);

  const notifyTeam = () => {
    startTransition(async () => {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          category: "report",
          area: "external-media",
          priority: "medium",
          title: "User reached an under-construction page",
          message:
            "A user clicked Notify GrubX Team because this page is missing, unfinished, or broken.",
          pageUrl,
        }),
      });

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        toast.error(body?.error ?? "Unable to notify the GrubX team right now.");
        return;
      }

      toast.success("Thanks - the GrubX team was notified.");
    });
  };

  return (
    <section className="page-shell min-h-[72dvh]">
      <div className="flex min-h-[62dvh] items-center justify-center py-12">
        <div className="w-full max-w-2xl rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:p-10">
          <div className="mx-auto grid size-14 place-items-center rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] text-[var(--accent)]">
            <Construction className="size-6" />
          </div>
          {featureName ? (
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              {featureName}
            </p>
          ) : null}
          <h1 className="mt-4 text-3xl font-bold text-white md:text-5xl">
            This page is still under construction
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[var(--muted)] md:text-base">
            This page is still under construction. If you think this is an error, contact the GrubX team on Matrix.
          </p>
          <button
            type="button"
            onClick={notifyTeam}
            disabled={isPending}
            className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Bell className="size-4" />
            {isPending ? "Notifying..." : "Notify GrubX Team"}
          </button>
        </div>
      </div>
    </section>
  );
}
