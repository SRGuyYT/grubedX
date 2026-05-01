# GrubX

GrubX is a local-first streaming shell built with Next.js App Router. It focuses on speed, responsive browsing, offline support, and a polished viewing experience across movies, TV, and live sports streams.

## Highlights

- Local-only watchlist, continue watching, settings, and updater state
- Responsive shell:
  - desktop sidebar
  - compact tablet rail
  - mobile top bar + bottom navigation
- Debounced Search All with cached movie and TV results
- Offline-first app shell with a service worker
- Built-in updater that compares your current version with the GrubX GitHub repo
- Popup-sandboxed live sports and controlled external fetches only

## Stack

- Next.js App Router
- React 19
- TypeScript
- React Query
- Tailwind CSS 4

## Environment

Create `.env` from `.env.example`:

```bash
NEXT_PUBLIC_TMDB_PROXY_BASE=https://mtd.sky0cloud.dpdns.org
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_key
NEXT_PUBLIC_VIDKING_BASE=https://www.vidking.net/embed
```

## Scripts

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm dev
pnpm start
```

Or use:

```bash
./manage.sh
```

## Architecture

- `app/` contains the App Router routes and controlled API routes
- `components/` contains shell, media, feedback, settings, and system UI
- `context/SettingsContext.tsx` owns the local settings state
- `lib/dataLayer.ts` is the single local persistence boundary
- `public/sw.js` provides offline-first shell caching
- `app/api/update/route.ts` checks the fixed GitHub repo for newer tags

## Security Notes

- Authentication and Matrix/Firebase bridging are removed temporarily
- The former bridge route is deleted, removing the SSRF surface entirely
- External requests are limited to fixed TMDB, Streamed, VidKing, and GitHub update endpoints
- GitHub Actions workflow permissions are restricted to `contents: read`

## Build Verification

```bash
pnpm typecheck
pnpm build
```
