"use client";

import type { IframeHTMLAttributes } from "react";

export function ExternalEmbedFrame({
  src,
  title,
  className,
  allow,
  referrerPolicy = "no-referrer",
  onLoad,
  onError,
}: {
  src: string;
  title: string;
  className?: string;
  allow?: string;
  referrerPolicy?: IframeHTMLAttributes<HTMLIFrameElement>["referrerPolicy"];
  onLoad?: () => void;
  onError?: () => void;
}) {
  return (
    <iframe
      src={src}
      title={title}
      className={className ?? "h-full w-full"}
      allow={allow ?? "fullscreen; picture-in-picture; encrypted-media; autoplay; clipboard-write; web-share; presentation"}
      allowFullScreen
      referrerPolicy={referrerPolicy}
      onLoad={onLoad}
      onError={onError}
    />
  );
}
