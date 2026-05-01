import { LoaderCircle } from "lucide-react";

export function LoadingState({
  title = "Loading",
  description = "Building the next frame.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[280px] w-full max-w-3xl flex-col items-center justify-center rounded-[1rem] border border-white/8 bg-white/[0.035] px-8 py-16 text-center">
      <LoaderCircle className="mb-4 size-10 animate-spin text-[var(--accent)]" />
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}
