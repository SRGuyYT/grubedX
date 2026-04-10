export const buildEdgeCacheHeaders = (ttlSeconds: number, staleSeconds = ttlSeconds * 12) => ({
  "Cache-Control": `public, max-age=0, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleSeconds}`,
  "CDN-Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleSeconds}`,
  "Cloudflare-CDN-Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${staleSeconds}`,
  Vary: "Accept-Encoding",
});
