"use client";
import { useEffect, useState } from "react";

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
  frame?.contentWindow?.postMessage({ giscus: { setConfig: { theme: t === "dark" ? "dark" : t === "light" ? "light" : "preferred_color_scheme" } } }, "https://giscus.app");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => {
    try { const t = localStorage.getItem("theme") as Theme | null; if (t) { setTheme(t); apply(t); } } catch {}
  }, []);
  const isDark = theme ? theme === "dark" : typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const toggle = () => {
    const next: Theme = isDark ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("theme", next); } catch {}
    apply(next);
  };
  return (
    <button className="theme-toggle" type="button" aria-label="Toggle light and dark theme" aria-pressed={isDark} onClick={toggle}>
      <span className="theme-toggle__icon" aria-hidden="true" />
    </button>
  );
}
