"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/* Page views, route changes, client errors and outgoing fetches go to Application Insights
   (the same resource the API reports to), so one workbook shows the whole picture. Loads
   only when NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING is set. */
type Props = Record<string, string | number | boolean | undefined>;
type AI = { trackPageView: (pv?: { name?: string; uri?: string }) => void; trackEvent: (e: { name: string }, p?: Props) => void };
let ai: AI | null = null;
const queue: [string, Props | undefined][] = [];
let loading = false; // one initialisation per page load, even across remounts

/* Custom events: labels, sections, counts. Never an email address or anything a visitor typed. */
export function track(name: string, props?: Props) {
  let clean = props ? (Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined)) as Props) : undefined;
  if (!ai && name === "page_engaged") {
    // The visitor may leave before the SDK loads: park a copy for the next page load. The id
    // lets that load skip the copy if the in-memory one was sent after all, without ever
    // mistaking two separate visits with identical numbers for one.
    clean = { ...clean, eid: Math.random().toString(36).slice(2, 10) };
    try { const k = "ma-pending"; const p = JSON.parse(localStorage.getItem(k) || "[]"); p.push([name, clean]); localStorage.setItem(k, JSON.stringify(p.slice(-20))); } catch {}
  }
  if (ai) ai.trackEvent({ name }, clean);
  else if (queue.length < 50) queue.push([name, clean]);
}

/* Engaged time and reading depth, per page: seconds the tab was actually visible (not just
   open) and the deepest point scrolled to. Sent when the visitor moves on or the tab hides. */
const engaged = { path: "", visibleMs: 0, since: 0, maxDepth: 0, sent: false };
function depthNow() {
  const h = document.documentElement.scrollHeight - innerHeight;
  return h <= 0 ? 100 : Math.min(100, Math.round((scrollY / h) * 100));
}
function flushEngaged(reason: string) {
  if (!engaged.path || engaged.sent) return;
  if (engaged.since) engaged.visibleMs += Date.now() - engaged.since;
  engaged.since = 0;
  engaged.sent = true;
  const device = matchMedia("(max-width: 720px)").matches ? "phone" : "laptop";
  // Each event carries the visible time since the last one, so a tab that hides and returns
  // reports two slices; the dashboard sums them per page view.
  track("page_engaged", { page: engaged.path, seconds: Math.round(engaged.visibleMs / 100) / 10, depth: engaged.maxDepth, device, reason });
  engaged.visibleMs = 0;
  (ai as unknown as { flush?: (async?: boolean) => void } | null)?.flush?.(false);
}
function startEngaged(path: string) {
  flushEngaged("navigate");
  Object.assign(engaged, { path, visibleMs: 0, since: document.visibilityState === "visible" ? Date.now() : 0, maxDepth: depthNow(), sent: false });
}
if (typeof window !== "undefined") {
  addEventListener("scroll", () => { engaged.maxDepth = Math.max(engaged.maxDepth, depthNow()); }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushEngaged("hidden");
    else if (engaged.path) { engaged.sent = false; engaged.since = Date.now(); }
  });
  addEventListener("pagehide", () => flushEngaged("leave"));
  // Back/forward cache restores can skip visibilitychange; start a new slice here too.
  addEventListener("pageshow", (e) => {
    if ((e as PageTransitionEvent).persisted && engaged.path && document.visibilityState === "visible") { engaged.sent = false; engaged.since = Date.now(); }
  });
}

function onClick(e: MouseEvent) {
  const el = (e.target as HTMLElement | null)?.closest("a, button, [role=button]") as HTMLElement | null;
  if (!el) return;
  const label = (el.getAttribute("data-track") || el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const area = el.closest("header, footer, nav, article, aside, section, [role=group]") as HTMLElement | null;
  const where = area?.getAttribute("aria-label") || area?.className.toString().split(" ")[0] || area?.tagName.toLowerCase() || "page";
  const href = el instanceof HTMLAnchorElement ? el.href : "";
  let external = false;
  try { external = !!href && /^https?:/.test(href) && new URL(href).origin !== location.origin; } catch {}
  track(external ? "outbound_click" : "click", { label, where, page: location.pathname, host: external ? new URL(href).host : undefined });
}

export function Telemetry() {
  const pathname = usePathname();
  useEffect(() => {
    const cs = process.env.NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING;
    if (!cs || ai || loading) return;
    loading = true;
    import("@microsoft/applicationinsights-web").then(({ ApplicationInsights }) => {
      const inst = new ApplicationInsights({
        config: {
          connectionString: cs,
          enableAutoRouteTracking: false, // we track route changes ourselves below
          disableCookiesUsage: true, // no consent banner needed: no cookies, no cross-site ids
          // Correlate only calls to our own hosts. Stamping every fetch adds Request-Id headers
          // that third parties (Clerk, giscus) don't allow in their CORS preflight.
          enableCorsCorrelation: true,
          correlationHeaderDomains: [location.host, "manali-dev-api.azurewebsites.net"],
          disableFetchTracking: false,
          samplingPercentage: 100,
        },
      });
      inst.loadAppInsights();
      const clean = (u: unknown) => (typeof u === "string" ? u.split("?")[0].split("#")[0] : u);
      inst.addTelemetryInitializer((item) => {
        item.tags = item.tags || {};
        item.tags["ai.cloud.role"] = "manali-web";
        // Query strings carry confirm/unsubscribe tokens; they stay out of telemetry entirely.
        const d = item.baseData as Record<string, unknown> | undefined;
        if (d) {
          for (const k of ["uri", "refUri", "target", "name"]) if (k in d) d[k] = clean(d[k]);
        }
      });
      // Anonymous, per browser, no cookie: a random id used only for telemetry, deliberately a
      // different value from the one reactions and replies use, so they are never matched by id.
      // Explained on /privacy/.
      try {
        let uid = localStorage.getItem("ma-visitor");
        if (!uid) { uid = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem("ma-visitor", uid); }
        (inst as unknown as { context: { user: { id: string } } }).context.user.id = uid;
      } catch {}
      ai = inst as unknown as AI;
      inst.trackPageView({ name: document.title, uri: location.origin + location.pathname });
      try {
        const parked = JSON.parse(localStorage.getItem("ma-pending") || "[]") as [string, Props | undefined][];
        localStorage.removeItem("ma-pending");
        const live = new Set(queue.map(([, pr]) => pr?.eid).filter(Boolean));
        for (const [n, pr] of parked) if (!live.has(pr?.eid)) ai.trackEvent({ name: n }, pr);
      } catch {}
      for (const [n, pr] of queue.splice(0)) ai.trackEvent({ name: n }, pr);
      // Module-level and registered once: the same handler and options never stack, and the
      // listener lives exactly as long as the telemetry client it reports to.
      document.addEventListener("click", onClick, { capture: true, passive: true });
    }).catch(() => { loading = false; }); // a failed load can retry on the next mount
  }, []);
  useEffect(() => {
    if (ai && pathname) ai.trackPageView({ name: document.title, uri: location.origin + location.pathname });
    if (pathname) startEngaged(pathname);
  }, [pathname]);
  return null;
}
