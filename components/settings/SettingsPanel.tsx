"use client";

import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bug,
  Database,
  Download,
  Film,
  Globe2,
  Home,
  LayoutGrid,
  MonitorPlay,
  Navigation,
  Palette,
  Plus,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";

import { LoadingState } from "@/components/feedback/LoadingState";
import { SelectControl } from "@/components/settings/SelectControl";
import { SliderControl } from "@/components/settings/SliderControl";
import { TextInputControl } from "@/components/settings/TextInputControl";
import { ToggleSwitch } from "@/components/settings/ToggleSwitch";
import { useSettingsContext } from "@/context/SettingsContext";
import { GRUBX_PROVIDERS } from "@/lib/grubx/providers";
import { DEFAULT_FEATURE_TOGGLES, DEFAULT_SETTINGS, PROGRESS_STORAGE_KEY, WATCHLIST_STORAGE_KEY } from "@/lib/settings";
import {
  getAgeGateStatus,
  getRiskConsentAcceptedAt,
  hasRiskConsent,
  isUnder13Suspended,
  resetPlaybackSafetyConsent,
} from "@/lib/grubx/consent";
import { queryKeys } from "@/lib/queryKeys";
import type { CustomProviderSettings, Settings } from "@/types/settings";

const presets: Array<{ value: Settings["websitePreset"]; label: string; patch: Partial<Settings> }> = [
  { value: "cinematic-console", label: "Cinematic Console", patch: { backgroundStyle: "cinematic-gradient", cardSize: "medium", customCardDensity: "comfortable", navStyle: "floating", playerLayout: "fullscreen-overlay", themePreference: "dark", amoledMode: false, compactMode: false } },
  { value: "minimal", label: "Minimal", patch: { backgroundStyle: "minimal", cardSize: "medium", customCardDensity: "compact", navStyle: "compact", panelOpacity: 0.02, shadowStrength: 0.16 } },
  { value: "amoled", label: "AMOLED", patch: { backgroundStyle: "solid", themePreference: "amoled", amoledMode: true, panelOpacity: 0.025, shadowStrength: 0.18 } },
  { value: "glass", label: "Glass", patch: { backgroundStyle: "glass", blurStrength: "intense", panelOpacity: 0.06, borderStrength: 0.16, shadowStrength: 0.42 } },
  { value: "compact", label: "Compact", patch: { compactMode: true, cardSize: "small", customCardDensity: "compact", rowSpacing: "compact", navStyle: "compact" } },
  { value: "big-screen-tv", label: "Big Screen / TV", patch: { cardSize: "large", customCardDensity: "spacious", rowSpacing: "spacious", textSize: "large", navStyle: "top-bar", playerLayout: "fullscreen-overlay" } },
  { value: "mobile-friendly", label: "Mobile Friendly", patch: { cardSize: "small", customCardDensity: "comfortable", mobileNavStyle: "bottom-bar", textSize: "normal", playerLayout: "compact" } },
];

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] px-5 py-5 md:px-6 md:py-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 bg-black/35 text-[var(--accent)]">
          <Icon className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1rem] border border-white/8 bg-black/22 px-4 py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function SelectSetting<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="min-h-11 rounded-full border border-white/10 bg-black/45 px-4 text-sm font-semibold text-white outline-none"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const createCustomProviderId = (name: string) =>
  `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42)}-${Date.now()}`;

const featureRows: Array<{ key: keyof Settings["featureToggles"]; title: string; description: string }> = [
  { key: "movies", title: "Movies", description: "Movie catalog, title pages, and movie playback." },
  { key: "tv", title: "TV", description: "TV catalog, seasons, episodes, and TV playback." },
  { key: "live", title: "Live TV", description: "Live TV and sports page." },
  { key: "anime", title: "Anime", description: "Anime Nexus inside GrubX." },
  { key: "youtube", title: "YouTube", description: "YouTube search and embeds." },
  { key: "spotify", title: "Spotify / Music", description: "Spotify login, search, embeds, and music tools." },
  { key: "tiktok", title: "TikTok", description: "TikTok search and link embeds." },
  { key: "search", title: "Search", description: "Global movie and TV search." },
  { key: "watchlist", title: "Watchlist", description: "Saved titles and watchlist controls." },
  { key: "continueWatching", title: "Continue Watching", description: "Local playback progress rows." },
  { key: "aiServer", title: "AI Server", description: "AI Server navigation and page." },
  { key: "providerReports", title: "Provider Reports", description: "Report provider buttons and server alerts." },
  { key: "feedbackContact", title: "Feedback / Contact", description: "Feedback forms and contact page." },
  { key: "safetyLegalPages", title: "Safety / Legal Pages", description: "Safety, terms, and privacy links." },
  { key: "proxyPlayback", title: "Proxy Playback", description: "Allow proxy playback options where available." },
  { key: "thirdPartyPlayback", title: "Third-party Playback", description: "Allow third-party playback providers." },
  { key: "tvModeScreenMirroring", title: "TV Mode / Screen Mirroring", description: "TV mode and cast/mirror controls." },
];

