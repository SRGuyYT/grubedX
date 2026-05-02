import { Bot, ExternalLink } from "lucide-react";

import { ExternalEmbedFrame } from "@/components/media/ExternalEmbedFrame";

const aiServerUrl = process.env.NEXT_PUBLIC_AI_SERVER_URL || "https://xthat.sky0cloud.dpdns.org";

export default function AiServerPage() {
  return (
    <section className="page-shell space-y-6">
      <div className="liquid-glass rounded-[2rem] border border-white/10 p-6 md:p-8">
        <div className="flex items-center gap-3">
          <Bot className="size-5 text-[var(--accent)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">AI Server</p>
        </div>
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold text-white md:text-6xl">GrubX AI Server</h1>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              Open the connected AI server from inside GrubX. If the embedded view is blocked by the server, use the direct launch button.
            </p>
          </div>
          <a
            href={aiServerUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-black transition active:scale-[0.98]"
          >
            <ExternalLink className="size-4" />
            Launch AI Server
          </a>
        </div>
      </div>

      <div className="liquid-glass-soft overflow-hidden rounded-[1.4rem] border border-white/10 bg-black">
        <ExternalEmbedFrame src={aiServerUrl} title="GrubX AI Server" className="h-[72dvh] min-h-[560px] w-full border-0" />
      </div>
    </section>
  );
}
