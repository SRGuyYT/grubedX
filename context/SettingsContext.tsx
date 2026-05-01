"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { dataLayer } from "@/lib/dataLayer";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { Settings } from "@/types/settings";

type SettingsContextValue = {
  ready: boolean;
  settings: Settings;
  updateSettings(next: Partial<Settings>): Promise<void>;
  resetSettings(): Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const loadedSettings = await dataLayer.loadSettings();
        if (!cancelled) {
          setSettings(loadedSettings);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    const root = document.documentElement;
    root.dataset.theme = settings.uiTheme === "light" ? "light" : settings.amoledMode ? "amoled" : "cinematic-dark";
    root.dataset.grubxTheme = settings.uiTheme;
    root.dataset.cardDensity = settings.compactMode ? "compact" : settings.cardDensity;
    root.dataset.blur = settings.blurStrength;
    root.dataset.largeText = settings.largeText ? "true" : "false";
    root.dataset.audioProfile = settings.audioProfile;

    root.style.setProperty(
      "--app-blur",
      settings.blurStrength === "soft" ? "10px" : settings.blurStrength === "intense" ? "24px" : "16px",
    );
    root.style.setProperty("--card-gap", settings.compactMode || settings.cardDensity === "compact" ? "1rem" : "1.5rem");
    root.style.setProperty("--content-gap", settings.compactMode || settings.cardDensity === "compact" ? "1.5rem" : "2.1rem");
    root.style.setProperty("--text-scale", settings.largeText ? "1.05" : "1");

    if (settings.accentTone === "electric") {
      root.style.setProperty("--accent", "#d8e4ff");
      root.style.setProperty("--accent-soft", "rgba(216, 228, 255, 0.16)");
    } else if (settings.accentTone === "aurora") {
      root.style.setProperty("--accent", "#9ee8d2");
      root.style.setProperty("--accent-soft", "rgba(158, 232, 210, 0.16)");
    } else {
      root.style.setProperty("--accent", "#f2b35a");
      root.style.setProperty("--accent-soft", "rgba(242, 179, 90, 0.17)");
    }
  }, [ready, settings]);

  const value = useMemo<SettingsContextValue>(
    () => ({
      ready,
      settings,
      async updateSettings(next) {
        const persisted = await dataLayer.saveSettings({
          ...settings,
          ...next,
        });
        setSettings(persisted);
      },
      async resetSettings() {
        const persisted = await dataLayer.saveSettings(DEFAULT_SETTINGS);
        setSettings(persisted);
      },
    }),
    [ready, settings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettingsContext must be used inside SettingsProvider.");
  }
  return context;
};