export function SettingsPanel() {
  const [isPending, startTransition] = useTransition();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customPattern, setCustomPattern] = useState("");
  const [exportedSettings, setExportedSettings] = useState("");
  const [importSettingsJson, setImportSettingsJson] = useState("");
  const [consentSnapshot, setConsentSnapshot] = useState({
    ageGateStatus: "Not answered",
    riskConsent: "Not accepted",
    under13Suspended: false,
  });
  const queryClient = useQueryClient();
  const { ready, settings, resetSettings, updateSettings, clearAllData } = useSettingsContext();

  const enabledBuiltInCount = useMemo(
    () =>
      GRUBX_PROVIDERS.filter(
        (provider) =>
          provider.enabled &&
          settings.providerSettings[provider.id] !== false,
      ).length,
    [settings.providerSettings],
  );

  const setSetting = <K extends keyof Settings>(key: K, value: Settings[K], message: string) => {
    startTransition(async () => {
      await updateSettings({ [key]: value });
      toast.success(message);
    });
  };

  const setFeatureToggle = (key: keyof Settings["featureToggles"], enabled: boolean) => {
    setSetting(
      "featureToggles",
      {
        ...settings.featureToggles,
        [key]: enabled,
      },
      enabled ? "Feature enabled." : "Feature disabled.",
    );
  };

  const applyPreset = (preset: (typeof presets)[number]) => {
    startTransition(async () => {
      await updateSettings({ websitePreset: preset.value, ...preset.patch });
      toast.success(`${preset.label} preset applied.`);
    });
  };

  const resetProviderPreferences = () => {
    try {
      window.localStorage.removeItem("grubx.providerReports");
      window.localStorage.removeItem("grubx.providerFailures");
      window.localStorage.removeItem("grubx.providerSuccesses");
      window.localStorage.removeItem("grubx.preferredProvider");
      window.localStorage.removeItem("grubx.blockedProviders");
    } catch {
      // Local storage may be unavailable in privacy modes.
    }
    setSetting("providerSettings", DEFAULT_SETTINGS.providerSettings, "Provider preferences reset.");
  };

  const exportCurrentSettings = () => {
    const payload = JSON.stringify(settings, null, 2);
    setExportedSettings(payload);
    void navigator.clipboard?.writeText(payload).catch(() => undefined);
    toast.success("Settings exported. The JSON was copied when clipboard access was available.");
  };

  const importSettings = () => {
    startTransition(async () => {
      try {
        const parsed = JSON.parse(importSettingsJson) as Partial<Settings>;
        await updateSettings(parsed);
        toast.success("Settings imported.");
      } catch {
        toast.error("That settings JSON could not be imported.");
      }
    });
  };

  const testMatrixFeedback = () => {
    startTransition(async () => {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          category: "other",
          area: "settings",
          priority: "low",
          title: "Settings test feedback",
          message: "An admin tested the GrubX feedback pipeline from Settings.",
          pageUrl: "/settings",
        }),
      });
      toast[response.ok ? "success" : "error"](response.ok ? "Feedback test sent." : "Feedback test failed.");
    });
  };

  const testProviderReport = () => {
    startTransition(async () => {
      const provider = GRUBX_PROVIDERS[0];
      const response = await fetch("/api/provider-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          providerId: provider.id,
          providerName: provider.name,
          reason: "other",
          title: "Settings test report",
          pageUrl: "/settings",
          details: "An admin tested the provider report pipeline from Settings.",
        }),
      });
      toast[response.ok ? "success" : "error"](response.ok ? "Provider report test sent." : "Provider report test failed.");
    });
  };

  const refreshConsentSnapshot = () => {
    const ageGateStatus = getAgeGateStatus();
    const riskAcceptedAt = getRiskConsentAcceptedAt();
    setConsentSnapshot({
      ageGateStatus: ageGateStatus === "13plus" ? "13 or older" : ageGateStatus === "under13" ? "Under 13" : "Not answered",
      riskConsent: hasRiskConsent() ? `Accepted${riskAcceptedAt ? ` on ${new Date(riskAcceptedAt).toLocaleString()}` : ""}` : "Not accepted",
      under13Suspended: isUnder13Suspended(),
    });
  };

  useEffect(() => {
    refreshConsentSnapshot();
  }, []);

  const setProviderEnabled = (providerId: string, enabled: boolean) => {
    setSetting(
      "providerSettings",
      {
        ...settings.providerSettings,
        [providerId]: enabled,
      },
      enabled ? "Provider enabled." : "Provider disabled.",
    );
  };

  const addCustomProvider = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextProvider: CustomProviderSettings = {
      id: createCustomProviderId(customName),
      name: customName.trim(),
      baseUrl: customBaseUrl.trim(),
      embedUrlPattern: customPattern.trim(),
      enabled: true,
      supportsMovie: true,
      supportsTv: true,
    };

    startTransition(async () => {
      await updateSettings({ customProviders: [...settings.customProviders, nextProvider] });
      setCustomName("");
      setCustomBaseUrl("");
      setCustomPattern("");
      toast.success("Custom provider added.");
    });
  };

  const updateCustomProvider = (providerId: string, next: Partial<CustomProviderSettings>) => {
    setSetting(
      "customProviders",
      settings.customProviders.map((provider) =>
        provider.id === providerId ? { ...provider, ...next } : provider,
      ),
      "Custom provider updated.",
    );
  };

  const removeCustomProvider = (providerId: string) => {
    setSetting(
      "customProviders",
      settings.customProviders.filter((provider) => provider.id !== providerId),
      "Custom provider removed.",
    );
  };

  if (!ready) {
    return <LoadingState title="Loading settings" description="Restoring your local control panel." />;
  }

  return (
    <section className="space-y-8">
      <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.035] px-5 py-7 md:px-7 md:py-9">
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--accent)]">Control Center</p>
        <h1 className="mt-4 text-4xl font-bold leading-none md:text-5xl">Tune GrubX</h1>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--muted)]">
          Every control here is stored locally on this device. No account sync and no background version checks.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                await resetSettings();
                toast.success("Settings reset.");
              })
            }
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/6 px-5 text-sm font-semibold text-white transition hover:border-white/20"
          >
            <RotateCcw className="size-4" />
            Reset settings
          </button>
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-red-300/20 bg-red-500/10 px-5 text-sm font-semibold text-red-100 transition hover:border-red-200/35"
          >
            <Trash2 className="size-4" />
            Clear All Cache & Data
          </button>
        </div>
      </div>

      <Section icon={SlidersHorizontal} title="Website Presets" description="Start from a tuned layout, then keep customizing manually.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {presets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => applyPreset(preset)}
              className={[
                "min-h-11 rounded-[1rem] border px-4 py-3 text-left text-sm font-semibold transition active:scale-[0.98]",
                settings.websitePreset === preset.value
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-white"
                  : "border-white/10 bg-white/6 text-[var(--muted)] hover:text-white",
              ].join(" ")}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Section>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section icon={Globe2} title="Branding" description="Customize the public labels and copy without changing app routes.">
          <SettingRow title="Website name" description="Shown in the navbar brand.">
            <TextInputControl value={settings.websiteName} onChange={(value) => setSetting("websiteName", value, "Website name updated.")} label="Website name" />
          </SettingRow>
          <SettingRow title="Website subtitle" description="Used in supporting copy and exports.">
            <TextInputControl value={settings.websiteSubtitle} onChange={(value) => setSetting("websiteSubtitle", value, "Website subtitle updated.")} label="Website subtitle" />
          </SettingRow>
          <SettingRow title="Show logo" description="Show or hide the GrubX icon in the navbar.">
            <ToggleSwitch checked={settings.showLogo} onChange={(checked) => setSetting("showLogo", checked, "Logo visibility updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Logo size" description="Adjust the brand icon scale.">
            <SelectControl
              value={settings.logoSize}
              options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]}
              onChange={(value) => setSetting("logoSize", value, "Logo size updated.")}
            />
          </SettingRow>
          <SettingRow title="Home hero title" description="Custom copy for the home hero.">
            <TextInputControl value={settings.homeHeroTitle} onChange={(value) => setSetting("homeHeroTitle", value, "Hero title updated.")} label="Home hero title" />
          </SettingRow>
          <SettingRow title="Home hero subtitle" description="Custom supporting copy for the home hero.">
            <TextInputControl value={settings.homeHeroSubtitle} onChange={(value) => setSetting("homeHeroSubtitle", value, "Hero subtitle updated.")} label="Home hero subtitle" />
          </SettingRow>
          <SettingRow title="Footer text" description="Customize the primary footer message.">
            <TextInputControl value={settings.footerText} onChange={(value) => setSetting("footerText", value, "Footer text updated.")} label="Footer text" />
          </SettingRow>
          <SettingRow title="AI Server label" description="Customize the external AI link label.">
            <TextInputControl value={settings.aiServerLabel} onChange={(value) => setSetting("aiServerLabel", value, "AI label updated.")} label="AI Server label" />
          </SettingRow>
          <SettingRow title="AI Server URL" description="Use an HTTPS URL for the AI Server link.">
            <TextInputControl type="url" value={settings.aiServerUrl} onChange={(value) => setSetting("aiServerUrl", value, "AI Server URL updated.")} label="AI Server URL" />
          </SettingRow>
        </Section>

        <Section icon={Palette} title="Colors & Theme" description="Fine-tune color, contrast, and glass intensity.">
          <SettingRow title="Theme mode" description="Choose system, dark, or AMOLED behavior.">
            <SelectControl
              value={settings.themePreference}
              options={[{ value: "system", label: "System" }, { value: "dark", label: "Dark" }, { value: "amoled", label: "AMOLED" }]}
              onChange={(value) => {
                void updateSettings({ themePreference: value, uiTheme: "dark", amoledMode: value === "amoled" });
                toast.success("Theme mode updated.");
              }}
            />
          </SettingRow>
          <SettingRow title="Accent color" description="Pick the active state color.">
            <TextInputControl type="color" value={settings.accentColor} onChange={(value) => setSetting("accentColor", value, "Accent color updated.")} label="Accent color" />
          </SettingRow>
          <SettingRow title="Background style" description="Choose the page backdrop treatment.">
            <SelectControl
              value={settings.backgroundStyle}
              options={[{ value: "solid", label: "Solid" }, { value: "cinematic-gradient", label: "Cinematic gradient" }, { value: "glass", label: "Glass" }, { value: "minimal", label: "Minimal" }]}
              onChange={(value) => setSetting("backgroundStyle", value, "Background style updated.")}
            />
          </SettingRow>
          <SettingRow title="Panel opacity" description="Adjust panel fill intensity.">
            <SliderControl value={Math.round(settings.panelOpacity * 100)} min={0} max={20} onChange={(value) => setSetting("panelOpacity", value / 100, "Panel opacity updated.")} suffix="%" />
          </SettingRow>
          <SettingRow title="Border strength" description="Adjust panel border visibility.">
            <SliderControl value={Math.round(settings.borderStrength * 100)} min={0} max={35} onChange={(value) => setSetting("borderStrength", value / 100, "Border strength updated.")} suffix="%" />
          </SettingRow>
          <SettingRow title="Shadow strength" description="Adjust elevated shadow intensity.">
            <SliderControl value={Math.round(settings.shadowStrength * 100)} min={0} max={80} onChange={(value) => setSetting("shadowStrength", value / 100, "Shadow strength updated.")} suffix="%" />
          </SettingRow>
          <SettingRow title="Text size" description="Scale app text without breaking layout.">
            <SelectControl value={settings.textSize} options={[{ value: "small", label: "Small" }, { value: "normal", label: "Normal" }, { value: "large", label: "Large" }]} onChange={(value) => setSetting("textSize", value, "Text size updated.")} />
          </SettingRow>
          <SettingRow title="High contrast mode" description="Raise muted text contrast.">
            <ToggleSwitch checked={settings.highContrastMode} onChange={(checked) => setSetting("highContrastMode", checked, "High contrast updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Reduce motion" description="Reduce animation and hover motion.">
            <ToggleSwitch checked={!settings.enableAnimations} onChange={(checked) => setSetting("enableAnimations", !checked, "Motion preference updated.")} disabled={isPending} />
          </SettingRow>
        </Section>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section icon={LayoutGrid} title="Layout" description="Control card sizing, density, poster shape, and visible metadata.">
          <SettingRow title="Card size" description="Scale posters in rows and grids.">
            <SelectControl value={settings.cardSize} options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]} onChange={(value) => setSetting("cardSize", value, "Card size updated.")} />
          </SettingRow>
          <SettingRow title="Card density" description="Choose compact, comfortable, or spacious cards.">
            <SelectControl value={settings.customCardDensity} options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "spacious", label: "Spacious" }]} onChange={(value) => setSetting("customCardDensity", value, "Card density updated.")} />
          </SettingRow>
          <SettingRow title="Poster shape" description="Control card corner radius.">
            <SelectControl value={settings.posterShape} options={[{ value: "sharp", label: "Sharp" }, { value: "rounded", label: "Rounded" }, { value: "extra-rounded", label: "Extra rounded" }]} onChange={(value) => setSetting("posterShape", value, "Poster shape updated.")} />
          </SettingRow>
          <SettingRow title="Row spacing" description="Adjust section breathing room.">
            <SelectControl value={settings.rowSpacing} options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "spacious", label: "Spacious" }]} onChange={(value) => setSetting("rowSpacing", value, "Row spacing updated.")} />
          </SettingRow>
          <SettingRow title="Grid columns" description="Pick a fixed catalog grid or keep auto.">
            <SelectControl value={settings.gridColumns} options={[{ value: "auto", label: "Auto" }, { value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }, { value: "5", label: "5" }, { value: "6", label: "6" }]} onChange={(value) => setSetting("gridColumns", value, "Grid columns updated.")} />
          </SettingRow>
          <SettingRow title="Show metadata on cards" description="Show rating/year pills.">
            <ToggleSwitch checked={settings.showCardMetadata} onChange={(checked) => setSetting("showCardMetadata", checked, "Card metadata updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Show ratings" description="Show rating values on cards.">
            <ToggleSwitch checked={settings.showRatings} onChange={(checked) => setSetting("showRatings", checked, "Ratings updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Show release year" description="Show years on cards.">
            <ToggleSwitch checked={settings.showReleaseYear} onChange={(checked) => setSetting("showReleaseYear", checked, "Release years updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Show descriptions" description="Show overview snippets under titles.">
            <ToggleSwitch checked={settings.showCardDescriptions} onChange={(checked) => setSetting("showCardDescriptions", checked, "Descriptions updated.")} disabled={isPending} />
          </SettingRow>
        </Section>

        <Section icon={Home} title="Home Page" description="Choose the home hero and shelf behavior.">
          <SettingRow title="Show hero" description="Show or hide the full home hero.">
            <ToggleSwitch checked={settings.showHomeHero} onChange={(checked) => setSetting("showHomeHero", checked, "Hero visibility updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Hero style" description="Choose full bleed, compact, or poster-focused.">
            <SelectControl value={settings.heroStyle} options={[{ value: "full-bleed", label: "Full bleed" }, { value: "compact", label: "Compact" }, { value: "poster-focused", label: "Poster focused" }]} onChange={(value) => setSetting("heroStyle", value, "Hero style updated.")} />
          </SettingRow>
          <SettingRow title="Auto-rotate hero" description="Rotate featured hero items automatically.">
            <ToggleSwitch checked={settings.autoRotateHero} onChange={(checked) => setSetting("autoRotateHero", checked, "Hero rotation updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Hero rotation speed" description="Milliseconds between hero slides.">
            <SliderControl value={settings.heroRotationSpeed} min={2500} max={20000} step={500} onChange={(value) => setSetting("heroRotationSpeed", value, "Hero speed updated.")} />
          </SettingRow>
          <SettingRow title="Show trending rows" description="Show content discovery shelves.">
            <ToggleSwitch checked={settings.showTrendingRows} onChange={(checked) => setSetting("showTrendingRows", checked, "Trending rows updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Show continue watching" description="Show local playback progress.">
            <ToggleSwitch checked={settings.featureToggles.continueWatching} onChange={(checked) => setFeatureToggle("continueWatching", checked)} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Show watchlist" description="Show locally saved titles.">
            <ToggleSwitch checked={settings.featureToggles.watchlist} onChange={(checked) => setFeatureToggle("watchlist", checked)} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Default home sections" description="Comma-separated section keys.">
            <TextInputControl value={settings.defaultHomeSections.join(", ")} onChange={(value) => setSetting("defaultHomeSections", value.split(",").map((item) => item.trim()).filter(Boolean), "Home sections updated.")} />
          </SettingRow>
          <SettingRow title="Section order" description="Comma-separated order keys.">
            <TextInputControl value={settings.homeSectionOrder.join(", ")} onChange={(value) => setSetting("homeSectionOrder", value.split(",").map((item) => item.trim()).filter(Boolean), "Section order updated.")} />
          </SettingRow>
        </Section>
      </div>

      <Section
        icon={SlidersHorizontal}
        title="Feature Toggles"
        description="Turn major GrubX areas on or off. Disabled nav items disappear, but direct links show a clean disabled screen."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {featureRows.map((feature) => (
            <SettingRow key={feature.key} title={feature.title} description={feature.description}>
              <ToggleSwitch
                checked={settings.featureToggles[feature.key]}
                onChange={(checked) => setFeatureToggle(feature.key, checked)}
                disabled={isPending || feature.key === "safetyLegalPages"}
              />
            </SettingRow>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setSetting("featureToggles", DEFAULT_FEATURE_TOGGLES, "Feature toggles reset.")}
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white"
          >
            Reset feature toggles
          </button>
        </div>
      </Section>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section icon={MonitorPlay} title="Playback & Providers" description="Control third-party playback, server behavior, and player warnings.">
          <SettingRow title="Enable third-party playback" description="Allow movie and TV playback through third-party providers.">
            <ToggleSwitch
              checked={settings.featureToggles.thirdPartyPlayback}
              onChange={(checked) => setFeatureToggle("thirdPartyPlayback", checked)}
              disabled={isPending}
            />
          </SettingRow>
          <SettingRow title="Enable proxy playback" description="Allow proxy playback options when your deployment supports them.">
            <ToggleSwitch
              checked={settings.featureToggles.proxyPlayback}
              onChange={(checked) => setFeatureToggle("proxyPlayback", checked)}
              disabled={isPending}
            />
          </SettingRow>
          <SettingRow title="Default playback mode" description="Choose how GrubX should prefer direct or proxy playback.">
            <SelectSetting
              value={settings.playbackMode}
              options={[
                { value: "direct", label: "Direct" },
                { value: "proxy", label: "Proxy" },
                { value: "auto", label: "Auto" },
              ]}
              onChange={(value) => setSetting("playbackMode", value, "Playback mode updated.")}
            />
          </SettingRow>
          <SettingRow title="Default provider" description="Pick the first server GrubX should try when available.">
            <SelectSetting
              value={settings.defaultProvider}
              options={GRUBX_PROVIDERS.map((provider) => ({ value: provider.id, label: provider.name }))}
              onChange={(value) => setSetting("defaultProvider", value, "Default provider updated.")}
            />
          </SettingRow>
          <SettingRow title="Enable server switcher" description="Show server choices inside the player.">
            <ToggleSwitch
              checked={settings.enableServerSwitcher}
              onChange={(checked) => setSetting("enableServerSwitcher", checked, "Server switcher updated.")}
              disabled={isPending}
            />
          </SettingRow>
          <SettingRow title="Enable autoplay if supported" description="Ask providers to start playback automatically when they support it.">
            <ToggleSwitch
              checked={settings.autoplayPlayback}
              onChange={(checked) => setSetting("autoplayPlayback", checked, "Autoplay updated.")}
              disabled={isPending}
            />
          </SettingRow>
          <SettingRow title="Show playback warnings" description="Show user-facing warnings before risky third-party playback.">
            <ToggleSwitch
              checked={settings.showPlaybackWarnings}
              onChange={(checked) => setSetting("showPlaybackWarnings", checked, "Playback warnings updated.")}
              disabled={isPending}
            />
          </SettingRow>
          <button
            type="button"
            onClick={resetProviderPreferences}
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white"
          >
            Reset provider preferences
          </button>
        </Section>

        <Section icon={Youtube} title="External Media" description="Control YouTube, Spotify, and TikTok behavior.">
          <SettingRow title="Enable YouTube" description="Show YouTube in nav and allow direct access to the YouTube page.">
            <ToggleSwitch checked={settings.featureToggles.youtube} onChange={(checked) => setFeatureToggle("youtube", checked)} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Enable Spotify" description="Show Spotify / Music in nav and allow direct access to music tools.">
            <ToggleSwitch checked={settings.featureToggles.spotify} onChange={(checked) => setFeatureToggle("spotify", checked)} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Enable TikTok" description="Show TikTok in nav and allow direct access to TikTok embeds.">
            <ToggleSwitch checked={settings.featureToggles.tiktok} onChange={(checked) => setFeatureToggle("tiktok", checked)} disabled={isPending} />
          </SettingRow>
          <SettingRow title="YouTube safe search" description="Choose the default YouTube search safety level.">
            <SelectSetting
              value={settings.youtubeSafeSearch}
              options={[
                { value: "strict", label: "Strict" },
                { value: "moderate", label: "Moderate" },
                { value: "off", label: "Off" },
              ]}
              onChange={(value) => setSetting("youtubeSafeSearch", value, "YouTube safe search updated.")}
            />
          </SettingRow>
          <SettingRow title="YouTube result count" description="Choose how many YouTube results to request.">
            <SelectSetting
              value={String(settings.youtubeResultCount)}
              options={[
                { value: "8", label: "8" },
                { value: "12", label: "12" },
                { value: "20", label: "20" },
              ]}
              onChange={(value) => setSetting("youtubeResultCount", Number(value) as Settings["youtubeResultCount"], "YouTube result count updated.")}
            />
          </SettingRow>
          <SettingRow title="Spotify embed size" description="Choose compact or large Spotify embeds.">
            <SelectSetting
              value={settings.spotifyEmbedSize}
              options={[
                { value: "compact", label: "Compact" },
                { value: "large", label: "Large" },
              ]}
              onChange={(value) => setSetting("spotifyEmbedSize", value, "Spotify embed size updated.")}
            />
          </SettingRow>
          <SettingRow title="TikTok embed mode" description="Use embedded TikToks or link fallback mode.">
            <SelectControl value={settings.tiktokEmbedMode} options={[{ value: "embed", label: "Embed" }, { value: "link-fallback", label: "Link fallback" }]} onChange={(value) => setSetting("tiktokEmbedMode", value, "TikTok embed mode updated.")} />
          </SettingRow>
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                await updateSettings({
                  youtubeSafeSearch: DEFAULT_SETTINGS.youtubeSafeSearch,
                  youtubeResultCount: DEFAULT_SETTINGS.youtubeResultCount,
                  spotifyEmbedSize: DEFAULT_SETTINGS.spotifyEmbedSize,
                  featureToggles: {
                    ...settings.featureToggles,
                    youtube: true,
                    spotify: true,
                    tiktok: true,
                  },
                });
                toast.success("External media settings reset.");
              })
            }
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white"
          >
            Reset external media settings
          </button>
        </Section>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section icon={Palette} title="Appearance" description="Adjust the Cinematic Console look without leaving the default design language.">
          <SettingRow title="Theme mode" description="Choose system-style dark, dark, or AMOLED output.">
            <SelectSetting
              value={settings.amoledMode ? "amoled" : settings.uiTheme}
              options={[
                { value: "system", label: "System" },
                { value: "dark", label: "Dark" },
                { value: "amoled", label: "AMOLED" },
              ]}
              onChange={(value) => {
                void updateSettings({ uiTheme: value === "system" ? "dark" : "dark", amoledMode: value === "amoled" });
                toast.success("Theme mode updated.");
              }}
            />
          </SettingRow>
          <SettingRow title="Accent tone" description="Change the warm accent used for active states.">
            <SelectSetting
              value={settings.accentTone}
              options={[
                { value: "ember", label: "Ember" },
                { value: "electric", label: "Electric" },
                { value: "aurora", label: "Aurora" },
              ]}
              onChange={(value) => setSetting("accentTone", value, "Accent tone updated.")}
            />
          </SettingRow>
          <SettingRow title="Card density" description="Adjust card spacing and browsing density.">
            <SelectSetting
              value={settings.cardDensity}
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
              ]}
              onChange={(value) => setSetting("cardDensity", value, "Card density updated.")}
            />
          </SettingRow>
          <SettingRow title="Blur strength" description="Control glass blur intensity.">
            <SelectSetting
              value={settings.blurStrength}
              options={[
                { value: "soft", label: "Soft" },
                { value: "balanced", label: "Balanced" },
                { value: "intense", label: "Intense" },
              ]}
              onChange={(value) => setSetting("blurStrength", value, "Blur strength updated.")}
            />
          </SettingRow>
          <SettingRow title="Compact mode" description="Tighten spacing across rows and cards.">
            <ToggleSwitch checked={settings.compactMode} onChange={(checked) => setSetting("compactMode", checked, "Compact mode updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Reduce motion" description="Reduce animation and hover motion.">
            <ToggleSwitch checked={!settings.enableAnimations} onChange={(checked) => setSetting("enableAnimations", !checked, "Motion preference updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Poster size" description="Control poster image quality and bandwidth.">
            <SelectSetting
              value={settings.posterQuality}
              options={[
                { value: "data-saver", label: "Small" },
                { value: "balanced", label: "Medium" },
                { value: "high", label: "Large" },
              ]}
              onChange={(value) => setSetting("posterQuality", value, "Poster size updated.")}
            />
          </SettingRow>
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                await updateSettings({
                  uiTheme: DEFAULT_SETTINGS.uiTheme,
                  amoledMode: DEFAULT_SETTINGS.amoledMode,
                  accentTone: DEFAULT_SETTINGS.accentTone,
                  cardDensity: DEFAULT_SETTINGS.cardDensity,
                  blurStrength: DEFAULT_SETTINGS.blurStrength,
                  compactMode: DEFAULT_SETTINGS.compactMode,
                  enableAnimations: DEFAULT_SETTINGS.enableAnimations,
                  posterQuality: DEFAULT_SETTINGS.posterQuality,
                });
                toast.success("Appearance settings reset.");
              })
            }
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white"
          >
            Reset appearance settings
          </button>
        </Section>

        <Section icon={Navigation} title="Navigation" description="Control nav visibility and how external AI opens.">
          <SettingRow title="Navigation style" description="Choose a desktop nav shape.">
            <SelectSetting
              value={settings.navStyle}
              options={[
                { value: "auto", label: "Auto" },
                { value: "top-bar", label: "Top bar only" },
                { value: "sidebar", label: "Sidebar only" },
                                { value: "floating", label: "Floating" },
                { value: "bottom-mobile", label: "Bottom mobile bar" },
                { value: "compact", label: "Compact" },
              ]}
              onChange={(value) => setSetting("navStyle", value, "Navigation style updated.")}
            />
          </SettingRow>
          <SettingRow title="Mobile nav style" description="Choose the mobile navigation behavior.">
            <SelectSetting
              value={settings.mobileNavStyle}
              options={[
                { value: "auto", label: "Auto" },
                { value: "drawer", label: "Drawer" },
                                { value: "bottom-bar", label: "Bottom bar" },
                { value: "compact-top", label: "Compact top" },
              ]}
              onChange={(value) => setSetting("mobileNavStyle", value, "Mobile nav style updated.")}
            />
          </SettingRow>
          <SettingRow title="Show nav labels" description="Show or hide text labels beside icons.">
            <ToggleSwitch checked={settings.showNavLabels} onChange={(checked) => setSetting("showNavLabels", checked, "Nav labels updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Show nav icons" description="Show or hide icons beside labels.">
            <ToggleSwitch checked={settings.showNavIcons} onChange={(checked) => setSetting("showNavIcons", checked, "Nav icons updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Nav item order" description="Comma-separated route keys. Settings can never be fully hidden.">
            <TextInputControl value={settings.navItemOrder.join(", ")} onChange={(value) => setSetting("navItemOrder", value.split(",").map((item) => item.trim()).filter(Boolean), "Nav order updated.")} />
          </SettingRow>
          <SettingRow title="Open AI Server" description="Choose whether AI opens in GrubX or a new tab.">
            <SelectSetting
              value={settings.aiOpenMode}
              options={[
                { value: "same-tab", label: "Same tab" },
                { value: "new-tab", label: "New tab" },
              ]}
              onChange={(value) => setSetting("aiOpenMode", value, "AI Server behavior updated.")}
            />
          </SettingRow>
          <div className="grid gap-3 md:grid-cols-2">
            {featureRows
              .filter((feature) => ["movies", "tv", "live", "anime", "youtube", "spotify", "tiktok", "search", "aiServer"].includes(feature.key))
              .map((feature) => (
                <SettingRow key={feature.key} title={`Show ${feature.title}`} description="Show or hide this item in navigation.">
                  <ToggleSwitch checked={settings.featureToggles[feature.key]} onChange={(checked) => setFeatureToggle(feature.key, checked)} disabled={isPending} />
                </SettingRow>
              ))}
          </div>
        </Section>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section icon={Film} title="Movies & TV" description="Defaults for browsing, filtering, and result loading.">
          <SettingRow title="Default media page" description="Choose where media shortcuts should start.">
            <SelectControl value={settings.defaultMediaPage} options={[{ value: "home", label: "Home" }, { value: "movies", label: "Movies" }, { value: "tv", label: "TV" }]} onChange={(value) => setSetting("defaultMediaPage", value, "Default media page updated.")} />
          </SettingRow>
          <SettingRow title="Default sort" description="Preferred catalog sorting mode.">
            <SelectControl value={settings.defaultSort} options={[{ value: "popular", label: "Popular" }, { value: "trending", label: "Trending" }, { value: "top-rated", label: "Top Rated" }, { value: "newest", label: "Newest" }]} onChange={(value) => setSetting("defaultSort", value, "Default sort updated.")} />
          </SettingRow>
          <SettingRow title="Default filters" description="Comma-separated filter labels or IDs.">
            <TextInputControl value={settings.defaultFilters.join(", ")} onChange={(value) => setSetting("defaultFilters", value.split(",").map((item) => item.trim()).filter(Boolean), "Default filters updated.")} />
          </SettingRow>
          <SettingRow title="Show genre filters" description="Show genre controls on catalog pages.">
            <ToggleSwitch checked={settings.showGenreFilters} onChange={(checked) => setSetting("showGenreFilters", checked, "Genre filters updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Show rating filters" description="Show rating filters where available.">
            <ToggleSwitch checked={settings.showRatingFilters} onChange={(checked) => setSetting("showRatingFilters", checked, "Rating filters updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Show year filters" description="Show year range filters.">
            <ToggleSwitch checked={settings.showYearFilters} onChange={(checked) => setSetting("showYearFilters", checked, "Year filters updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Results per page" description="Preferred number of results per load.">
            <SliderControl value={settings.resultsPerPage} min={8} max={60} step={4} onChange={(value) => setSetting("resultsPerPage", value, "Results per page updated.")} />
          </SettingRow>
          <SettingRow title="Infinite scroll" description="Load more results while scrolling.">
            <ToggleSwitch checked={settings.infiniteScroll} onChange={(checked) => setSetting("infiniteScroll", checked, "Infinite scroll updated.")} disabled={isPending} />
          </SettingRow>
        </Section>

        <Section icon={MonitorPlay} title="Player" description="Customize playback layout, controls, and provider actions.">
          <SettingRow title="Player layout" description="Choose the player presentation.">
            <SelectControl value={settings.playerLayout} options={[{ value: "fullscreen-overlay", label: "Fullscreen overlay" }, { value: "theater", label: "Theater" }, { value: "compact", label: "Compact" }]} onChange={(value) => setSetting("playerLayout", value, "Player layout updated.")} />
          </SettingRow>
          <SettingRow title="Auto-hide controls" description="Hide controls after a short idle period.">
            <ToggleSwitch checked={settings.autoHidePlayerControls} onChange={(checked) => setSetting("autoHidePlayerControls", checked, "Auto-hide controls updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Control bar position" description="Choose top, bottom, or floating controls.">
            <SelectControl value={settings.controlBarPosition} options={[{ value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }, { value: "floating", label: "Floating" }]} onChange={(value) => setSetting("controlBarPosition", value, "Control position updated.")} />
          </SettingRow>
          <SettingRow title="Default server behavior" description="Auto-pick, ask every time, or use last server.">
            <SelectControl value={settings.defaultServerBehavior} options={[{ value: "auto", label: "Auto" }, { value: "ask-every-time", label: "Ask every time" }, { value: "last-used", label: "Last used" }]} onChange={(value) => setSetting("defaultServerBehavior", value, "Server behavior updated.")} />
          </SettingRow>
          <SettingRow title="Show server switcher" description="Allow manual server switching.">
            <ToggleSwitch checked={settings.enableServerSwitcher} onChange={(checked) => setSetting("enableServerSwitcher", checked, "Server switcher updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Show report provider button" description="Allow provider reports from the player.">
            <ToggleSwitch checked={settings.featureToggles.providerReports} onChange={(checked) => setFeatureToggle("providerReports", checked)} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Show TV/Mirror button" description="Show screen mirroring controls.">
            <ToggleSwitch checked={settings.showTvMirrorButton} onChange={(checked) => setSetting("showTvMirrorButton", checked, "TV mirror button updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Auto fullscreen on play" description="Request fullscreen when playback starts if supported.">
            <ToggleSwitch checked={settings.autoFullscreenOnPlay} onChange={(checked) => setSetting("autoFullscreenOnPlay", checked, "Auto fullscreen updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Remember last provider" description="Reuse the last selected server when possible.">
            <ToggleSwitch checked={settings.rememberLastProvider} onChange={(checked) => setSetting("rememberLastProvider", checked, "Remember provider updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Playback warnings" description="Show risk and compatibility warnings.">
            <ToggleSwitch checked={settings.showPlaybackWarnings} onChange={(checked) => setSetting("showPlaybackWarnings", checked, "Playback warnings updated.")} disabled={isPending} />
          </SettingRow>
        </Section>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section icon={Shield} title="Playback Safety & Compatibility" description="Age gate, risk consent, and compatibility playback controls.">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1rem] border border-white/8 bg-black/22 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Age gate</p>
              <p className="mt-2 text-sm font-semibold text-white">{consentSnapshot.ageGateStatus}</p>
            </div>
            <div className="rounded-[1rem] border border-white/8 bg-black/22 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Risk consent</p>
              <p className="mt-2 text-sm font-semibold text-white">{consentSnapshot.riskConsent}</p>
            </div>
            <div className="rounded-[1rem] border border-white/8 bg-black/22 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Under-13 suspension</p>
              <p className="mt-2 text-sm font-semibold text-white">{consentSnapshot.under13Suspended ? "Active" : "Not active"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                resetPlaybackSafetyConsent();
                refreshConsentSnapshot();
                toast.success("Playback safety consent reset.");
              }}
              className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white"
            >
              Reset consent
            </button>
            <Link href="/safety" className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white">
              Safety page
            </Link>
            <Link href="/terms" className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white">
              Terms page
            </Link>
            <Link href="/privacy" className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white">
              Privacy page
            </Link>
            <Link href="/contact" className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white">
              Contact page
            </Link>
          </div>
          <SettingRow title="Show playback warning" description="Show playback warning and consent before third-party providers.">
            <ToggleSwitch checked={settings.showPlaybackWarnings} onChange={(checked) => setSetting("showPlaybackWarnings", checked, "Playback warning updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="Under-13 safe page" description="Keep the under-13 safer exit flow enabled.">
            <ToggleSwitch checked={settings.under13SafePageEnabled} onChange={(checked) => setSetting("under13SafePageEnabled", checked, "Under-13 page setting updated.")} disabled={isPending} />
          </SettingRow>
          <SettingRow title="SAFE_MODE" description="Strict mode watches links, popups, redirects, and overlay traps.">
            <ToggleSwitch
              checked={settings.safeMode}
              onChange={(checked) => setSetting("safeMode", checked, "Safe mode updated.")}
              disabled={isPending}
            />
          </SettingRow>
          <SettingRow
            title="Popup blocker strictness"
            description="Low only blocks known bad domains. High is more cautious around new-window behavior."
          >
            <SelectSetting
              value={settings.popupBlockerStrictness}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
              onChange={(value) => setSetting("popupBlockerStrictness", value, "Popup strictness updated.")}
            />
          </SettingRow>
          <SettingRow title="Prefer standard servers" description="Try standard providers before compatibility providers when both are available.">
            <ToggleSwitch
              checked={settings.avoidLimitedProtectionServers}
              onChange={(checked) => setSetting("avoidLimitedProtectionServers", checked, "Server preference updated.")}
              disabled={isPending}
            />
          </SettingRow>
        </Section>

        <Section icon={Film} title="Playback" description="Player defaults, recommendations, and embed quality.">
          <SettingRow title="Recommendation system" description="Use local views, clicks, saves, filters, and searches to personalize rows.">
            <ToggleSwitch
              checked={settings.recommendationsEnabled}
              onChange={(checked) => setSetting("recommendationsEnabled", checked, "Recommendations updated.")}
              disabled={isPending}
            />
          </SettingRow>
          <SettingRow title="Autoplay" description="Start playback automatically when the selected provider supports it.">
            <ToggleSwitch
              checked={settings.autoplayPlayback}
              onChange={(checked) => setSetting("autoplayPlayback", checked, "Autoplay updated.")}
              disabled={isPending}
            />
          </SettingRow>
          <SettingRow title="Embed quality mode" description="Choose how provider embeds should balance quality and bandwidth.">
            <SelectSetting
              value={settings.embedQualityMode}
              options={[
                { value: "auto", label: "Auto" },
                { value: "data-saver", label: "Data saver" },
                { value: "high", label: "High quality" },
              ]}
              onChange={(value) => setSetting("embedQualityMode", value, "Embed quality updated.")}
            />
          </SettingRow>
          <SettingRow title="Poster quality" description="Controls catalog artwork quality across the app.">
            <SelectSetting
              value={settings.posterQuality}
              options={[
                { value: "balanced", label: "Balanced" },
                { value: "high", label: "High quality" },
                { value: "data-saver", label: "Data saver" },
              ]}
              onChange={(value) => setSetting("posterQuality", value, "Poster quality updated.")}
            />
          </SettingRow>
        </Section>
      </div>

      <Section
        icon={Database}
        title="Providers"
        description={`${enabledBuiltInCount} built-in provider${enabledBuiltInCount === 1 ? "" : "s"} enabled. Custom providers are stored locally and are not treated as built-in safe providers.`}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {GRUBX_PROVIDERS.map((provider) => {
            const unavailable = !provider.enabled;
            const label =
              provider.safety === "standard"
                ? "Standard"
                : provider.safety === "reported"
                  ? "Reported by users"
                  : "Compatibility";
            return (
              <SettingRow
                key={provider.id}
                title={`${provider.name} - ${label}`}
                description={provider.notes ?? provider.baseUrl}
              >
                <ToggleSwitch
                  checked={!unavailable && settings.providerSettings[provider.id] !== false}
                  onChange={(checked) => setProviderEnabled(provider.id, checked)}
                  disabled={isPending || unavailable}
                />
              </SettingRow>
            );
          })}
        </div>

        <form onSubmit={addCustomProvider} className="mt-5 rounded-[1rem] border border-white/8 bg-black/22 p-4">
          <h3 className="text-base font-semibold text-white">Add custom provider</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Use placeholders like {"{id}"}, {"{season}"}, and {"{episode}"}. Custom providers do not include built-in ad/popup review yet.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              required
              placeholder="Provider name"
              className="min-h-11 rounded-full border border-white/10 bg-black/45 px-4 text-sm text-white outline-none placeholder:text-[var(--muted)]"
            />
            <input
              value={customBaseUrl}
              onChange={(event) => setCustomBaseUrl(event.target.value)}
              required
              placeholder="https://example.com"
              className="min-h-11 rounded-full border border-white/10 bg-black/45 px-4 text-sm text-white outline-none placeholder:text-[var(--muted)]"
            />
            <input
              value={customPattern}
              onChange={(event) => setCustomPattern(event.target.value)}
              required
              placeholder="https://example.com/embed/movie/{id}"
              className="min-h-11 rounded-full border border-white/10 bg-black/45 px-4 text-sm text-white outline-none placeholder:text-[var(--muted)]"
            />
          </div>
          <button
            type="submit"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black transition hover:brightness-95"
          >
            <Plus className="size-4" />
            Add provider
          </button>
        </form>

        {settings.customProviders.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {settings.customProviders.map((provider) => (
              <div key={provider.id} className="rounded-[1rem] border border-white/8 bg-black/22 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{provider.name}</h3>
                    <p className="mt-1 break-all text-sm text-[var(--muted)]">{provider.embedUrlPattern}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ToggleSwitch
                      checked={provider.enabled}
                      onChange={(checked) => updateCustomProvider(provider.id, { enabled: checked })}
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomProvider(provider.id)}
                      className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-white/6 text-[var(--muted)] transition hover:text-white"
                      aria-label="Remove custom provider"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Section>

      <Section icon={Bug} title="Data & Sync / Admin" description="Safe diagnostics and local data tools. Secrets and webhook URLs are never shown here.">
        <div className="grid gap-3 md:grid-cols-2">
          <SettingRow title="Show build/version info" description="Show local build information in admin panels.">
            <ToggleSwitch
              checked={settings.showBuildInfo}
              onChange={(checked) => setSetting("showBuildInfo", checked, "Build info visibility updated.")}
              disabled={isPending}
            />
          </SettingRow>
          <SettingRow title="Show update status" description="Show update status fields for debugging only.">
            <ToggleSwitch
              checked={settings.showUpdateStatus}
              onChange={(checked) => setSetting("showUpdateStatus", checked, "Update status visibility updated.")}
              disabled={isPending}
            />
          </SettingRow>
        </div>
        {settings.showBuildInfo ? (
          <div className="rounded-[1rem] border border-white/8 bg-black/22 px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            <p className="font-semibold text-white">GrubX local build</p>
            <p>Next.js app router build. Settings are stored locally on this device.</p>
            {settings.showUpdateStatus ? <p>Update status: manual deployment controls only.</p> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem(WATCHLIST_STORAGE_KEY);
              queryClient.setQueryData(queryKeys.watchlist, []);
              toast.success("Watchlist cleared.");
            }}
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white"
          >
            Clear watchlist
          </button>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
              queryClient.setQueryData(queryKeys.continueWatching, []);
              toast.success("Continue watching cleared.");
            }}
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white"
          >
            Clear continue watching
          </button>
          <button
            type="button"
            onClick={resetProviderPreferences}
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white"
          >
            Clear provider preferences
          </button>
          <button
            type="button"
            onClick={testMatrixFeedback}
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white"
          >
            Test Matrix feedback
          </button>
          <button
            type="button"
            onClick={testProviderReport}
            disabled={!settings.featureToggles.providerReports}
            className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Test provider report
          </button>
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="inline-flex min-h-11 items-center rounded-full border border-red-300/20 bg-red-500/10 px-5 text-sm font-semibold text-red-100"
          >
            Clear local GrubX data
          </button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1rem] border border-white/8 bg-black/22 p-4">
            <h3 className="text-base font-semibold text-white">Export settings JSON</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Copy your local settings for backup or transfer.</p>
            <button
              type="button"
              onClick={exportCurrentSettings}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black"
            >
              <Download className="size-4" />
              Export settings
            </button>
            {exportedSettings ? (
              <textarea
                readOnly
                value={exportedSettings}
                rows={8}
                className="mt-4 w-full resize-y rounded-[0.95rem] border border-white/10 bg-black/45 px-4 py-3 text-xs leading-5 text-white outline-none"
              />
            ) : null}
          </div>
          <div className="rounded-[1rem] border border-white/8 bg-black/22 p-4">
            <h3 className="text-base font-semibold text-white">Import settings JSON</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">Paste exported settings. Invalid or old fields are safely ignored.</p>
            <textarea
              value={importSettingsJson}
              onChange={(event) => setImportSettingsJson(event.target.value)}
              rows={8}
              placeholder='{"featureToggles":{"movies":true}}'
              className="mt-4 w-full resize-y rounded-[0.95rem] border border-white/10 bg-black/45 px-4 py-3 text-xs leading-5 text-white outline-none placeholder:text-[var(--muted)]"
            />
            <button
              type="button"
              onClick={importSettings}
              disabled={!importSettingsJson.trim()}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="size-4" />
              Import settings
            </button>
          </div>
        </div>
      </Section>

      {confirmClearOpen ? (
        <div className="fixed inset-0 z-[500] grid place-items-center bg-black/78 px-4 backdrop-blur-xl">
          <div className="liquid-glass max-w-lg rounded-[1.25rem] p-5 shadow-2xl">
            <h2 className="text-2xl font-bold text-white">Clear All Cache & Data?</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              This clears localStorage, sessionStorage, cached responses, watchlist, continue watching, settings, and recommendation history on this device.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="min-h-11 rounded-full border border-white/10 bg-white/6 px-5 text-sm font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await clearAllData();
                    queryClient.clear();
                    queryClient.setQueryData(queryKeys.watchlist, []);
                    queryClient.setQueryData(queryKeys.continueWatching, []);
                    setConfirmClearOpen(false);
                    toast.success("Local cache and data cleared.");
                  })
                }
                className="min-h-11 rounded-full bg-red-200 px-5 text-sm font-bold text-black"
              >
                Clear everything
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
