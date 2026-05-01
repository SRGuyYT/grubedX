import { notFound } from "next/navigation";

import { GrubXEmbedFrame } from "@/components/grubx/GrubXEmbedFrame";

const MEDIA_ID_PATTERN = /^[A-Za-z0-9._:-]{1,180}$/;

export default async function GrubXMovieEmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { provider, id } = await params;
  if (!MEDIA_ID_PATTERN.test(id)) {
    notFound();
  }

  return (
    <GrubXEmbedFrame
      provider={provider}
      type="movie"
      id={id}
      searchParams={await searchParams}
    />
  );
}
