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
  const clean = props ? (Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined)) as Props) : undefined;
  if (ai) ai.trackEvent({ name }, clean);
  else if (queue.length < 50) queue.push([name, clean]);
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
      // Anonymous, per browser, no cookie: the random id reactions already keep in localStorage.
      // Lets the dashboard tell a returning reader from a new one.
      try {
        let uid = localStorage.getItem("ma-client");
        if (!uid) { uid = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem("ma-client", uid); }
        (inst as unknown as { context: { user: { id: string } } }).context.user.id = uid.slice(0, 16);
      } catch {}
      ai = inst as unknown as AI;
      inst.trackPageView({ name: document.title, uri: location.origin + location.pathname });
      for (const [n, pr] of queue.splice(0)) ai.trackEvent({ name: n }, pr);
      // Module-level and registered once: the same handler and options never stack, and the
      // listener lives exactly as long as the telemetry client it reports to.
      document.addEventListener("click", onClick, { capture: true, passive: true });
    }).catch(() => { loading = false; }); // a failed load can retry on the next mount
  }, []);
  useEffect(() => {
    if (ai && pathname) ai.trackPageView({ name: document.title, uri: location.origin + location.pathname });
  }, [pathname]);
  return null;
}
