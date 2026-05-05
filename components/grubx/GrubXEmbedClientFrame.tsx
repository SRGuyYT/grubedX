"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { hasRiskConsent, isUnder13Suspended } from "@/lib/grubx/consent";

export function GrubXEmbedClientFrame({
  source,
  title,
}: {
  source: string;
  title: string;
}) {
  const [allowed, setAllowed] = useState(false);
  const [blockedReason, setBlockedReason] = useState<"under13" | "consent" | null>(null);

  useEffect(() => {
    if (isUnder13Suspended()) {
      setBlockedReason("under13");
      setAllowed(false);
      return;
    }

    if (!hasRiskConsent()) {
      setBlockedReason("consent");
      setAllowed(false);
      return;
    }

    setBlockedReason(null);
    setAllowed(true);
  }, []);

  if (!allowed) {
    return (
      <main className="grid min-h-dvh place-items-center bg-black px-5 text-center text-white">
        <section className="max-w-lg rounded-[1.25rem] border border-white/10 bg-white/[0.035] p-6">
          <h1 className="text-2xl font-bold">
            {blockedReason === "under13" ? "Third-party playback is unavailable" : "Playback needs confirmation"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            {blockedReason === "under13"
              ? "If you are under 13, you cannot use third-party playback because providers may show unsafe ads or adult content."
              : "Open the title page and accept the third-party playback warning before this provider loads."}
          </p>
          <Link
            href={blockedReason === "under13" ? "/under-13" : "/"}
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-black"
          >
            {blockedReason === "under13" ? "Go to safer page" : "Go to Home"}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <iframe
      src={source}
      title={title}
      className="h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ border: 0, width: "100vw", height: "100dvh", display: "block", background: "#000" }}
    />
  );
}
