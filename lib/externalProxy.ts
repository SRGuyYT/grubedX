const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export function proxiedServerUrl(proxyEnvName: string, fallbackUrl: string) {
  return proxiedServerUrlAny([proxyEnvName], fallbackUrl);
}

export function proxiedServerUrlAny(proxyEnvNames: string[], fallbackUrl: string) {
  const proxyBase = proxyEnvNames.map((name) => process.env[name]?.trim()).find(Boolean);
  if (!proxyBase) {
    return fallbackUrl;
  }

  try {
    const fallback = new URL(fallbackUrl);
    const proxy = new URL(trimTrailingSlash(proxyBase));
    const joinedPath = `${proxy.pathname.replace(/\/$/, "")}${fallback.pathname}`.replace(/\/{2,}/g, "/");
    proxy.pathname = joinedPath;
    proxy.search = fallback.search;
    return proxy.toString();
  } catch {
    return fallbackUrl;
  }
}

export function publicBaseUrl(value: string | undefined, fallbackBase: string) {
  return trimTrailingSlash(value?.trim() || fallbackBase);
}
