"use client";

import Link from "next/link";
import { Cast, MonitorUp, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/cn";

export function CastControls({
  className,
  label = "Watch on TV",
  target,
}: {
  className?: string;
  label?: string;
  target?: HTMLElement | null;
}) {
  const [open, setOpen] = useState(false);

  const castSupport = useMemo(() => {
    if (typeof window === "undefined") {
      return { supported: false, label: "Use your device mirror menu" };
    }

    const userAgent = window.navigator.userAgent;
    const browserCastMenu = /Chrome|Edg\//.test(userAgent);
    const presentationApi = "PresentationRequest" in window;
    const airPlayLike = /Macintosh|iPhone|iPad/.test(userAgent);

    return {
      supported: browserCastMenu || presentationApi || airPlayLike,
      label: browserCastMenu || presentationApi ? "Browser casting may be available" : "AirPlay may be available",
    };
  }, []);

  const requestFullscreen = async () => {
    const fullscreenTarget = target ?? document.documentElement;
    try {
      await fullscreenTarget.requestFullscreen?.();
      toast.success("Fullscreen is ready for mirroring.");
    } catch {
      toast.message("Use your device mirror menu", {
        description: "Your browser did not start fullscreen, but you can still mirror from your device controls.",
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 text-sm font-semibold text-white transition active:scale-[0.98]",
          className,
        )}
        aria-label="Watch on TV or mirror this screen"
      >
        <Cast className="size-4" />
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/72 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl sm:items-center">
          <button type="button" className="absolute inset-0" onClick={() => setOpen(false)} aria-label="Close TV mirror help" />
          <section className="relative z-[301] w-full max-w-xl rounded-[1.2rem] border border-white/12 bg-[#0b0f14]/95 p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">TV / Mirror</p>
                <h2 className="mt-3 text-2xl font-bold text-white">Watch on a bigger screen</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {castSupport.supported
                    ? castSupport.label
                    : "This browser does not expose a direct casting API, but device mirroring still works."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-white/6 text-[var(--muted)] transition hover:text-white"
                aria-label="Close TV mirror help"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 grid gap-3 text-sm leading-6 text-[var(--muted)]">
              <p>Chrome/Edge: Menu &gt; Cast.</p>
              <p>Windows: Press Win + K and choose your display.</p>
              <p>iPhone/iPad: Open Control Center and use AirPlay or Screen Mirroring.</p>
              <p>Android: Use Cast, Smart View, or your device mirror menu.</p>
              <p>Mac: Use AirPlay from Control Center or Display settings.</p>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={requestFullscreen}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black transition active:scale-[0.98]"
              >
                <MonitorUp className="size-4" />
                Make Fullscreen
              </button>
              <Link
                href="/tv-mode"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/6 px-5 text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                Open TV Mode
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
