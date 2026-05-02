"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type RouteValidationIssue = {
  route: string;
  message: string;
  detail?: string;
};

const REQUIRED_ROUTE_LABELS: Record<string, string> = {
  "/": "Home",
  "/movies": "Movies",
  "/tv": "TV",
  "/live": "Live Sports",
  "/youtube": "YouTube",
  "/spotify": "Spotify",
  "/tiktok": "TikTok",
  "/ai": "AI Server",
  "/search": "Search",
  "/settings": "Settings",
};

const getRequiredRouteLabel = (pathname: string) => {
  const match = Object.keys(REQUIRED_ROUTE_LABELS)
    .sort((left, right) => right.length - left.length)
    .find((route) => (route === "/" ? pathname === "/" : pathname.startsWith(route)));
  return match ? REQUIRED_ROUTE_LABELS[match] : "Route";
};

export function useRouteValidation(onIssue?: (issue: RouteValidationIssue) => void) {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const report = (issue: RouteValidationIssue) => {
      console.error("[GrubX route validation]", issue);
      onIssue?.(issue);
    };

    const timeout = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      const main = document.querySelector("main");
      const visibleText = main?.textContent?.trim() ?? "";
      const routeLabel = getRequiredRouteLabel(pathname);

      if (!main) {
        report({ route: pathname, message: `${routeLabel} did not mount a main view.` });
        return;
      }

      if (visibleText.length === 0 && main.querySelectorAll("img, iframe, video, canvas").length === 0) {
        report({ route: pathname, message: `${routeLabel} rendered an empty screen.` });
      }
    }, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [onIssue, pathname]);

  useEffect(() => {
    const reportRuntimeError = (message: string, detail?: string) => {
      const issue = { route: pathname, message, detail };
      console.error("[GrubX runtime validation]", issue);
      onIssue?.(issue);
    };

    const onError = (event: ErrorEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "IFRAME") {
        reportRuntimeError("An embed failed to load.", (target as HTMLIFrameElement).src);
        return;
      }

      reportRuntimeError("A route component threw an error.", event.message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportRuntimeError("A route request failed.", event.reason instanceof Error ? event.reason.message : String(event.reason));
    };

    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [onIssue, pathname]);
}
