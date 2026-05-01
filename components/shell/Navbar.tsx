"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpCircle,
  Clapperboard,
  Home,
  Music,
  Music2,
  MonitorPlay,
  Search,
  Settings2,
  Tv,
  Video,
  Youtube,
} from "lucide-react";

import { LiveClock } from "@/components/shell/LiveClock";
import { cn } from "@/lib/cn";
import { useUpdateStatus } from "@/hooks/useUpdateStatus";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
};

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/movies", label: "Movies", icon: Clapperboard },
  { href: "/tv", label: "TV", icon: Tv },
  { href: "/live", label: "Live TV", icon: MonitorPlay },
  { href: "/youtube", label: "YouTube", icon: Youtube },
  { href: "/tiktok", label: "TikTok", icon: Video },
  { href: "/yt-music", label: "YT Music", icon: Music2 },
  { href: "/spotify", label: "Spotify", icon: Music },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

const isActivePath = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

function NavButton({
  item,
  pathname,
  showUpdateDot = false,
}: {
  item: NavItem;
  pathname: string;
  showUpdateDot?: boolean;
}) {
  const Icon = item.icon;
  const active = isActivePath(pathname, item.href);

  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex min-h-11 min-w-0 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full border px-3 py-2.5 text-sm font-semibold transition md:min-h-0 lg:px-3 xl:px-4",
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-black shadow-[0_10px_32px_rgba(242,179,90,0.18)]"
          : "border-transparent text-[var(--muted)] hover:bg-white/8 hover:text-white active:scale-[0.98]",
      )}
    >
      <Icon className="size-4 shrink-0 text-current" />
      <span className="inline whitespace-nowrap md:hidden lg:inline">{item.label}</span>
      {showUpdateDot ? (
        <span className="absolute right-2 top-2 inline-flex size-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_16px_rgba(242,179,90,0.45)]" />
      ) : null}
    </Link>
  );
}

function BrandBlock() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 rounded-full border border-white/10 bg-black/45 px-3 py-2 transition hover:border-white/18 hover:bg-white/8"
    >
      <div className="relative size-9 overflow-hidden rounded-full border border-white/10 bg-black shadow-[0_10px_28px_rgba(0,0,0,0.32)]">
        <Image src="/64x64.png" alt="GrubX" fill sizes="36px" className="object-cover" priority />
      </div>
      <span className="hidden text-sm font-semibold text-white sm:inline">GrubX</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const updateQuery = useUpdateStatus(true);

  const showUpdateDot = useMemo(
    () =>
      Boolean(
        updateQuery.data?.hasUpdate &&
          updateQuery.data.dismissedVersion !== updateQuery.data.latestVersion &&
          updateQuery.data.latestVersion,
      ),
    [updateQuery.data],
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 pointer-events-none">
        <div className="page-shell flex items-center justify-between gap-3 py-4 pointer-events-auto">
          <BrandBlock />

          <nav className="liquid-glass hidden max-w-[calc(100vw-18rem)] items-center gap-1 overflow-x-auto rounded-full p-1.5 md:flex">
            {navItems.map((item) => (
              <NavButton
                key={item.href}
                item={item}
                pathname={pathname}
                showUpdateDot={item.href === "/settings" && showUpdateDot}
              />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/search?focus=1"
              className="liquid-glass-soft hidden items-center justify-between gap-3 rounded-full px-4 py-3 text-sm text-[var(--muted)] transition hover:border-white/15 hover:text-white xl:flex"
            >
              <span className="inline-flex items-center gap-3">
                <Search className="size-4" />
                <span className="hidden xl:inline">Search all titles</span>
              </span>
              <kbd className="keyboard-only rounded-full border border-white/10 px-2 py-1 text-[11px]">/</kbd>
            </Link>

            <div className="hidden lg:block">
              <LiveClock />
            </div>
            {showUpdateDot && updateQuery.data?.latestVersion ? (
              <Link
                href="/settings"
                className="hidden items-center gap-2 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 py-2 text-xs text-white xl:inline-flex"
              >
                <ArrowUpCircle className="size-4 text-[var(--accent)]" />
                Update {updateQuery.data.latestVersion}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/76 px-2 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl md:hidden">
          <nav className="flex w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/6 p-1">
            {navItems.map((item) => (
              <NavButton
                key={item.href}
                item={item}
                pathname={pathname}
                showUpdateDot={item.href === "/settings" && showUpdateDot}
              />
            ))}
          </nav>
        </div>
      </header>
    </>
  );
}
