"use client";

import { useMemo, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AudioLines,
  BadgeInfo,
  Clock3,
  Download,
  Monitor,
  Palette,
  Rocket,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { LoadingState } from "@/components/feedback/LoadingState";
import { ToggleSwitch } from "@/components/settings/ToggleSwitch";
import { ContinueWatchingRow } from "@/components/user/ContinueWatchingRow";
import { WatchlistRow } from "@/components/user/WatchlistRow";
import { useSettingsContext } from "@/context/SettingsContext";
import { useUpdateStatus } from "@/hooks/useUpdateStatus";
import { dataLayer } from "@/lib/dataLayer";
import { queryKeys } from "@/lib/queryKeys";
import type { Settings } from "@/types/settings";

function SettingCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="liquid-glass-soft rounded-[1.7rem] px-5 py-5 md:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function SelectSetting<T extends string>({
  title,
  description,
  value,
  options,
  onChange,
}: {
  title: string;
  description: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="liquid-glass-soft rounded-[1.7rem] px-5 py-5 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="rounded-full border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const { ready, settings, resetSettings, updateSettings } = useSettingsContext();
  const updateQuery = useUpdateStatus(ready);

  const setSetting = <K extends keyof Settings>(key: K, value: Settings[K], message: string) => {
    startTransition(async () => {
      await updateSettings({ [key]: value });
      toast.success(message);
    });
  };

  const lastCheckedLabel = useMemo(() => {
    if (!updateQuery.data?.checkedAt) {
      return "Not checked yet";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(updateQuery.data.checkedAt));
  }, [updateQuery.data?.checkedAt]);

  const updateIsStale = useMemo(() => {
    if (!updateQuery.data?.checkedAt) {
      return true;
    }
    return Date.now() - new Date(updateQuery.data.checkedAt).getTime() > 7 * 24 * 60 * 60 * 1000;
  }, [updateQuery.data?.checkedAt]);

  if (!ready) {
    return <LoadingState title="Loading settings" description="Restoring your local playback and interface preferences." />;
  }

  const runUpdateNow = async () => {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("grubx-")).map((key) => caches.delete(key)));
    }

    window.location.reload();
  };

  return (
    <section className="space-y-8">
      <div className="liquid-glass rounded-[2.3rem] px-6 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Control Center</p>
            <h1 className="mt-3 text-4xl font-semibold md:text-5xl">Performance, appearance, playback, and offline behavior</h1>
            <p className="mt-5 text-sm leading-7 text-[var(--muted)]">
              GrubX is fully local-first right now. Settings, watchlist, continue watching, updater state, and preferences
              stay on-device and survive offline use.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await resetSettings();
                  toast.success("Settings reset to production defaults.");
                })
              }
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20"
            >
              <span className="inline-flex items-center gap-2">
                <RotateCcw className="size-4" />
                Reset defaults
              </span>
            </button>
            <button
              type="button"
              onClick={() => void updateQuery.refetch()}
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20"
            >
              <span className="inline-flex items-center gap-2">
                <Rocket className="size-4" />
                Check updates
              </span>
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="liquid-glass-soft rounded-[1.9rem] px-5 py-5 md:px-6">
            <div className="flex items-center gap-3">
              <Download className="size-5 text-[var(--accent)]" />
              <div>
                <h2 className="text-lg font-semibold">Updater</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Compares your version with the fixed GitHub repo and keeps local data intact.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.3rem] border border-white/8 bg-black/25 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Current</p>
                <p className="mt-2 text-xl font-semibold text-white">{updateQuery.data?.currentVersion ?? "4.0.0"}</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/8 bg-black/25 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Latest</p>
                <p className="mt-2 text-xl font-semibold text-white">{updateQuery.data?.latestVersion ?? "Unknown"}</p>
              </div>
              <div className="rounded-[1.3rem] border border-white/8 bg-black/25 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Last checked</p>
                <p className="mt-2 text-sm font-medium text-white">{lastCheckedLabel}</p>
              </div>
            </div>

            {updateQuery.data?.hasUpdate && updateQuery.data.latestVersion ? (
              <div className="mt-5 rounded-[1.4rem] border border-[var(--accent)]/35 bg-[var(--accent-soft)] px-4 py-4 text-sm text-white">
                Update available: {updateQuery.data.currentVersion} to {updateQuery.data.latestVersion}
              </div>
            ) : null}
            {updateIsStale ? (
              <div className="mt-4 rounded-[1.4rem] border border-amber-400/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                Your version may be out of date because GrubX has not checked for updates in the last 7 days.
              </div>
            ) : null}
            {updateQuery.data?.error ? (
              <div className="mt-4 rounded-[1.4rem] border border-white/8 bg-black/20 px-4 py-4 text-sm text-[var(--muted)]">
                Last update check error: {updateQuery.data.error}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void runUpdateNow()}
                className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
              >
                Update now
              </button>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await dataLayer.saveUpdaterState({ dismissedVersion: updateQuery.data?.latestVersion ?? null });
                    toast.success("Update badge dismissed.");
                  })
                }
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20"
              >
                Dismiss
              </button>
              {updateQuery.data?.compareUrl ? (
                <a
                  href={updateQuery.data.compareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20"
                >
                  View changes
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {[
              {
                icon: Clock3,
                title: "Instant-feeling shell",
                description: "Clock, navigation state, updater status, and settings all render without auth waits.",
              },
              {
                icon: Sparkles,
                title: "Premium micro interactions",
                description: "Accent glow, blur control, motion tuning, and stable skeletons keep the UI responsive.",
              },
              {
                icon: BadgeInfo,
                title: "No fallback errors",
                description: "Settings now read from one local store only, so account/guest fallback failures are gone.",
              },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="liquid-glass-soft rounded-[1.6rem] px-5 py-5">
                <Icon className="size-5 text-[var(--accent)]" />
                <h2 className="mt-3 text-lg font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-8 2xl:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Monitor className="size-5 text-[var(--accent)]" />
            <div>
              <h2 className="text-2xl font-semibold">Playback</h2>
              <p className="text-sm text-[var(--muted)]">Player defaults, resume behavior, and popup blocking.</p>
            </div>
          </div>

          <SettingCard title="Autoplay trailers" description="Autoplay starts only after you click into a trailer modal.">
            <ToggleSwitch checked={settings.autoplayTrailers} onChange={(checked) => setSetting("autoplayTrailers", checked, "Trailer autoplay updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Theater mode by default" description="Open playback overlays in expanded theater mode immediately.">
            <ToggleSwitch checked={settings.theaterModeDefault} onChange={(checked) => setSetting("theaterModeDefault", checked, "Theater default updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Resume playback" description="Resume from your saved timestamp whenever progress is available.">
            <ToggleSwitch checked={settings.resumePlayback} onChange={(checked) => setSetting("resumePlayback", checked, "Resume behavior updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Remember last episode" description="TV playback remembers the last watched season and episode locally.">
            <ToggleSwitch checked={settings.rememberLastEpisode} onChange={(checked) => setSetting("rememberLastEpisode", checked, "Episode memory updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Autoplay next episode" description="Keep linear TV-style episode flow once playback is already active.">
            <ToggleSwitch checked={settings.autoplayNextEpisode} onChange={(checked) => setSetting("autoplayNextEpisode", checked, "Next episode behavior updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Muted trailer embeds" description="Start embedded trailers muted to keep the shell quiet by default.">
            <ToggleSwitch checked={settings.inlineTrailerMuted} onChange={(checked) => setSetting("inlineTrailerMuted", checked, "Trailer mute setting updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Playback tips" description="Show subtle in-player guidance for shortcuts and controls.">
            <ToggleSwitch checked={settings.showPlaybackTips} onChange={(checked) => setSetting("showPlaybackTips", checked, "Playback tips updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Block popups" description="Embedded streams stay sandboxed and cannot open popups or new windows.">
            <ToggleSwitch checked={true} onChange={() => undefined} disabled />
          </SettingCard>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Palette className="size-5 text-[var(--accent)]" />
            <div>
              <h2 className="text-2xl font-semibold">UI / Appearance</h2>
              <p className="text-sm text-[var(--muted)]">Theme polish, spacing, card presentation, and clock styling.</p>
            </div>
          </div>

          <SettingCard title="Enable animations" description="Allow carousel motion, hover transitions, and shell fades.">
            <ToggleSwitch checked={settings.enableAnimations} onChange={(checked) => setSetting("enableAnimations", checked, "Animation setting updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="AMOLED mode" description="Deepens blacks and reduces glow for darker panels and OLED screens.">
            <ToggleSwitch checked={settings.amoledMode} onChange={(checked) => setSetting("amoledMode", checked, "Theme mode updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Accent glow" description="Adds subtle highlight bloom around hero actions and active navigation.">
            <ToggleSwitch checked={settings.accentGlow} onChange={(checked) => setSetting("accentGlow", checked, "Accent glow updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Large text" description="Slightly increases type scale for easier reading across the app.">
            <ToggleSwitch checked={settings.largeText} onChange={(checked) => setSetting("largeText", checked, "Large text updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Show ratings" description="Display TMDB rating chips on cards, rails, and title headers.">
            <ToggleSwitch checked={settings.showRatings} onChange={(checked) => setSetting("showRatings", checked, "Ratings visibility updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Show release year" description="Expose year chips on cards and summary surfaces.">
            <ToggleSwitch checked={settings.showReleaseYear} onChange={(checked) => setSetting("showReleaseYear", checked, "Release year visibility updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Live clock" description="Keep a real-time clock visible in the shell on every device size.">
            <ToggleSwitch checked={settings.liveClock} onChange={(checked) => setSetting("liveClock", checked, "Clock visibility updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="24-hour clock" description="Switch shell time formatting from 12-hour to 24-hour display.">
            <ToggleSwitch checked={settings.showClock24h} onChange={(checked) => setSetting("showClock24h", checked, "Clock format updated.")} disabled={isPending} />
          </SettingCard>
          <SelectSetting
            title="Card density"
            description="Controls card spacing and content rhythm across rows and grids."
            value={settings.cardDensity}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
            onChange={(value) => setSetting("cardDensity", value, "Card density updated.")}
          />
          <SelectSetting
            title="Blur strength"
            description="Choose how strong the liquid glass treatment feels throughout the shell."
            value={settings.blurStrength}
            options={[
              { value: "soft", label: "Soft" },
              { value: "balanced", label: "Balanced" },
              { value: "intense", label: "Intense" },
            ]}
            onChange={(value) => setSetting("blurStrength", value, "Blur strength updated.")}
          />
          <SelectSetting
            title="Accent tone"
            description="Adjust the accent palette used by buttons, active states, and highlights."
            value={settings.accentTone}
            options={[
              { value: "ember", label: "Ember" },
              { value: "electric", label: "Electric" },
              { value: "aurora", label: "Aurora" },
            ]}
            onChange={(value) => setSetting("accentTone", value, "Accent tone updated.")}
          />
        </div>
      </div>

      <div className="grid gap-8 2xl:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Rocket className="size-5 text-[var(--accent)]" />
            <div>
              <h2 className="text-2xl font-semibold">Performance</h2>
              <p className="text-sm text-[var(--muted)]">Offline caching, image quality, prefetching, and data-saving controls.</p>
            </div>
          </div>

          <SettingCard title="Data saver" description="Reduce image weight and keep previews conservative on slow links.">
            <ToggleSwitch checked={settings.dataSaver} onChange={(checked) => setSetting("dataSaver", checked, "Data saver updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Reduce backdrop usage" description="Favor posters and neutral surfaces over full-bleed backdrops.">
            <ToggleSwitch checked={settings.reduceBackdropUsage} onChange={(checked) => setSetting("reduceBackdropUsage", checked, "Backdrop behavior updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Low bandwidth mode" description="Turns down visual richness and route prefetching when bandwidth is limited.">
            <ToggleSwitch checked={settings.lowBandwidthMode} onChange={(checked) => setSetting("lowBandwidthMode", checked, "Low bandwidth mode updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Offline caching" description="Keep the app shell cached so GrubX opens quickly and survives network drops.">
            <ToggleSwitch checked={settings.offlineCaching} onChange={(checked) => setSetting("offlineCaching", checked, "Offline caching updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Prefetch routes" description="Warm common routes in the background so navigation feels instant.">
            <ToggleSwitch checked={settings.prefetchRoutes} onChange={(checked) => setSetting("prefetchRoutes", checked, "Route prefetching updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Lazy-load rows" description="Load rows and heavy media only when they enter view.">
            <ToggleSwitch checked={settings.lazyLoadRows} onChange={(checked) => setSetting("lazyLoadRows", checked, "Lazy row loading updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Auto-refresh live feed" description="Refresh the Streamed schedule automatically while you browse live matches.">
            <ToggleSwitch checked={settings.liveAutoRefresh} onChange={(checked) => setSetting("liveAutoRefresh", checked, "Live feed refresh updated.")} disabled={isPending} />
          </SettingCard>
          <SelectSetting
            title="Poster quality"
            description="Choose how aggressively card images balance clarity against bandwidth."
            value={settings.posterQuality}
            options={[
              { value: "balanced", label: "Balanced" },
              { value: "high", label: "High quality" },
              { value: "data-saver", label: "Data saver" },
            ]}
            onChange={(value) => setSetting("posterQuality", value, "Poster quality updated.")}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <AudioLines className="size-5 text-[var(--accent)]" />
            <div>
              <h2 className="text-2xl font-semibold">Audio + Behavior</h2>
              <p className="text-sm text-[var(--muted)]">Search, rails, focus handling, and local collection visibility.</p>
            </div>
          </div>

          <SelectSetting
            title="Audio profile"
            description="Bias player audio toward cinematic impact, dialogue clarity, or late-night restraint."
            value={settings.audioProfile}
            options={[
              { value: "cinema", label: "Cinema" },
              { value: "dialog", label: "Dialog" },
              { value: "night", label: "Night" },
            ]}
            onChange={(value) => setSetting("audioProfile", value, "Audio profile updated.")}
          />
          <SettingCard title="Auto-focus search" description="The / shortcut jumps directly to the search field and focuses it.">
            <ToggleSwitch checked={settings.autoFocusSearch} onChange={(checked) => setSetting("autoFocusSearch", checked, "Search focus shortcut updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Remember search filters" description="Restore the last search target and query when you return to /search.">
            <ToggleSwitch checked={settings.rememberSearchFilters} onChange={(checked) => setSetting("rememberSearchFilters", checked, "Search memory updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Show continue watching" description="Keep the local progress rail visible on the home page and 404 page.">
            <ToggleSwitch checked={settings.showContinueWatching} onChange={(checked) => setSetting("showContinueWatching", checked, "Continue watching visibility updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Show watchlist" description="Keep the local watchlist rail visible on home and settings.">
            <ToggleSwitch checked={settings.showWatchlist} onChange={(checked) => setSetting("showWatchlist", checked, "Watchlist visibility updated.")} disabled={isPending} />
          </SettingCard>
          <SettingCard title="Show trending on 404" description="Use trending rails to recover from missing pages instead of dead ends.">
            <ToggleSwitch checked={settings.showTrendingOn404} onChange={(checked) => setSetting("showTrendingOn404", checked, "404 recovery content updated.")} disabled={isPending} />
          </SettingCard>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await dataLayer.clearContinueWatching();
              queryClient.setQueryData(queryKeys.continueWatching, []);
              toast.success("Continue watching history cleared.");
            })
          }
          className="liquid-glass-soft flex items-center justify-center gap-3 rounded-[1.7rem] px-5 py-5 text-sm font-semibold text-white transition hover:border-white/15"
        >
          <Trash2 className="size-4 text-[var(--accent)]" />
          Clear continue watching
        </button>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await dataLayer.clearWatchlist();
              queryClient.setQueryData(queryKeys.watchlist, []);
              toast.success("Watchlist cleared.");
            })
          }
          className="liquid-glass-soft flex items-center justify-center gap-3 rounded-[1.7rem] px-5 py-5 text-sm font-semibold text-white transition hover:border-white/15"
        >
          <Trash2 className="size-4 text-[var(--accent)]" />
          Clear watchlist
        </button>
        <a
          href="/search?focus=1"
          className="liquid-glass-soft flex items-center justify-center gap-3 rounded-[1.7rem] px-5 py-5 text-sm font-semibold text-white transition hover:border-white/15"
        >
          <Search className="size-4 text-[var(--accent)]" />
          Jump to search
        </a>
      </div>

      <ContinueWatchingRow
        showEmpty
        title="Continue Watching"
        description="Local resume points persist across refreshes, reloads, and offline launches."
      />
      <WatchlistRow
        showEmpty
        title="Watchlist"
        description="Saved titles are stored locally and can be managed directly from the shell."
      />
    </section>
  );
}
