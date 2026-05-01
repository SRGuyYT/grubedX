import { NextResponse } from "next/server";

import packageJson from "../../../package.json";
import { buildEdgeCacheHeaders } from "@/lib/http/cache";

const REPO_URL = "https://github.com/SRGuyYT/GrubX";
const TAGS_URL = "https://api.github.com/repos/SRGuyYT/GrubX/tags?per_page=20";

type RepoTag = {
  name?: string;
};

const normalizeVersion = (input: string | undefined | null) => {
  if (!input) {
    return null;
  }

  const cleaned = input.trim().replace(/^v/i, "");
  if (/^\d+$/.test(cleaned)) {
    return `${cleaned}.0.0`;
  }

  if (/^\d+\.\d+$/.test(cleaned)) {
    return `${cleaned}.0`;
  }

  if (/^\d+\.\d+\.\d+$/.test(cleaned)) {
    return cleaned;
  }

  return null;
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

export async function GET() {
  const currentVersion = normalizeVersion(packageJson.version) ?? "4.0.0";

  try {
    const response = await fetch(TAGS_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "GrubX-Updater",
      },
      next: { revalidate: 60 * 60 },
      redirect: "error",
    });

    if (!response.ok) {
      throw new Error(`GitHub tags request failed with ${response.status}.`);
    }

    const tags = (await response.json()) as RepoTag[];
    const versions = tags
      .map((tag) => normalizeVersion(tag.name))
      .filter((version): version is string => Boolean(version))
      .sort((left, right) => compareSemver(right, left));

    const latestVersion = versions[0] ?? currentVersion;
    const hasUpdate = compareSemver(latestVersion, currentVersion) > 0;
    const compareUrl = hasUpdate
      ? `${REPO_URL}/compare/v${currentVersion}...v${latestVersion}`
      : `${REPO_URL}/tree/main`;

    return NextResponse.json(
      {
        currentVersion,
        latestVersion,
        hasUpdate,
        checkedAt: new Date().toISOString(),
        repoUrl: REPO_URL,
        compareUrl,
        error: null,
      },
      {
        headers: buildEdgeCacheHeaders(60 * 60, 60 * 60 * 24),
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        currentVersion,
        latestVersion: null,
        hasUpdate: false,
        checkedAt: new Date().toISOString(),
        repoUrl: REPO_URL,
        compareUrl: `${REPO_URL}/tree/main`,
        error: error instanceof Error ? error.message : "Update check failed.",
      },
      {
        headers: buildEdgeCacheHeaders(60 * 15, 60 * 60),
        status: 200,
      },
    );
  }
}
