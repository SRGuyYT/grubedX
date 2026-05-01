"use client";

export function ExternalEmbedFrame({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  return (
    <iframe
      src={src}
      title={title}
      className={className ?? "h-full w-full"}
      allow="fullscreen; picture-in-picture; encrypted-media"
      allowFullScreen
      referrerPolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
    />
  );
}
