"use client";

import { type FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, Eye, EyeOff, Flag, Maximize2, MessageSquare, Pause, Play, RefreshCw, Server, ShieldAlert, VolumeX, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/cn";
import { dataLayer } from "@/lib/dataLayer";
import { getWatchHistory, saveWatchProgress } from "@/lib/grubx/account";
import { createGrubXIframeController } from "@/lib/grubx/iframeController";
import { onPlayerStateChange } from "@/lib/grubx/watchParty";
import { getClientMediaDetails, getClientSeasonEpisodes } from "@/lib/tmdb/client";
import { useSettingsContext } from "@/context/SettingsContext";
import type {
  GrubXEventPayload,
  GrubXProviderId,
  GrubXProviderReportReason,
  GrubXServerCandidate,
  GrubXWatchHistoryItem,
} from "@/types/grubx";
import type { EpisodeSummary, MediaType, SeasonSummary } from "@/types/media";
import type { CustomProviderSettings } from "@/types/settings";

type PlayerControlDock = "top" | "bottom" | "hidden";

type ProviderLocalStats = Record<
  string,
  {
    reports: number;
    failures: number;
    successes: number;
    lastReportedAt?: string;
    lastFailureAt?: string;
    lastSuccessAt?: string;
  }
>;

const PROVIDER_REPORTS_KEY = "grubx.providerReports";
const PROVIDER_FAILURES_KEY = "grubx.providerFailures";
const PROVIDER_SUCCESSES_KEY = "grubx.providerSuccesses";
const PREFERRED_PROVIDER_KEY = "grubx.preferredProvider";
const BLOCKED_PROVIDERS_KEY = "grubx.blockedProviders";
const POPUP_MONITOR_WINDOW_MS = 3500;
const STRICT_IFRAME_SANDBOX = "allow-scripts allow-same-origin allow-presentation allow-forms";
const emergencyBlockReasons = new Set<GrubXProviderReportReason>(["adult-ads", "popups", "redirects"]);

const reportReasons: Array<{ value: GrubXProviderReportReason; label: string }> = [
  { value: "popups", label: "Popups / new tabs" },
  { value: "adult-ads", label: "Adult or unsafe ads" },
  { value: "redirects", label: "Redirects" },
  { value: "broken", label: "Broken player" },
  { value: "wrong-title", label: "Wrong movie/show" },
  { value: "other", label: "Other" },
];

const readStats = (key: string): ProviderLocalStats => {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as ProviderLocalStats;
  } catch {
    return {};
  }
};

const writeStats = (key: string, stats: ProviderLocalStats) => {
  window.localStorage.setItem(key, JSON.stringify(stats));
};

const bumpProviderStat = (key: string, providerId: string, field: "reports" | "failures" | "successes") => {
  const stats = readStats(key);
  const now = new Date().toISOString();
  const current = stats[providerId] ?? { reports: 0, failures: 0, successes: 0 };
  stats[providerId] = {
    ...current,
    [field]: (current[field] ?? 0) + 1,
    ...(field === "reports" ? { lastReportedAt: now } : {}),
    ...(field === "failures" ? { lastFailureAt: now } : {}),
    ...(field === "successes" ? { lastSuccessAt: now } : {}),
  };
  writeStats(key, stats);
};

const readPreferredProvider = () => {
  try {
    return window.localStorage.getItem(PREFERRED_PROVIDER_KEY);
  } catch {
    return null;
  }
};

const savePreferredProvider = (providerId: string) => {
  window.localStorage.setItem(PREFERRED_PROVIDER_KEY, providerId);
};

