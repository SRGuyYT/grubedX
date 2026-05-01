import Image from "next/image";
import { CalendarDays, Clock3, Layers3, Star } from "lucide-react";
import { notFound } from "next/navigation";

import { TitleActions } from "@/components/media/TitleActions";
import { getServerMediaDetails } from "@/lib/tmdb/server";
import type { MediaType } from "@/types/media";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mediaType: string; id: string }>;
}) {
  const { mediaType, id } = await params;
  if (mediaType !== "movie" && mediaType !== "tv") {
    return { title: "GrubX" };
  }

  try {
    const media = await getServerMediaDetails(mediaType, id);
    return {
      title: `${media.title} | GrubX`,
      description: media.overview,
    };
  } catch {
    return { title: "GrubX" };
  }
}

export default async function TitlePage({
  params,
}: {
  params: Promise<{ mediaType: string; id: string }>;
}) {
  const { mediaType, id } = await params;
  if (mediaType !== "movie" && mediaType !== "tv") {
    notFound();
  }

  let media;
  try {
    media = await getServerMediaDetails(mediaType as MediaType, id);
  } catch {
    notFound();
  }

  return (
    <div className="pb-14">
      <section className="relative -mt-[calc(4.75rem+env(safe-area-inset-top))] overflow-hidden border-b border-white/8 md:-mt-[calc(5.5rem+env(safe-area-inset-top))]">
        <div className="absolute inset-0">
          <Image
            src={
              media.backdropPath
                ? `https://image.tmdb.org/t/p/original${media.backdropPath}`
                : media.posterPath
                  ? `https://image.tmdb.org/t/p/original${media.posterPath}`
                  : "/opengraph.jpg"
            }
            alt={media.title}
            fill
            priority
            sizes="100vw"
            className="scale-[1.02] object-cover object-center brightness-[0.58]"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/78 to-black/12" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030304] via-[#030304a8] to-black/36" />

        <div className="page-shell relative z-10 flex min-h-[78vh] items-end py-16 pt-32 md:py-20 md:pt-36">
          <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr),260px] lg:items-end xl:grid-cols-[minmax(0,1fr),300px]">
              <div className="max-w-3xl flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--accent)]">{media.mediaType}</p>
                <h1 className="mt-4 text-5xl font-bold leading-none text-white sm:text-6xl md:text-7xl">{media.title}</h1>
                {media.tagline ? <p className="mt-4 text-xl text-white/80">{media.tagline}</p> : null}

                <div className="mt-6 flex flex-wrap items-center gap-2 text-sm font-semibold text-white/82">
                  {media.rating ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/42 px-3 py-1.5 backdrop-blur-md">
                      <Star className="size-4 fill-[var(--accent)] text-[var(--accent)]" />
                      {media.rating.toFixed(1)}
                    </span>
                  ) : null}
                  {media.releaseDate ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/42 px-3 py-1.5 backdrop-blur-md">
                      <CalendarDays className="size-4" />
                      {new Date(media.releaseDate).getFullYear()}
                    </span>
                  ) : null}
                  {media.runtime ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/42 px-3 py-1.5 backdrop-blur-md">
                      <Clock3 className="size-4" />
                      {Math.floor(media.runtime / 60) > 0 ? `${Math.floor(media.runtime / 60)}h ` : ""}
                      {media.runtime % 60 > 0 ? `${media.runtime % 60}m` : ""}
                    </span>
                  ) : null}
                  {media.totalSeasons ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/42 px-3 py-1.5 backdrop-blur-md">
                      <Layers3 className="size-4" />
                      {media.totalSeasons} seasons
                    </span>
                  ) : null}
                </div>

                <p className="mt-7 max-w-3xl text-base font-medium leading-8 text-white/74">{media.overview}</p>

                <div className="mt-8">
                  <TitleActions media={media} />
                </div>
              </div>

              <div className="mx-auto hidden w-full max-w-[300px] shrink-0 overflow-hidden rounded-[1.15rem] border border-white/10 bg-black/35 p-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.28)] sm:block lg:mx-0">
                <div className="relative aspect-[2/3] overflow-hidden rounded-[0.82rem]">
                  <Image
                    src={media.posterPath ? `https://image.tmdb.org/t/p/w500${media.posterPath}` : "/512x512.png"}
                    alt={media.title}
                    fill
                    sizes="248px"
                    className="object-cover"
                  />
                </div>
              </div>
          </div>
        </div>
      </section>

      <section className="page-shell grid gap-6 py-8 md:gap-8 md:py-12 xl:py-14 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.035] px-5 py-5 md:px-6 md:py-6">
          <h2 className="text-2xl font-bold">Cast</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {media.cast.map((person) => (
              <div key={`${person.name}-${person.character}`} className="rounded-[0.9rem] border border-white/8 bg-black/24 px-4 py-4">
                <p className="text-base font-semibold">{person.name}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{person.character}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-7">
          <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.035] px-5 py-5 md:px-6 md:py-6">
            <h2 className="text-2xl font-bold">Genres</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {media.genres.map((genre) => (
                <span key={genre.id} className="rounded-full border border-white/10 bg-white/6 px-4 py-2.5 text-sm font-semibold text-[var(--muted)]">
                  {genre.name}
                </span>
              ))}
            </div>
          </div>

          {media.seasons.length > 0 ? (
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.035] px-5 py-5 md:px-6 md:py-6">
              <h2 className="text-2xl font-bold">Seasons</h2>
              <div className="mt-5 space-y-3">
                {media.seasons.map((season) => (
                  <div key={season.seasonNumber} className="rounded-[0.9rem] border border-white/8 bg-black/24 px-4 py-4">
                    <p className="text-base font-semibold">{season.name}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{season.episodeCount} episodes</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
