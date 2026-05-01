import { notFound } from "next/navigation";

import { GrubXEmbedFrame } from "@/components/grubx/GrubXEmbedFrame";

const MEDIA_ID_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/;

const readPositiveNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export default async function GrubXTVEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string; id: string; season: string; episode: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { provider, id, season, episode } = await params;
  const seasonNumber = readPositiveNumber(season);
  const episodeNumber = readPositiveNumber(episode);

  if (!MEDIA_ID_PATTERN.test(id) || !seasonNumber || !episodeNumber) {
    notFound();
  }

  return (
    <GrubXEmbedFrame
      provider={provider}
      type="tv"
      id={id}
      season={seasonNumber}
      episode={episodeNumber}
      searchParams={await searchParams}
    />
  );
}
