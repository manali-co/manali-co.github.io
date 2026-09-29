"use client";
import { useEffect } from "react";

/* A tab left open across a deploy still runs the old build. Its next client-side navigation asks
   for files the new deploy no longer has, flashes an error and then reloads. Vercel's Skew
   Protection prevents that but is not on the Hobby plan. So when the tab comes back into view we
   ask which deploy is live, and if it changed, internal link clicks become plain page loads. */
export function StaleTabGuard() {
  useEffect(() => {
    const mine = process.env.NEXT_PUBLIC_BUILD;
    if (!mine) return; // local dev and the static mirror have nothing to compare
    let stale = false;
    let last = 0;
    const check = async () => {
      if (stale || document.visibilityState !== "visible" || Date.now() - last < 60_000) return;
      last = Date.now();
      try {
        const res = await fetch("/api/build/", { cache: "no-store" });
        const live = ((await res.json()) as { build?: string }).build;
        if (live && live !== mine) stale = true;
      } catch {}
    };
    const onClick = (e: MouseEvent) => {
      if (!stale || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return; // same-page anchor
      e.preventDefault();
      e.stopPropagation(); // keep the old router from also handling it
      location.assign(url.href);
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}
