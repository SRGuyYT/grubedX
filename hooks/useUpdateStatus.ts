"use client";

import { useQuery } from "@tanstack/react-query";

import { dataLayer } from "@/lib/dataLayer";
import { queryKeys } from "@/lib/queryKeys";

export type UpdateStatus = {
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
  checkedAt: string | null;
  repoUrl: string;
  compareUrl: string | null;
  error: string | null;
  dismissedVersion: string | null;
};

const compareSemver = (left: string, right: string) => {
  const leftParts = left.split(".").map((part) => Number(part));
  const rightParts = right.split(".").map((part) => Number(part));
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
};

export const useUpdateStatus = (enabled = true) =>
  useQuery<UpdateStatus>({
    queryKey: queryKeys.updateStatus,
    enabled,
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const stored = await dataLayer.loadUpdaterState();

      try {
        const response = await fetch("/api/update", {
          credentials: "same-origin",
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as Partial<UpdateStatus>;
        if (!response.ok || typeof payload.currentVersion !== "string") {
          throw new Error(typeof payload.error === "string" ? payload.error : "Updater status could not be loaded.");
        }

        await dataLayer.saveUpdaterState({
          lastCheckedAt: payload.checkedAt ?? new Date().toISOString(),
          latestVersion: payload.latestVersion ?? null,
          lastError: null,
        });

        return {
          currentVersion: payload.currentVersion,
          latestVersion: payload.latestVersion ?? null,
          hasUpdate: Boolean(payload.hasUpdate),
          checkedAt: payload.checkedAt ?? new Date().toISOString(),
          repoUrl: payload.repoUrl ?? "https://github.com/SRGuyYT/GrubX",
          compareUrl: payload.compareUrl ?? null,
          error: null,
          dismissedVersion: stored.dismissedVersion,
        };
      } catch (error) {
        const currentVersion = "4.0.0";
        const latestVersion = stored.latestVersion;

        await dataLayer.saveUpdaterState({
          lastError: error instanceof Error ? error.message : "Update check failed.",
        });

        return {
          currentVersion,
          latestVersion,
          hasUpdate:
            typeof latestVersion === "string" ? compareSemver(latestVersion, currentVersion) > 0 : false,
          checkedAt: stored.lastCheckedAt,
          repoUrl: "https://github.com/SRGuyYT/GrubX",
          compareUrl:
            typeof latestVersion === "string"
              ? `https://github.com/SRGuyYT/GrubX/compare/v${currentVersion}...v${latestVersion}`
              : null,
          error: error instanceof Error ? error.message : "Update check failed.",
          dismissedVersion: stored.dismissedVersion,
        };
      }
    },
  });
