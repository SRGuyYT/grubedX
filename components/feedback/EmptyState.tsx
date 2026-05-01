import { FolderOpenDot } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[1rem] border border-white/8 bg-white/[0.035] px-8 py-12 text-center">
      <FolderOpenDot className="mb-4 size-10 text-[var(--accent)]" />
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}
