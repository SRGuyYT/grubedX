"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";

export default function RoutesLoading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d1117]">
      <div className="relative flex flex-col items-center gap-8">
        <div className="relative size-20 overflow-hidden rounded-[1.2rem] border border-white/10 shadow-[0_0_60px_rgba(255,90,42,0.15)] animate-pulse bg-black/50">
          <Image src="/512x512.png" alt="Loading GrubX" fill className="object-cover" />
        </div>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-[var(--accent)]" />
          <p className="text-xs font-semibold tracking-[0.3em] text-[var(--muted)] uppercase">Starting up</p>
        </div>
      </div>
    </div>
  );
}
