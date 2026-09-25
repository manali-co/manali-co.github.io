"use client";
import { useEffect, useRef } from "react";
import { site } from "@/lib/site";

/* Our own giscus theme (tokens as literals) when the site is served over https; giscus refuses
   custom theme URLs otherwise, so localhost gets the closest built-in. */
export function giscusTheme(mode: "light" | "dark") {
  const base = typeof window !== "undefined" && window.location.protocol === "https:" ? window.location.origin : "";
  return base ? `${base}/giscus-${mode}.css` : mode === "dark" ? "noborder_dark" : "noborder_light";
}

/* Comments and reactions, stored in GitHub Discussions. One discussion per post path. */
export function Giscus() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.querySelector("iframe, script")) return;
    let mode: "light" | "dark" = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    try { const t = localStorage.getItem("theme"); if (t === "dark" || t === "light") mode = t; } catch {}
    const theme = giscusTheme(mode);
    const s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.async = true;
    s.crossOrigin = "anonymous";
    const attrs: Record<string, string> = {
      "data-repo": site.giscus.repo,
      "data-repo-id": site.giscus.repoId,
      "data-category": site.giscus.category,
      "data-category-id": site.giscus.categoryId,
      "data-mapping": "pathname",
      "data-strict": "1",
      "data-reactions-enabled": "0",
      "data-emit-metadata": "0",
      "data-input-position": "top",
      "data-theme": theme,
      "data-lang": "en",
      "data-loading": "lazy",
    };
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    el.appendChild(s);
  }, []);
  return <div ref={ref} className="giscus" />;
}
