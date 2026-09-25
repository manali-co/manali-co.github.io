"use client";
import { useEffect, useState } from "react";
import { giscusTheme } from "./Giscus";

type Theme = "light" | "dark";

function apply(t: Theme | null) {
  const root = document.documentElement;
  if (t) root.dataset.theme = t; else delete root.dataset.theme;
  // Brand <picture> pairs: follow the chosen theme, not just the system.
  document.querySelectorAll<HTMLSourceElement>("picture > source[media]").forEach((s) => {
    const base = s.dataset.media || (s.dataset.media = s.media);
    s.media = t ? (base.includes("dark") === (t === "dark") ? "all" : "not all") : base;
  });
  // giscus follows along.
  const frame = document.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
  const mode = t || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  frame?.contentWindow?.postMessage({ giscus: { setConfig: { theme: giscusTheme(mode) } } }, "https://giscus.app");
}

/* System theme by default; a click pins light or dark for this browser. The pressed state is
   only known on the client, so it's resolved after mount to keep server and client HTML identical. */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);
  useEffect(() => {
    let stored: Theme | null = null;
    try { stored = localStorage.getItem("theme") as Theme | null; } catch {}
    if (stored) apply(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setIsDark(stored ? stored === "dark" : mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const toggle = () => {
    const next: Theme = isDark ? "light" : "dark";
    setIsDark(next === "dark");
    try { localStorage.setItem("theme", next); } catch {}
    apply(next);
  };
  return (
    <button className="theme-toggle" type="button" aria-label="Toggle light and dark theme" aria-pressed={isDark ?? undefined} onClick={toggle}>
      <span className="theme-toggle__icon" aria-hidden="true" />
    </button>
  );
}
