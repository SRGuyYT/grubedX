"use client";

import { useEffect, useState } from "react";

import { useSettingsContext } from "@/context/SettingsContext";

export function LiveClock({ compact = false }: { compact?: boolean }) {
  const { settings } = useSettingsContext();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setMounted(true);

    if (!settings.liveClock) {
      return;
    }

    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [settings.liveClock]);

  if (!settings.liveClock || !mounted) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: compact ? undefined : "2-digit",
    hour12: !settings.showClock24h,
    month: compact ? undefined : "short",
    day: compact ? undefined : "numeric",
  });

  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-medium text-[var(--muted)]">
      {formatter.format(now)}
    </div>
  );
}
