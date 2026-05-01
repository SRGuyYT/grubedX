import { HeroCarousel } from "@/components/hero/HeroCarousel";
import { MediaRow } from "@/components/media/MediaRow";
import { ContinueWatchingRow } from "@/components/user/ContinueWatchingRow";
import { WatchlistRow } from "@/components/user/WatchlistRow";
import { getServerMediaPage, getTrendingHero } from "@/lib/tmdb/server";

export const revalidate = 300;

export default async function HomePage() {
  const [hero, popularMovies, popularTv, topRatedMovies] = await Promise.all([
    getTrendingHero(),
    getServerMediaPage({ mediaType: "movie", category: "popular" }),
    getServerMediaPage({ mediaType: "tv", category: "popular" }),
    getServerMediaPage({ mediaType: "movie", category: "top_rated" }),
  ]);

  return (
    <div className="space-y-10 pb-14 md:space-y-12">
      <HeroCarousel items={hero.results.slice(0, 5)} />

      <div className="page-shell space-y-10 md:space-y-12">
        <ContinueWatchingRow />
        <WatchlistRow />
        <MediaRow
          title="Trending Now"
          description="Fresh picks people are opening tonight."
          items={hero.results.slice(1, 9)}
        />
        <MediaRow
          title="Popular Movies"
          description="Big-screen films with momentum."
          items={popularMovies.results.slice(0, 10)}
        />
        <MediaRow
          title="Popular TV"
          description="Series worth adding to your queue."
          items={popularTv.results.slice(0, 10)}
        />
        <MediaRow
          title="Top Rated"
          description="Critic and audience favorites with staying power."
          items={topRatedMovies.results.slice(0, 10)}
        />
      </div>
    </div>
  );
}
