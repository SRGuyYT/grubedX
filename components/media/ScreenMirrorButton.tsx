"use client";

import { Cast } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/cn";

export function ScreenMirrorButton({
  className,
  label = "Cast / Mirror",
  target,
}: {
  className?: string;
  label?: string;
  target?: HTMLElement | null;
}) {
  const startMirror = async () => {
    try {
      const fullscreenTarget = target ?? document.documentElement;
      await fullscreenTarget.requestFullscreen?.();
      toast.message("Ready for screen mirroring", {
        description: "Use your browser, AirPlay, Chromecast, or TV mirror menu to send this full-screen view to a bigger screen.",
        duration: 5200,
      });
    } catch {
      toast.message("Use your device mirror menu", {
        description: "Open your browser, AirPlay, Chromecast, or TV screen-mirroring controls to cast this page.",
        duration: 5200,
      });
    }
  };

  return (
    <button
      type="button"
      onClick={startMirror}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 text-sm font-semibold text-white transition active:scale-[0.98]",
        className,
      )}
    >
      <Cast className="size-4" />
      {label}
    </button>
  );
}
