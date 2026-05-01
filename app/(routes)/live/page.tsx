"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, LoaderCircle, Radio, ShieldAlert, Signal, Tv2, X } from "lucide-react";

import { EmptyState } from "@/components/feedback/EmptyState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useSettingsContext } from "@/context/SettingsContext";
import { cn } from "@/lib/cn";
import { dataLayer } from "@/lib/dataLayer";
import {
  getClientBestLiveSource,
  formatLiveStart,
  getClientLiveMatches,
  getClientLiveSports,
  getClientLiveStreams,
  resolveLiveBadgeUrl,
  resolveLivePosterUrl,
} from "@/lib/live/client";
import type { LiveMatch, LiveMatchScope, LiveSource } from "@/types/live";

const scopeOptions: Array<{ id: LiveMatchScope; label: string; description: string }> = [
  { id: "live", label: "Live Now", description: "Currently running streams across every sport." },
  { id: "all-today", label: "Today", description: "Today's schedule with playable sources when available." },
];

export default function LiveTVPage() {
  const { settings } = useSettingsContext();
  const [scope, setScope] = useState<LiveMatchScope>("live");
  const [selectedSport, setSelectedSport] = useState("all");
  const [popularOnly, setPopularOnly] = useState(false);
  const [activeMatch, setActiveMatch] = useState<LiveMatch | null>(null);
  const [activeSource, setActiveSource] = useState<LiveSource | null>(null);
  const [selectedStreamNo, setSelectedStreamNo] = useState<number | null>(null);
  const [controlsUnlocked, setControlsUnlocked] = useState(false);

  const sportsQuery = useQuery({
    queryKey: ["live", "sports"],
    queryFn: ({ signal }) => getClientLiveSports(signal),
    staleTime: 1000 * 60 * 30,
  });

  const matchesQuery = useQuery({
    queryKey: ["live", "matches", scope, popularOnly],
    queryFn: ({ signal }) => getClientLiveMatches({ scope, popular: popularOnly }, signal),
    staleTime: 1000 * 30,
    refetchInterval: settings.liveAutoRefresh ? 1000 * 60 : false,
  });

  const filteredMatches = useMemo(() => {
    const items = matchesQuery.data ?? [];
    if (selectedSport === "all") {
      return items;
    }

    return items.filter((match) => match.category === selectedSport);
  }, [matchesQuery.data, selectedSport]);

  useEffect(() => {
    if (!activeMatch) {
      setActiveSource(null);
      setSelectedStreamNo(null);
      return;
    }

    setActiveSource(null);
    setSelectedStreamNo(null);
    setControlsUnlocked(false);
  }, [activeMatch]);

  const bestSourceQuery = useQuery({
    queryKey: ["live", "best-source", activeMatch?.id],
    queryFn: ({ signal }) =>
      activeMatch ? getClientBestLiveSource(activeMatch.sources, signal) : Promise.resolve({ bestSource: null, metrics: [] }),
    enabled: Boolean(activeMatch && activeMatch.sources.length > 0),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!activeMatch || activeSource) {
      return;
    }

    const candidate = bestSourceQuery.data?.bestSource ?? activeMatch.sources[0] ?? null;
    if (candidate) {
      setActiveSource(candidate);
    }
  }, [activeMatch, activeSource, bestSourceQuery.data?.bestSource]);

  const streamsQuery = useQuery({
    queryKey: ["live", "streams", activeSource?.source, activeSource?.id],
    queryFn: ({ signal }) => {
      if (!activeSource) {
        return Promise.resolve([]);
      }

      return getClientLiveStreams(activeSource, signal);
    },
    enabled: Boolean(activeSource),
    staleTime: 1000 * 15,
  });

  useEffect(() => {
    const streams = streamsQuery.data ?? [];
    if (streams.length === 0) {
      setSelectedStreamNo(null);
      return;
    }

    setSelectedStreamNo((current) => {
      if (current && streams.some((stream) => stream.streamNo === current)) {
        return current;
      }

      return streams[0]?.streamNo ?? null;
    });
  }, [streamsQuery.data]);

  useEffect(() => {
    setControlsUnlocked(false);
  }, [activeSource?.id, activeSource?.source, selectedStreamNo]);

  useEffect(() => {
    document.body.style.overflow = activeMatch ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [activeMatch]);

  const activeStream =
    (streamsQuery.data ?? []).find((stream) => stream.streamNo === selectedStreamNo) ?? streamsQuery.data?.[0] ?? null;

  useEffect(() => {
    if (!activeMatch || !activeStream) {
      return;
    }

    void dataLayer.saveRecentLive({
      matchId: activeMatch.id,
      title: activeMatch.title,
      category: activeMatch.category,
      posterUrl: resolveLivePosterUrl(activeMatch),
      source: activeStream.source,
      streamNo: activeStream.streamNo,
      watchedAt: new Date().toISOString(),
    });
  }, [activeMatch, activeStream]);

  const closeOverlay = () => {
    setActiveMatch(null);
    setActiveSource(null);
    setSelectedStreamNo(null);
    setControlsUnlocked(false);
  };

  return (
    <div className="pb-14 md:pb-16">
      <section className="relative overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 bg-gradient-to-r from-[#060912] via-[#060912f2] to-[#06091238]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060912] via-[#06091299] to-[#06091280]" />

        <div className="page-shell relative z-10 py-12 md:py-14">
          <div className="liquid-glass rounded-[2.2rem] px-6 py-8 md:px-8 md:py-9">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--accent)]">Live TV</p>
            <h1 className="mt-4 text-5xl font-bold leading-none sm:text-6xl md:text-7xl">Matchday Control Room</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              Jump into live events, scan the schedule, and choose the stream that feels best on your screen.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2">
                <Radio className="size-4 text-[var(--accent)]" />
                {scope === "live" ? "Realtime matches" : "Today's schedule"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2">
                <Signal className="size-4 text-[var(--accent)]" />
                Stream choices
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-2">
                <Tv2 className="size-4 text-[var(--accent)]" />
                Click to watch
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell space-y-6 py-8 md:space-y-7 md:py-12 xl:py-14">
        <div className="liquid-glass rounded-[2.1rem] px-5 py-5 md:px-6 md:py-6">
          <div className="flex flex-wrap gap-2.5 md:gap-3">
            {scopeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setScope(option.id)}
                className={cn(
                  "rounded-full border px-4 py-2.5 text-sm transition",
                  scope === option.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                    : "border-white/10 bg-white/5 text-[var(--muted)] hover:border-white/20 hover:text-white",
                )}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPopularOnly((value) => !value)}
              className={cn(
                "rounded-full border px-4 py-2.5 text-sm transition",
                popularOnly
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                  : "border-white/10 bg-white/5 text-[var(--muted)] hover:border-white/20 hover:text-white",
              )}
            >
              Popular only
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
            {scopeOptions.find((option) => option.id === scope)?.description}
          </p>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-hidden md:gap-3">
          <button
            type="button"
            onClick={() => setSelectedSport("all")}
            className={cn(
              "rounded-full border px-4 py-2.5 text-sm transition",
              selectedSport === "all"
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                : "border-white/10 bg-white/5 text-[var(--muted)] hover:border-white/20 hover:text-white",
            )}
          >
            All sports
          </button>
          {(sportsQuery.data ?? []).map((sport) => (
            <button
              key={sport.id}
              type="button"
              onClick={() => setSelectedSport(sport.id)}
              className={cn(
                "rounded-full border px-4 py-2.5 text-sm whitespace-nowrap transition",
                selectedSport === sport.id
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                  : "border-white/10 bg-white/5 text-[var(--muted)] hover:border-white/20 hover:text-white",
              )}
            >
              {sport.name}
            </button>
          ))}
        </div>

        {matchesQuery.isPending ? (
          <LoadingState title="Loading live matches" description="Bringing the latest schedule into view." />
        ) : matchesQuery.isError ? (
          <EmptyState
            title="Live feed unavailable"
            description={matchesQuery.error instanceof Error ? matchesQuery.error.message : "Unable to load matches."}
          />
        ) : filteredMatches.length === 0 ? (
          <EmptyState
            title="No matches in this view"
            description="Try a different sport or switch between live and today."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:gap-5 xl:grid-cols-3 xl:gap-6">
            {filteredMatches.map((match) => {
              const homeBadge = resolveLiveBadgeUrl(match.teams?.home?.badge);
              const awayBadge = resolveLiveBadgeUrl(match.teams?.away?.badge);

              const score = match.score;
              const hasScore = Boolean(score && (score.homeScore !== null || score.awayScore !== null));

              return (
                <article key={match.id} className="liquid-glass-soft overflow-hidden rounded-[1.7rem] border border-white/8 p-3 md:rounded-[1.85rem]">
                  <button
                    type="button"
                    onClick={() => setActiveMatch(match)}
                    className="group block w-full text-left"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-[1.35rem] border border-white/8">
                      <Image
                        src={resolveLivePosterUrl(match)}
                        alt={match.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                      <div className="absolute right-3 top-3 max-w-[calc(100%-1.5rem)] rounded-full bg-red-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white sm:right-4 sm:top-4">
                        {score?.state === "post" ? "Final" : score?.state === "in" ? "Live" : scope === "live" ? "Live" : "Today"}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent)]">{match.category}</p>
                        <h3 className="mt-2 line-clamp-2 text-2xl font-semibold text-white">{match.title}</h3>
                      </div>
                    </div>

                    <div className="space-y-4 px-1 pb-1 pt-4 md:px-2 md:pb-2 md:pt-5">
                      {match.teams?.home || match.teams?.away ? (
                        <div className="grid grid-cols-[minmax(0,1fr),auto,minmax(0,1fr)] items-center gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            {homeBadge ? (
                              <Image src={homeBadge} alt={match.teams?.home?.name ?? "Home"} width={36} height={36} className="rounded-full" />
                            ) : null}
                            <span className="truncate text-sm font-semibold text-white">{match.teams?.home?.name ?? "Home"}</span>
                          </div>
                          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-sm font-semibold text-white">
                            {hasScore ? `${score?.homeScore ?? "-"} - ${score?.awayScore ?? "-"}` : "vs"}
                          </span>
                          <div className="flex min-w-0 items-center justify-end gap-3">
                            <span className="truncate text-right text-sm font-semibold text-white">{match.teams?.away?.name ?? "Away"}</span>
                            {awayBadge ? (
                              <Image src={awayBadge} alt={match.teams?.away?.name ?? "Away"} width={36} height={36} className="rounded-full" />
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.15rem] border border-white/8 bg-black/20 px-4 py-3 text-sm text-[var(--muted)]">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="size-4" />
                          {formatLiveStart(match.date)}
                        </span>
                        {score ? <span className="truncate">{score.shortDetail ?? score.detail ?? "Official score"}</span> : null}
                        {score ? (
                          <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/80">
                            ESPN
                          </span>
                        ) : (
                          <span>
                            {match.sources.length} source{match.sources.length === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {activeMatch ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/78 px-2 py-3 backdrop-blur-2xl sm:px-4 sm:py-5">
          <button type="button" className="absolute inset-0" onClick={closeOverlay} aria-label="Close live stream overlay" />

          <div className="player-modal-pop liquid-glass relative z-[201] flex h-[min(calc(100dvh-1.5rem),960px)] w-[min(calc(100vw-1rem),1320px)] flex-col overflow-hidden rounded-[1.45rem] p-2 sm:rounded-[2.2rem] sm:p-4">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-black/35 px-4 py-4 md:items-center md:gap-4 md:px-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Live Stream</p>
                <h2 className="text-xl font-semibold text-white md:text-2xl">{activeMatch.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{formatLiveStart(activeMatch.date)}</p>
              </div>
              <button
                type="button"
                onClick={closeOverlay}
                className="rounded-full border border-white/10 bg-black/45 p-3 text-[var(--muted)] transition hover:border-white/20 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-hidden px-3 py-3 md:px-4 md:py-4 lg:grid lg:grid-cols-[1fr,320px]">
              <div className="relative min-h-[280px] overflow-hidden rounded-[1.45rem] border border-white/10 bg-black md:min-h-[320px] md:rounded-[1.6rem]">
                {bestSourceQuery.isPending || (activeSource && streamsQuery.isPending) ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)]">
                    <LoaderCircle className="mr-3 size-5 animate-spin" />
                    Finding the healthiest stream source...
                  </div>
                ) : activeStream?.embedUrl ? (
                  <>
                    <iframe
                      src={activeStream.embedUrl}
                      title={`${activeMatch.title} stream`}
                      className={cn("absolute inset-0 h-full w-full border-0", settings.blockPopups && !controlsUnlocked ? "pointer-events-none" : "")}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      referrerPolicy="no-referrer"
                      allowFullScreen
                    />
                    {settings.blockPopups && !controlsUnlocked ? (
                      <button
                        type="button"
                        onClick={() => setControlsUnlocked(true)}
                        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/72 px-6 text-center backdrop-blur-sm transition hover:bg-black/64"
                      >
                        <span className="rounded-[1.2rem] border border-cyan-300/30 bg-cyan-400/10 p-4 text-cyan-200">
                          <ShieldAlert className="size-7" />
                        </span>
                        <span className="max-w-lg text-xl font-semibold text-white">Popup shield is active</span>
                        <span className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                          GrubX blocked first-click iframe interaction so surprise popouts cannot launch. Click once to unlock stream controls only when you are ready.
                        </span>
                      </button>
                    ) : null}
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-[var(--muted)]">
                    Stream unavailable for this source. Try another source or another match.
                  </div>
                )}
              </div>

              <div className="liquid-glass-soft flex flex-col gap-5 overflow-y-auto rounded-[1.45rem] border border-white/8 p-4 md:rounded-[1.6rem]">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Sources</p>
                  {bestSourceQuery.data?.bestSource ? (
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                      Suggested {bestSourceQuery.data.bestSource.source} for this event.
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeMatch.sources.map((source) => (
                      <button
                        key={`${source.source}-${source.id}`}
                        type="button"
                        onClick={() => setActiveSource(source)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm transition",
                          activeSource?.source === source.source && activeSource?.id === source.id
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                            : "border-white/10 bg-white/5 text-[var(--muted)] hover:border-white/20 hover:text-white",
                        )}
                      >
                        {source.source}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Streams</p>
                  {streamsQuery.isPending ? (
                    <p className="mt-3 text-sm text-[var(--muted)]">Fetching stream numbers...</p>
                  ) : streamsQuery.isError ? (
                    <p className="mt-3 text-sm text-red-100">Unable to load streams for this source.</p>
                  ) : (streamsQuery.data ?? []).length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {(streamsQuery.data ?? []).map((stream) => (
                        <button
                          key={`${stream.source}-${stream.streamNo}`}
                          type="button"
                          onClick={() => setSelectedStreamNo(stream.streamNo)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-[1.2rem] border px-4 py-3 text-left text-sm transition",
                            selectedStreamNo === stream.streamNo
                              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                              : "border-white/10 bg-white/5 text-[var(--muted)] hover:border-white/20 hover:text-white",
                          )}
                        >
                          <span>Stream {stream.streamNo}</span>
                          <span className="inline-flex items-center gap-2">
                            {stream.language || "Default"}
                            {stream.hd ? (
                              <span className="rounded-full bg-black/25 px-2 py-1 text-[10px] uppercase tracking-[0.2em]">HD</span>
                            ) : null}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--muted)]">No stream numbers were returned for this source.</p>
                  )}
                </div>

                <div className="rounded-[1.2rem] border border-white/8 bg-black/25 px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                  Streams open only after you choose an event. Playback stays inside this theater overlay.
                </div>

                {bestSourceQuery.data?.metrics?.length ? (
                  <div className="rounded-[1.2rem] border border-white/8 bg-black/25 px-4 py-4 text-sm text-[var(--muted)]">
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Source health</p>
                    <div className="mt-3 space-y-2">
                      {bestSourceQuery.data.metrics.map((metric) => (
                        <div key={`${metric.source}-${metric.id}`} className="flex items-center justify-between gap-3">
                          <span className="font-medium text-white/90">{metric.source}</span>
                          <span>
                            {metric.streamCount} stream{metric.streamCount === 1 ? "" : "s"} · {metric.hdCount} HD ·{" "}
                            {metric.latencyMs ? `${metric.latencyMs}ms` : "unreachable"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
