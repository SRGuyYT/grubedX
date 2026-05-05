"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Bot, Clapperboard, Sparkles, Home, Music, MonitorPlay, Search, Settings2, Tv, Video, Youtube } from "lucide-react";
import { useSettingsContext } from "@/context/SettingsContext";
import { cn } from "@/lib/cn";
import type { FeatureToggles } from "@/types/settings";

type NavItem = { href: string; label: string; icon: typeof Home; feature?: keyof FeatureToggles; external?: boolean };
const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },{ href: "/movies", label: "Movies", icon: Clapperboard, feature: "movies" },{ href: "/tv", label: "TV", icon: Tv, feature: "tv" },{ href: "/live", label: "Live TV", icon: MonitorPlay, feature: "live" },{ href: "/anime", label: "Anime", icon: Sparkles, feature: "anime" },{ href: "/youtube", label: "YouTube", icon: Youtube, feature: "youtube" },{ href: "/spotify", label: "Spotify", icon: Music, feature: "spotify" },{ href: "/tiktok", label: "TikTok", icon: Video, feature: "tiktok" },{ href: "/ai", label: "AI Server", icon: Bot, feature: "aiServer" },{ href: "/search", label: "Search", icon: Search, feature: "search" },{ href: "/settings", label: "Settings", icon: Settings2 },
];
const isActivePath = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export function Navbar() {
  const pathname = usePathname();
  const { settings } = useSettingsContext();
  const [open, setOpen] = useState(false);
  const [playerChromeHidden, setPlayerChromeHidden] = useState(false);

  const effectiveNavStyle = settings.navStyle === "auto" ? "top-bar" : settings.navStyle;
  const effectiveMobileStyle = settings.mobileNavStyle === "auto" ? "drawer" : settings.mobileNavStyle;

  const nav = useMemo(() => {
    const aiServerUrl = settings.aiServerUrl || process.env.NEXT_PUBLIC_AI_SERVER_URL || "https://xthat.sky0cloud.dpdns.org";
    const filtered = navItems.filter((item) => !item.feature || settings.featureToggles[item.feature]);
    return filtered.map((item) => item.feature === "aiServer" && settings.aiOpenMode === "new-tab" ? { ...item, href: aiServerUrl, external: true } : item);
  }, [settings]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPop = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("popstate", onPop); };
  }, []);

  useEffect(() => {
    const isPlayerRoute = pathname.startsWith("/player") || pathname.startsWith("/embed");
    const sync = () => setPlayerChromeHidden(isPlayerRoute || document.body.classList.contains("grubx-player-open") || document.documentElement.classList.contains("grubx-player-open"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [pathname]);

  if (playerChromeHidden) return null;
  return <header className="site-navbar fixed inset-x-0 top-0 z-50">
    <div className="liquid-glass border-b border-white/10">
      <div className="page-shell flex h-[var(--nav-height)] items-center gap-3">
        <Link href="/" className="flex items-center gap-2 rounded-full px-2 py-1.5"><Image src="/64x64.png" alt="logo" width={32} height={32} className="rounded-full"/><span className="font-semibold">{settings.websiteName}</span></Link>
        <nav className={cn("hidden flex-1 gap-1 overflow-x-auto lg:flex", effectiveNavStyle === "sidebar" && "lg:hidden")}>{nav.map((item)=>{const Icon=item.icon;const active=isActivePath(pathname,item.href);return <Link key={item.href} href={item.href} className={cn("min-h-11 rounded-full px-3 inline-flex items-center gap-2 text-sm",active?"bg-[var(--accent)] text-black":"hover:bg-white/10")}>{settings.showNavIcons&&<Icon className="size-4"/>}{settings.showNavLabels&&item.label}</Link>;})}</nav>
        <button aria-label="Open navigation" onClick={()=>setOpen(true)} className="min-h-11 min-w-11 rounded-xl border border-white/10 lg:hidden"><Menu className="mx-auto size-5"/></button>
      </div>
    </div>
    {effectiveMobileStyle === "drawer" && <>
      <div onClick={()=>setOpen(false)} className={cn("fixed inset-0 bg-black/60 backdrop-blur-sm transition", open?"opacity-100 pointer-events-auto":"opacity-0 pointer-events-none")} />
      <aside className={cn("fixed left-0 top-0 h-full w-[84vw] max-w-sm bg-[#090909] p-4 pt-[calc(env(safe-area-inset-top)+1rem)] transition-transform",open?"translate-x-0":"-translate-x-full")}>
        <div className="mb-4 flex items-center justify-between"><p className="font-semibold">Navigation</p><button onClick={()=>setOpen(false)} className="min-h-11 min-w-11 rounded-xl border border-white/10"><X className="mx-auto size-5"/></button></div>
        <nav className="space-y-2">{nav.map((item)=>{const Icon=item.icon;const active=isActivePath(pathname,item.href);return <Link key={item.href} href={item.href} className={cn("min-h-11 rounded-xl px-3 inline-flex w-full items-center gap-3",active?"bg-white text-black":"bg-white/5 hover:bg-white/10")}><Icon className="size-4"/>{item.label}</Link>;})}</nav>
      </aside>
    </>}
  </header>;
}
