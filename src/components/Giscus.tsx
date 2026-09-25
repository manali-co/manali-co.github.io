"use client";
import { useEffect, useRef } from "react";
import { site } from "@/lib/site";

/* Comments and reactions, stored in GitHub Discussions. One discussion per post path. */
export function Giscus() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.querySelector("iframe, script")) return;
    let theme = "preferred_color_scheme";
    try { const t = localStorage.getItem("theme"); if (t === "dark" || t === "light") theme = t; } catch {}
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
      "data-reactions-enabled": "1",
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
