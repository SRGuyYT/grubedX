import { notFound } from "next/navigation";

import { parsePlaybackOptions } from "@/lib/grubx/params";
import { assertGrubXProvider, resolveGrubXProviderUrl } from "@/lib/grubx/providers";
import type { GrubXMediaType } from "@/types/grubx";

const SAFE_IFRAME_SANDBOX = "allow-scripts allow-same-origin allow-presentation allow-forms";

export function GrubXEmbedFrame({
  provider,
  type,
  id,
  season,
  episode,
  searchParams,
}: {
  provider: string;
  type: GrubXMediaType;
  id: string;
  season?: number;
  episode?: number;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  try {
    const selectedProvider = assertGrubXProvider(provider);
    const source = resolveGrubXProviderUrl(
      selectedProvider.id,
      type,
      id,
      season,
      episode,
      parsePlaybackOptions(searchParams),
    );

    return (
      <iframe
        src={source}
        title={`${selectedProvider.name} ${type} embed`}
        className="h-full w-full"
        allow="fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="no-referrer"
        sandbox={SAFE_IFRAME_SANDBOX}
        style={{ border: 0, width: "100vw", height: "100dvh", display: "block", background: "#000" }}
      />
    );
  } catch {
    notFound();
  }
}
