"use client";

import { useEffect, useEffectEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { registerGrubXEventBridge } from "@/lib/grubx/events";
import { useSafeBrowsing } from "@/lib/safeBrowsing";
import { useSettingsContext } from "@/context/SettingsContext";
import { useRouteValidation } from "@/hooks/useRouteValidation";

export function AppBootstrap() {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, settings } = useSettingsContext();

  const notifySafeBrowsingBlock = useEffectEvent((message: string) => {
    toast.warning("Safe browsing blocked a risky action", {
      description: message,
      duration: 3200,
    });
  });

  const notifyRouteIssue = useEffectEvent((issue: { message: string; detail?: string }) => {
    toast.error("Route issue detected", {
      description: issue.detail ? `${issue.message} ${issue.detail}` : issue.message,
      duration: 4200,
    });
  });

  useSafeBrowsing({
    enabled: ready,
    safeMode: settings.safeMode,
    strictness: settings.popupBlockerStrictness,
    onBlock: notifySafeBrowsingBlock,
  });

  useRouteValidation((issue) => {
    if (ready) {
      notifyRouteIssue(issue);
    }
  });

  const registerServiceWorker = useEffectEvent(async () => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (!settings.offlineCaching) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      return;
    }

    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  });

  useEffect(() => {
    if (!ready) {
      return;
    }

    return registerGrubXEventBridge((payload) => {
      if (payload.data.event === "popupToggle") {
        toast.message("Player popup state changed", {
          description: `${payload.provider} reported a popup state update.`,
          duration: 2400,
        });
      }
    });
  }, [ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    void registerServiceWorker();
  }, [ready, registerServiceWorker, settings.offlineCaching]);

  useEffect(() => {
    if (!ready || !settings.prefetchRoutes) {
      return;
    }

    ["/", "/movies", "/tv", "/live", "/youtube", "/spotify", "/tiktok", "/ai", "/search", "/settings"].forEach((href) => router.prefetch(href));
  }, [ready, router, settings.prefetchRoutes]);

  useEffect(() => {
    if (!ready || !settings.autoFocusSearch) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        if (pathname !== "/search") {
          router.push("/search?focus=1");
          return;
        }

        window.dispatchEvent(new Event("grubx:focus-search"));
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, ready, router, settings.autoFocusSearch]);

  return null;
}
