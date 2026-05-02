import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

export function FeatureDisabledPanel({
  title = "This feature is currently turned off.",
  body = "You can enable it again from Settings.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="page-shell grid min-h-[55dvh] place-items-center py-10">
      <div className="max-w-xl rounded-[1.25rem] border border-white/10 bg-white/[0.035] px-6 py-8 text-center shadow-2xl">
        <span className="mx-auto grid size-12 place-items-center rounded-full border border-white/10 bg-black/34 text-[var(--accent)]">
          <SlidersHorizontal className="size-6" />
        </span>
        <h1 className="mt-5 text-3xl font-bold text-white">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--muted)]">{body}</p>
        <Link
          href="/settings"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-black transition active:scale-[0.98]"
        >
          Open Settings
        </Link>
      </div>
    </section>
  );
}
