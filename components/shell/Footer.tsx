export function Footer() {
  return (
    <footer className="page-shell pb-10 pt-14 text-sm text-[var(--muted)]">
      <div className="grid gap-4 rounded-[1rem] border border-white/8 bg-white/[0.03] px-5 py-5 md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em]">Local Queue</p>
          <p className="mt-2 leading-6">Progress, watchlist, and preferences stay on this device.</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em]">Quick Relaunch</p>
          <p className="mt-2 leading-6">The shell stays ready for fast return visits.</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em]">Cinema Mode</p>
          <p className="mt-2 leading-6">A quiet interface built around artwork, playback, and discovery.</p>
        </div>
      </div>
    </footer>
  );
}
