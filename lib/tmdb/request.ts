import "server-only";

import { env } from "@/lib/env";

type AllowedPathRule = {
  pattern: RegExp;
  ttlSeconds: number;
  params: readonly string[];
};

const ALLOWED_TMDB_RULES: AllowedPathRule[] = [
  {
    pattern: /^\/trending\/all\/day$/,
    ttlSeconds: 300,
    params: [],
  },
  {
    pattern: /^\/search\/(movie|tv)$/,
    ttlSeconds: 180,
    params: ["query", "page"],
  },
  {
    pattern: /^\/discover\/(movie|tv)$/,
    ttlSeconds: 300,
    params: ["with_genres", "page", "sort_by"],
  },
  {
    pattern: /^\/(movie|tv)\/(popular|top_rated)$/,
    ttlSeconds: 300,
    params: ["page"],
  },
  {
    pattern: /^\/(movie|tv)\/\d+$/,
    ttlSeconds: 1800,
    params: ["append_to_response"],
  },
  {
    pattern: /^\/(movie|tv)\/\d+\/videos$/,
    ttlSeconds: 1800,
    params: [],
  },
  {
    pattern: /^\/tv\/\d+\/season\/\d+$/,
    ttlSeconds: 1800,
    params: [],
  },
  {
    pattern: /^\/genre\/(movie|tv)\/list$/,
    ttlSeconds: 86400,
    params: [],
  },
];

const RESERVED_PREFIXES = ["//", "/\\", "/.", "/.."];

const sanitizePath = (rawPath: string) => {
  const path = rawPath.trim();
  if (
    path.length === 0 ||
    !path.startsWith("/") ||
    path.includes("://") ||
    path.includes("\\") ||
    path.includes("..") ||
    RESERVED_PREFIXES.some((prefix) => path.startsWith(prefix))
  ) {
    throw new Error("Unsupported TMDB path.");
  }

  const rule = ALLOWED_TMDB_RULES.find((candidate) => candidate.pattern.test(path));
  if (!rule) {
    throw new Error("TMDB path is not allowlisted.");
  }

  return { path, rule };
};

export const getTmdbRouteConfig = (rawPath: string) => sanitizePath(rawPath);

export const buildTmdbUrl = (
  path: string,
  params: Record<string, string | number | undefined>,
  allowedParams: readonly string[],
) => {
  const { path: safePath } = sanitizePath(path);
  const url = new URL(`${env.tmdbProxyBase.replace(/\/$/, "")}${safePath}`);

  url.searchParams.set("api_key", env.tmdbApiKey);

  allowedParams.forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

export const fetchTmdbJson = async <T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  revalidateSeconds?: number,
) => {
  const { rule } = sanitizePath(path);
  const response = await fetch(buildTmdbUrl(path, params, rule.params), {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: revalidateSeconds ?? rule.ttlSeconds },
    redirect: "error",
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status} ${path}`);
  }

  return {
    payload: (await response.json()) as T,
    ttlSeconds: revalidateSeconds ?? rule.ttlSeconds,
  };
};
