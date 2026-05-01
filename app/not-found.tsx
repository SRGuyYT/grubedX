import Link from "next/link";
import { Compass, Home, Search } from "lucide-react";

import { AppShell } from "@/components/shell/AppShell";
import { ContinueWatchingRow } from "@/components/user/ContinueWatchingRow";
import { NotFoundTrending } from "@/components/system/NotFoundTrending";
import { getTrendingHero } from "@/lib/tmdb/server";

export default async function NotFound() {
  const trending = await getTrendingHero();

  return (
    <AppShell>
      <div className="space-y-12 pb-14">
        <section className="page-shell py-8 md:py-12">
          <div className="liquid-glass relative overflow-hidden rounded-[2.4rem] px-6 py-10 md:px-10 md:py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,106,61,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(101,137,255,0.16),transparent_28%)]" />
            <div className="relative z-10 max-w-3xl">
              <p className="text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Lost in the catalog</p>
              <h1 className="mt-3 text-4xl font-semibold md:text-6xl">We couldn&apos;t find that page</h1>
              <p className="mt-5 text-base leading-8 text-[var(--muted)]">
                Try a fresh search, jump back to the main routes, or pick up where you left off.
              </p>

              <form action="/search" className="mt-7">
                <div className="liquid-glass-soft flex items-center gap-3 rounded-[1.7rem] px-5 py-4">
                  <Search className="size-4 text-[var(--muted)]" />
                  <input
                    autoFocus
                    type="search"
                    name="q"
                    placeholder="Search all movies and TV"
                    className="w-full bg-transparent text-base text-white outline-none placeholder:text-[var(--muted)]"
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
                  >
                    Search
                  </button>
                </div>
              </form>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  <span className="inline-flex items-center gap-2">
                    <Home className="size-4" />
                    Home
                  </span>
                </Link>
                <Link
                  href="/movies"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20"
                >
                  <span className="inline-flex items-center gap-2">
                    <Compass className="size-4" />
                    Movies
                  </span>
                </Link>
                <Link
                  href="/tv"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20"
                >
                  TV
                </Link>
                <Link
                  href="/live"
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20"
                >
                  Live TV
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="page-shell space-y-12">
          <ContinueWatchingRow />
          <NotFoundTrending items={trending.results.slice(0, 10)} />
        </div>
      </div>
    </AppShell>
  );
}
