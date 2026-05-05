"use client";

import type { IframeHTMLAttributes } from "react";

export function ExternalEmbedFrame({
  src,
  title,
  className,
  allow,
  referrerPolicy = "strict-origin-when-cross-origin",
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
      allow={allow ?? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"}
      allowFullScreen
      referrerPolicy={referrerPolicy}
      onLoad={onLoad}
      onError={onError}
    />
  );
}