const readBlockedProviders = () => {
  try {
    const value = JSON.parse(window.localStorage.getItem(BLOCKED_PROVIDERS_KEY) ?? "[]") as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const saveBlockedProvider = (providerId: string) => {
  const blocked = new Set(readBlockedProviders());
  blocked.add(providerId);
  window.localStorage.setItem(BLOCKED_PROVIDERS_KEY, JSON.stringify(Array.from(blocked)));
};

const buildCustomProviderEmbedUrl = ({
  provider,
  mediaType,
  mediaId,
  season,
  episode,
}: {
  provider: CustomProviderSettings;
  mediaType: MediaType;
  mediaId: string;
  season: number;
  episode: number;
}) =>
  provider.embedUrlPattern
    .replaceAll("{id}", encodeURIComponent(mediaId))
    .replaceAll("{tmdbId}", encodeURIComponent(mediaId))
    .replaceAll("{mediaType}", mediaType)
    .replaceAll("{season}", String(season))
    .replaceAll("{episode}", String(episode));

export function PlaybackTheater({
  open,
  onClose,
  mediaType,
  mediaId,
  title,
  posterPath,
  backdropPath,
  seasons,
}: {
  open: boolean;
  onClose: () => void;
  mediaType: MediaType;
  mediaId: string;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  seasons?: SeasonSummary[];
}) {
  const { ready, settings } = useSettingsContext();
  const [isTheaterMode, setIsTheaterMode] = useState(settings.theaterModeDefault);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState<GrubXProviderId | null>(null);
  const [manualProvider, setManualProvider] = useState(false);
  const [controlsUnlocked, setControlsUnlocked] = useState(false);
  const [controlDock, setControlDock] = useState<PlayerControlDock>("top");
  const [watchHistory, setWatchHistory] = useState<GrubXWatchHistoryItem[]>([]);
  const [attemptedProviders, setAttemptedProviders] = useState<Set<string>>(() => new Set());
  const [iframeFailed, setIframeFailed] = useState(false);
  const [popupSuspected, setPopupSuspected] = useState(false);
  const [blockedProviderWarning, setBlockedProviderWarning] = useState(false);
  const [blockedProviderVersion, setBlockedProviderVersion] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [serverSheetOpen, setServerSheetOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<GrubXProviderReportReason>("popups");
  const [reportDetails, setReportDetails] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastProgressRef = useRef(0);
  const progressLoadedRef = useRef(false);
  const activatedAtRef = useRef<number | null>(null);
  const playerController = useMemo(() => createGrubXIframeController(() => iframeRef.current), []);

  const detailsQuery = useQuery({
    queryKey: ["player", mediaType, mediaId, "details"],
    queryFn: ({ signal }: { signal: AbortSignal }) => getClientMediaDetails(mediaType, mediaId, signal),
    enabled: open && mediaType === "tv" && (!seasons || seasons.length === 0),
    staleTime: 1000 * 60 * 10,
  });

  const resolvedSeasons = seasons && seasons.length > 0 ? seasons : detailsQuery.data?.seasons ?? [];
  const seasonEpisodesQuery = useQuery({
    queryKey: ["player", mediaId, "season", selectedSeason],
    queryFn: ({ signal }: { signal: AbortSignal }) => getClientSeasonEpisodes(mediaId, selectedSeason, signal),
    enabled: open && mediaType === "tv",
    staleTime: 1000 * 60 * 10,
  });

  const progressQuery = useQuery({
    queryKey: ["player", mediaId, "progress"],
    queryFn: () => dataLayer.getPlaybackProgress(mediaId),
    enabled: open && ready && settings.resumePlayback,
    staleTime: 1000 * 30,
  });

  const playerSourceQuery = useQuery({
    queryKey: [
      "player",
      "resolved-source",
      mediaType,
      mediaId,
      selectedSeason,
      selectedEpisode,
      settings.autoplayNextEpisode,
      settings.autoplayPlayback,
      settings.allowLimitedProtectionProviders,
      settings.embedQualityMode,
      settings.providerSettings,
      settings.uiTheme,
      progressQuery.data?.currentTime ?? null,
    ],
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const params = new URLSearchParams({
        mediaType,
        mediaId,
        season: String(selectedSeason),
        episode: String(selectedEpisode),
        autoplay: settings.autoplayPlayback ? "true" : "false",
        autoplayNextEpisode: settings.autoplayNextEpisode ? "true" : "false",
        autoNext: settings.autoplayNextEpisode ? "true" : "false",
        episodeSelector: "true",
        fullscreenButton: "true",
        chromecast: "true",
        hideServer: "false",
        overlay: "true",
        theme: settings.uiTheme,
        title,
        allowLimitedProtectionProviders: settings.allowLimitedProtectionProviders ? "true" : "false",
        enabledProviders: Object.entries(settings.providerSettings)
          .filter(([, enabled]) => enabled)
          .map(([providerId]) => providerId)
          .join(","),
        quality: settings.embedQualityMode,
      });

      if (
        settings.resumePlayback &&
        progressQuery.data &&
        progressQuery.data.currentTime > 0 &&
        (mediaType === "movie" ||
          (progressQuery.data.season === selectedSeason && progressQuery.data.episode === selectedEpisode))
      ) {
        params.set("progress", String(Math.floor(progressQuery.data.currentTime)));
      }

      const response = await fetch(`/api/player/resolve?${params.toString()}`, {
        credentials: "same-origin",
        signal,
      });

      if (!response.ok) {
        throw new Error("Unable to resolve player source.");
      }

      return (await response.json()) as {
        selected: GrubXServerCandidate | null;
        candidates: GrubXServerCandidate[];
      };
    },
    enabled: open,
    staleTime: 1000 * 60,
  });

  const candidates = useMemo(() => {
    const serverCandidates = playerSourceQuery.data?.candidates ?? [];
    const customCandidates: GrubXServerCandidate[] = settings.customProviders
      .filter((provider) => provider.enabled)
      .filter((provider) => (mediaType === "movie" ? provider.supportsMovie : provider.supportsTv))
      .map((provider, index) => ({
        providerId: provider.id,
        providerName: provider.name,
        embedUrl: buildCustomProviderEmbedUrl({
          provider,
          mediaType,
          mediaId,
          season: selectedSeason,
          episode: selectedEpisode,
        }),
        latencyMs: null,
        score: 70 - index,
        status: "ready" as const,
        requiresRelaxedSandbox: false,
        reason: "Custom provider. Built-in ad and popup review is not applied yet.",
      }));
    const allCandidates = [...serverCandidates, ...customCandidates];

    if (!open || typeof window === "undefined") {
      return allCandidates;
    }

    const reports = readStats(PROVIDER_REPORTS_KEY);
    const failures = readStats(PROVIDER_FAILURES_KEY);
    const successes = readStats(PROVIDER_SUCCESSES_KEY);
    const preferredProvider = readPreferredProvider();
    const locallyBlockedProviders = new Set(readBlockedProviders());

    return allCandidates
      .map((candidate) => {
        if (locallyBlockedProviders.has(candidate.providerId)) {
          return {
            ...candidate,
            embedUrl: "",
            score: -9999,
            status: "blocked" as const,
            reason: "This server was blocked for unsafe ads.",
          };
        }

        if (candidate.requiresRelaxedSandbox && !settings.allowLimitedProtectionProviders) {
          return {
            ...candidate,
            embedUrl: "",
            score: -9999,
            status: "blocked" as const,
            reason: "Limited-protection providers are off.",
          };
        }

        if (candidate.status === "blocked") {
          return candidate;
        }

        const localReports = reports[candidate.providerId]?.reports ?? 0;
        const localFailures = failures[candidate.providerId]?.failures ?? 0;
        const localSuccesses = successes[candidate.providerId]?.successes ?? 0;
        const limitedProtectionPenalty =
          settings.avoidLimitedProtectionServers && candidate.requiresRelaxedSandbox ? 45 : 0;
        return {
          ...candidate,
          score:
            candidate.score +
            (localSuccesses > 0 ? 20 : 0) +
            (preferredProvider === candidate.providerId ? 12 : 0) -
            localFailures * 35 -
            localReports * 50 -
            limitedProtectionPenalty,
          reason:
            localReports > 0
              ? "This server was reported for unsafe ads or playback problems on this device."
              : limitedProtectionPenalty > 0
                ? "Limited protection mode is available but de-prioritized by your settings."
              : candidate.reason,
        };
      })
      .sort((left, right) => right.score - left.score);
  }, [
    blockedProviderVersion,
    mediaId,
    mediaType,
    open,
    playerSourceQuery.data?.candidates,
    settings.allowLimitedProtectionProviders,
    settings.avoidLimitedProtectionServers,
    settings.customProviders,
    selectedEpisode,
    selectedSeason,
  ]);

  const activeCandidate = useMemo(
    () => candidates.find((candidate) => candidate.providerId === selectedProvider) ?? null,
    [candidates, selectedProvider],
  );

  const readyCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.status === "ready"),
    [candidates],
  );

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("grubx-player-open");
    document.documentElement.classList.add("grubx-player-open");
    window.dispatchEvent(new CustomEvent("grubx:player-chrome-change", { detail: { open: true } }));

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.classList.remove("grubx-player-open");
      document.documentElement.classList.remove("grubx-player-open");
      window.dispatchEvent(new CustomEvent("grubx:player-chrome-change", { detail: { open: false } }));
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setIsTheaterMode(settings.theaterModeDefault);
      setSelectedSeason(1);
      setSelectedEpisode(1);
      setSelectedProvider(null);
      setManualProvider(false);
      setControlsUnlocked(false);
      setControlDock("top");
      setWatchHistory([]);
      setAttemptedProviders(new Set());
      setIframeFailed(false);
      setPopupSuspected(false);
      setBlockedProviderWarning(false);
      setControlsVisible(true);
      setServerSheetOpen(false);
      setReportOpen(false);
      setFeedbackOpen(false);
      progressLoadedRef.current = false;
      return;
    }

    setIsTheaterMode(settings.theaterModeDefault);
    setSelectedProvider(readPreferredProvider() as GrubXProviderId | null);
    setManualProvider(false);
    setControlsUnlocked(false);
    setControlDock("top");
    setAttemptedProviders(new Set());
    setIframeFailed(false);
    setPopupSuspected(false);
    setBlockedProviderWarning(false);
    setControlsVisible(true);
    activatedAtRef.current = null;
    setWatchHistory(getWatchHistory());
  }, [open, settings.defaultProvider, settings.theaterModeDefault]);

  useEffect(() => {
    if (!open || !controlsVisible) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setControlsVisible(false);
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [controlsVisible, open]);

  useEffect(() => {
    setControlsUnlocked(false);
    setIframeFailed(false);
    setPopupSuspected(false);
    setBlockedProviderWarning(false);
    activatedAtRef.current = null;
  }, [mediaId, mediaType, selectedEpisode, selectedProvider, selectedSeason]);

  useEffect(() => {
    if (!open || manualProvider || selectedProvider || readyCandidates.length === 0) {
      return;
    }

    setSelectedProvider(readyCandidates[0].providerId as GrubXProviderId);
  }, [manualProvider, open, readyCandidates, selectedProvider]);

  useEffect(() => {
    if (!open || manualProvider || !selectedProvider || readyCandidates.length === 0) {
      return;
    }

    const current = readyCandidates.find((candidate) => candidate.providerId === selectedProvider);
    if (!current) {
      setSelectedProvider(readyCandidates[0].providerId as GrubXProviderId);
    }
  }, [manualProvider, open, readyCandidates, selectedProvider]);

  useEffect(() => {
    if (!open || !selectedProvider) {
      return;
    }

    setAttemptedProviders((current) => {
      const next = new Set(current);
      next.add(selectedProvider);
      return next;
    });
  }, [open, selectedProvider]);

  useEffect(() => {
    if (!open || mediaType !== "tv" || !settings.rememberLastEpisode || !progressQuery.data || progressLoadedRef.current) {
      return;
    }

    if (progressQuery.data.season) {
      setSelectedSeason(progressQuery.data.season);
    }
    if (progressQuery.data.episode) {
      setSelectedEpisode(progressQuery.data.episode);
    }
    progressLoadedRef.current = true;
  }, [mediaType, open, progressQuery.data, settings.rememberLastEpisode]);

  const markPopupSuspected = () => {
    const activatedAt = activatedAtRef.current;
    if (!activeCandidate || !activatedAt || Date.now() - activatedAt > POPUP_MONITOR_WINDOW_MS) {
      return;
    }

    bumpProviderStat(PROVIDER_REPORTS_KEY, activeCandidate.providerId, "reports");
    bumpProviderStat(PROVIDER_FAILURES_KEY, activeCandidate.providerId, "failures");
    saveBlockedProvider(activeCandidate.providerId);
    setBlockedProviderVersion((version) => version + 1);
    setPopupSuspected(true);
    setBlockedProviderWarning(true);
    setIframeFailed(true);
    setControlsUnlocked(false);
    setControlsVisible(true);
    setControlDock("top");
    activatedAtRef.current = null;
    toast.warning("This server was blocked for unsafe ads. Trying the next safe server.");
    tryNextServer(activeCandidate.providerId);
  };

  useEffect(() => {
    if (!open || !controlsUnlocked) {
      return;
    }

    const onBlur = () => markPopupSuspected();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markPopupSuspected();
      }
    };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeCandidate?.providerId, controlsUnlocked, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      onClose();
    };

    const onMessage = (event: MessageEvent) => {
      const payload = event.data as GrubXEventPayload | undefined;
      if (!ready || !payload || payload.type !== "GRUBX_EVENT") {
        return;
      }

      onPlayerStateChange(payload);

      const currentTime = payload.data?.currentTime ?? 0;
      const duration = payload.data?.duration ?? 0;
      if (
        payload.data?.event !== "timeupdate" ||
        duration <= 0 ||
        !settings.resumePlayback ||
        !settings.historyEnabled ||
        !settings.trackingEnabled
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastProgressRef.current < 10000) {
        return;
      }

      lastProgressRef.current = now;
      saveWatchProgress({
        id: mediaId,
        mediaType,
        provider: activeCandidate?.providerId ?? selectedProvider ?? "auto",
        title,
        season: mediaType === "tv" ? selectedSeason : null,
        episode: mediaType === "tv" ? selectedEpisode : null,
        currentTime,
        duration,
      });
      setWatchHistory(getWatchHistory());
      void dataLayer.savePlaybackProgress({
        mediaId,
        mediaType,
        title,
        posterPath,
        backdropPath,
        season: mediaType === "tv" ? selectedSeason : null,
        episode: mediaType === "tv" ? selectedEpisode : null,
        currentTime,
        duration,
        progress: Math.round((currentTime / duration) * 100),
      });
    };

    window.addEventListener("keydown", onEscape);
    window.addEventListener("message", onMessage);

    return () => {
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("message", onMessage);
    };
  }, [
    backdropPath,
    isTheaterMode,
    mediaId,
    mediaType,
    onClose,
    posterPath,
    ready,
    activeCandidate?.providerId,
    selectedEpisode,
    selectedProvider,
    selectedSeason,
    settings.historyEnabled,
    settings.resumePlayback,
    settings.trackingEnabled,
    title,
  ]);

  const selectProvider = (providerId: string, manual = true) => {
    setSelectedProvider(providerId as GrubXProviderId);
    setManualProvider(manual);
    setControlsUnlocked(false);
    setIframeFailed(false);
    setServerSheetOpen(false);
    savePreferredProvider(providerId);
  };

  const tryNextServer = (excludeProviderId?: string) => {
    const nextCandidate = readyCandidates.find(
      (candidate) => candidate.providerId !== excludeProviderId && !attemptedProviders.has(candidate.providerId),
    );
    const fallbackCandidate =
      nextCandidate ??
      readyCandidates.find(
        (candidate) => candidate.providerId !== selectedProvider && candidate.providerId !== excludeProviderId,
      );

    if (!fallbackCandidate) {
      toast.error("No other safe servers are available right now.");
      return;
    }

    selectProvider(fallbackCandidate.providerId, true);
    toast.message("Trying the next safe server...");
  };

  const markActiveProviderFailure = () => {
    if (!activeCandidate) {
      return;
    }

    bumpProviderStat(PROVIDER_FAILURES_KEY, activeCandidate.providerId, "failures");
    setIframeFailed(true);
    tryNextServer();
  };

  const markActiveProviderSuccess = () => {
    if (!activeCandidate) {
      return;
    }

    bumpProviderStat(PROVIDER_SUCCESSES_KEY, activeCandidate.providerId, "successes");
    savePreferredProvider(activeCandidate.providerId);
  };

  const submitProviderReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCandidate) {
      return;
    }

    const reportedProviderId = activeCandidate.providerId;
    const isEmergencyReport = emergencyBlockReasons.has(reportReason);

    bumpProviderStat(PROVIDER_REPORTS_KEY, reportedProviderId, "reports");

    if (isEmergencyReport) {
      saveBlockedProvider(reportedProviderId);
      setBlockedProviderVersion((version) => version + 1);
      setBlockedProviderWarning(true);
      setPopupSuspected(false);
      setIframeFailed(true);
      setControlsUnlocked(false);
      toast.warning("This server was blocked for unsafe ads. Trying the next safe server.");
      tryNextServer(reportedProviderId);
    }

    const response = await fetch("/api/provider-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        providerId: activeCandidate.providerId,
        providerName: activeCandidate.providerName,
        mediaType,
        tmdbId: mediaId,
        title,
        reason: reportReason,
        details: reportDetails,
        pageUrl: `${window.location.pathname}${window.location.search}`,
      }),
    });

    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      toast.error(body?.error ?? "Unable to send your report right now.");
      return;
    }

    toast.success("Thanks - your report was sent.");
    setReportOpen(false);
    setReportDetails("");
    if (!isEmergencyReport) {
      tryNextServer();
    }
  };

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        category: "report",
        area: "player",
        priority: "medium",
        title: feedbackTitle || `Playback feedback for ${title}`,
        message: feedbackMessage,
        pageUrl: `${window.location.pathname}${window.location.search}`,
      }),
    });

    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      toast.error(body?.error ?? "Unable to send feedback right now.");
      return;
    }

    toast.success("Thanks - your feedback was sent.");
    setFeedbackTitle("");
    setFeedbackMessage("");
    setFeedbackOpen(false);
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black text-white"
      onMouseMove={() => setControlsVisible(true)}
      onTouchStart={(event) => {
        if (serverSheetOpen || reportOpen || feedbackOpen) {
          return;
        }
        if (!controlsVisible || controlDock === "hidden") {
          setControlsVisible(true);
          if (controlDock === "hidden") {
            setControlDock("top");
          }
        } else if (event.target === event.currentTarget) {
          setControlsVisible(false);
        }
      }}
    >
      <div className="relative h-[100dvh] w-screen overflow-hidden bg-black">
        <div
          className={cn(
            "absolute inset-x-0 z-30 border-white/10 bg-black/68 px-3 backdrop-blur-2xl transition-transform duration-300 sm:px-5",
            controlDock === "bottom"
              ? "bottom-0 border-t pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2"
              : "top-0 border-b pb-2 pt-[calc(0.65rem+env(safe-area-inset-top))]",
            controlsVisible && controlDock !== "hidden"
              ? "translate-y-0"
              : controlDock === "bottom"
                ? "translate-y-full"
                : "-translate-y-full",
          )}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-white/8 text-white transition active:scale-[0.98]"
                aria-label="Back"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  {mediaType === "tv" ? `Season ${selectedSeason} Episode ${selectedEpisode}` : "Movie playback"}
                </p>
                <h3 className="line-clamp-1 text-base font-semibold text-white sm:text-xl">{title}</h3>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 lg:justify-end">
              {mediaType === "tv" && resolvedSeasons.length > 0 ? (
                <>
                  <select
                    value={selectedSeason}
                    onChange={(event) => {
                      setSelectedSeason(Number(event.target.value));
                      setSelectedEpisode(1);
                    }}
                    className="min-h-11 shrink-0 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-sm text-white outline-none"
                  >
                    {resolvedSeasons.map((season: SeasonSummary) => (
                      <option key={season.seasonNumber} value={season.seasonNumber}>
                        Season {season.seasonNumber}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedEpisode}
                    onChange={(event) => setSelectedEpisode(Number(event.target.value))}
                    className="min-h-11 shrink-0 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-sm text-white outline-none"
                  >
                    {(seasonEpisodesQuery.data?.episodes ?? []).map((episode: EpisodeSummary) => (
                      <option key={episode.episodeNumber} value={episode.episodeNumber}>
                        Episode {episode.episodeNumber}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
              <div className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-sm text-white">
                <Server className="size-4 text-[var(--accent)]" />
                <span className="whitespace-nowrap">
                  {activeCandidate
                    ? `${activeCandidate.providerName}${manualProvider ? "" : " - Auto"}${
                        activeCandidate.latencyMs ? ` - ${activeCandidate.latencyMs}ms` : ""
                      }`
                    : playerSourceQuery.isPending
                      ? "Finding the best server..."
                      : "No server selected"}
                </span>
              </div>
              {activeCandidate?.requiresRelaxedSandbox ? (
                <span className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 text-xs font-semibold text-[var(--accent)]">
                  Limited protection mode
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setServerSheetOpen(true)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                <Server className="size-4" />
                Switch Server
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                <Flag className="size-4 text-[var(--accent)]" />
                Report
              </button>
              <button
                type="button"
                onClick={() => setFeedbackOpen(true)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                <MessageSquare className="size-4" />
                Feedback
              </button>
              <div className="inline-flex min-h-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/8">
                {(["top", "bottom", "hidden"] as PlayerControlDock[]).map((dock) => (
                  <button
                    key={dock}
                    type="button"
                    onClick={() => {
                      setControlDock(dock);
                      setControlsVisible(dock !== "hidden");
                    }}
                    className={cn(
                      "min-h-11 px-3 text-xs font-semibold capitalize transition",
                      controlDock === dock ? "bg-white text-black" : "text-[var(--muted)]",
                    )}
                  >
                    {dock}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => playerController.play()}
                className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-[var(--muted)] transition active:scale-[0.98]"
                aria-label="Play"
              >
                <Play className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => playerController.pause()}
                className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-[var(--muted)] transition active:scale-[0.98]"
                aria-label="Pause"
              >
                <Pause className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => playerController.mute(true)}
                className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-[var(--muted)] transition active:scale-[0.98]"
                aria-label="Mute"
              >
                <VolumeX className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => iframeRef.current?.requestFullscreen?.()}
                className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-[var(--muted)] transition active:scale-[0.98]"
                aria-label="Fullscreen"
              >
                <Maximize2 className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => setControlsVisible(false)}
                className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-[var(--muted)] transition active:scale-[0.98]"
                aria-label="Hide controls"
              >
                <EyeOff className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {!controlsVisible || controlDock === "hidden" ? (
          <button
            type="button"
            onClick={() => {
              if (controlDock === "hidden") {
                setControlDock("top");
              }
              setControlsVisible(true);
            }}
            className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-40 grid min-h-12 min-w-12 place-items-center rounded-full border border-white/10 bg-black/70 text-white shadow-2xl backdrop-blur-xl"
            aria-label="Show controls"
          >
            <Eye className="size-5" />
          </button>
        ) : null}

        <div className="absolute inset-0 bg-black">
            {playerSourceQuery.isPending ? (
              <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-[var(--muted)]">
                Testing available servers...
              </div>
            ) : playerSourceQuery.isError || !activeCandidate ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center text-red-100">
                <span className="rounded-[1.2rem] border border-red-300/20 bg-red-400/10 p-4">
                  <AlertTriangle className="size-7" />
                </span>
                <span className="max-w-xl text-lg font-semibold text-white">
                  {blockedProviderWarning || candidates.length === 0
                    ? "This server was blocked for unsafe ads."
                    : "No safe server is ready right now."}
                </span>
                <span className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                  {blockedProviderWarning || candidates.length === 0
                    ? "We blocked this provider to keep GrubX safe. Try another server or report this issue."
                    : "Try another server or send a report so it can be reviewed."}
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => tryNextServer()}
                    className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-95"
                  >
                    Try Next Safe Server
                  </button>
                  <button
                    type="button"
                    onClick={() => setServerSheetOpen(true)}
                    className="rounded-full border border-white/12 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/22"
                  >
                    Switch Server
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="rounded-full border border-white/12 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/22"
                  >
                    Report Provider
                  </button>
                </div>
              </div>
            ) : activeCandidate.status !== "ready" || iframeFailed || popupSuspected ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center text-red-100">
                <span className="rounded-[1.2rem] border border-red-300/20 bg-red-400/10 p-4">
                  <ShieldAlert className="size-7" />
                </span>
                <span className="max-w-xl text-lg font-semibold text-white">
                  {blockedProviderWarning || activeCandidate.status === "blocked"
                    ? "This server was blocked for unsafe ads."
                    : popupSuspected
                      ? "This server tried to open another window."
                      : "This server may be unsafe or broken."}
                </span>
                <span className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                  {blockedProviderWarning || activeCandidate.status === "blocked"
                    ? "We blocked this provider to keep GrubX safe. Try another server or report this issue."
                    : popupSuspected
                      ? "Try a different server. This provider was marked unsafe on this device."
                      : activeCandidate.reason ?? "Switch servers or report the issue so this provider can be reviewed."}
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => tryNextServer()}
                    className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:brightness-95"
                  >
                    Try Next Safe Server
                  </button>
                  <button
                    type="button"
                    onClick={() => setServerSheetOpen(true)}
                    className="rounded-full border border-white/12 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/22"
                  >
                    Switch Server
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportReason("popups");
                      setReportOpen(true);
                    }}
                    className="rounded-full border border-white/12 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/22"
                  >
                    Report Provider
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                src={activeCandidate.embedUrl}
                title={`${title} player`}
                className={cn("absolute inset-0 h-full w-full border-0", settings.blockPopups && !controlsUnlocked ? "pointer-events-none" : "")}
                allow="fullscreen; picture-in-picture; encrypted-media"
                referrerPolicy="no-referrer"
                sandbox={STRICT_IFRAME_SANDBOX}
                allowFullScreen
                onLoad={() => {
                  markActiveProviderSuccess();
                  window.setTimeout(() => setControlsVisible(false), 2000);
                }}
                onError={markActiveProviderFailure}
              />
            )}
            {settings.blockPopups && activeCandidate?.embedUrl && !controlsUnlocked && !iframeFailed ? (
              <button
                type="button"
                onClick={() => {
                  setControlsUnlocked(true);
                  setControlsVisible(false);
                  activatedAtRef.current = Date.now();
                }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/72 px-6 text-center backdrop-blur-sm transition"
              >
                <span className="rounded-[1.2rem] border border-cyan-300/30 bg-cyan-400/10 p-4 text-cyan-200">
                  <ShieldAlert className="size-7" />
                </span>
                <span className="max-w-lg text-xl font-semibold text-white">Popup shield is active</span>
                <span className="max-w-xl text-sm leading-6 text-[var(--muted)]">
                  GrubX is holding player controls until you are ready. Click once to unlock this stream.
                </span>
              </button>
            ) : null}
            {reportOpen ? (
              <form
                onSubmit={submitProviderReport}
                className="absolute inset-x-3 bottom-3 z-40 max-h-[82dvh] overflow-y-auto rounded-[1.2rem] border border-white/12 bg-[#0d1117]/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-2xl sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[calc(5.5rem+env(safe-area-inset-top))] sm:w-[390px] sm:pb-4"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Report Provider</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      {activeCandidate?.providerName ?? "Selected server"} will be reviewed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="rounded-full border border-white/10 bg-white/5 p-2 text-[var(--muted)] transition hover:text-white"
                    aria-label="Close report form"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Issue
                  <select
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value as GrubXProviderReportReason)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none"
                  >
                    {reportReasons.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Details
                  <textarea
                    value={reportDetails}
                    onChange={(event) => setReportDetails(event.target.value)}
                    maxLength={1000}
                    rows={4}
                    placeholder="What happened?"
                    className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/45 px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-white/35"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-4 w-full rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:brightness-95"
                >
                  Send Report
                </button>
              </form>
            ) : null}

            {serverSheetOpen ? (
              <div className="absolute inset-x-3 bottom-3 z-40 max-h-[82dvh] overflow-y-auto rounded-[1.2rem] border border-white/12 bg-[#0d1117]/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-2xl sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[calc(5.5rem+env(safe-area-inset-top))] sm:w-[430px] sm:pb-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Switch Server</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Choose another available provider.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setServerSheetOpen(false)}
                    className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-[var(--muted)]"
                    aria-label="Close server switcher"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid gap-2">
                  {candidates.map((candidate) => (
                    <button
                      key={candidate.providerId}
                      type="button"
                      disabled={candidate.status === "blocked"}
                      onClick={() => selectProvider(candidate.providerId, true)}
                      className={cn(
                        "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-45",
                        candidate.providerId === selectedProvider
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                          : "border-white/10 bg-white/[0.04] text-[var(--muted)]",
                      )}
                    >
                      <span>
                        <span className="block font-semibold text-white">{candidate.providerName}</span>
                        <span className="text-xs">
                          {candidate.status === "ready"
                            ? `Available${candidate.latencyMs ? ` - ${candidate.latencyMs}ms` : ""}`
                            : candidate.status === "failed"
                              ? "Failed"
                              : candidate.status === "blocked"
                                ? "Blocked"
                                : "Untested"}
                          {candidate.requiresRelaxedSandbox ? " - Limited protection mode" : ""}
                        </span>
                      </span>
                      {candidate.providerId === selectedProvider ? <span className="text-xs text-[var(--accent)]">Current</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {feedbackOpen ? (
              <form
                onSubmit={submitFeedback}
                className="absolute inset-x-3 bottom-3 z-40 max-h-[82dvh] overflow-y-auto rounded-[1.2rem] border border-white/12 bg-[#0d1117]/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-2xl sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-[calc(5.5rem+env(safe-area-inset-top))] sm:w-[430px] sm:pb-4"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Player Feedback</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Send a note to the GrubX team.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeedbackOpen(false)}
                    className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-[var(--muted)]"
                    aria-label="Close feedback form"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <input
                  value={feedbackTitle}
                  onChange={(event) => setFeedbackTitle(event.target.value)}
                  maxLength={120}
                  placeholder="Short summary"
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-black/45 px-3 text-sm text-white outline-none placeholder:text-white/35"
                />
                <textarea
                  value={feedbackMessage}
                  onChange={(event) => setFeedbackMessage(event.target.value)}
                  maxLength={1500}
                  required
                  rows={5}
                  placeholder="What happened?"
                  className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/45 px-3 py-3 text-sm text-white outline-none placeholder:text-white/35"
                />
                <button type="submit" className="mt-4 min-h-11 w-full rounded-full bg-white px-5 text-sm font-bold text-black">
                  Send Feedback
                </button>
              </form>
            ) : null}
        </div>

          {settings.showPlaybackTips ? (
            <div className="keyboard-only absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-10 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-xs text-[var(--muted)]">
              Press Esc to close. Playback stays inside this theater view.
            </div>
          ) : null}

          {activeCandidate ? (
            <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-10 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-xs text-[var(--muted)]">
              {activeCandidate.providerName}
              {manualProvider ? "" : " auto-selected"}
              {activeCandidate.latencyMs ? ` - ${activeCandidate.latencyMs}ms` : ""} from {candidates.length} server
              {candidates.length === 1 ? "" : "s"}.
            </div>
          ) : null}

          {watchHistory.length > 0 ? (
            <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-10 hidden max-w-[320px] rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-xs text-[var(--muted)] xl:block">
              <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/70">Watch history</p>
              {watchHistory.slice(0, 3).map((item) => (
                <div key={`${item.id}-${item.updatedAt}`} className="flex justify-between gap-3 py-1">
                  <span className="truncate">{item.title ?? item.id}</span>
                  <span>{item.progress}%</span>
                </div>
              ))}
            </div>
          ) : null}

          {detailsQuery.isError ? (
            <div className="absolute right-4 top-4 z-10 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <span className="inline-flex items-center gap-2">
                <AlertTriangle className="size-4" />
                TV metadata could not be loaded. Playback is still available.
              </span>
            </div>
          ) : null}
      </div>
    </div>
  );
}
