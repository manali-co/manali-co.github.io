"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/* Page views, route changes, client errors and outgoing fetches go to Application Insights
   (the same resource the API reports to), so one workbook shows the whole picture. Loads
   only when NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING is set. */
type AI = { trackPageView: (pv?: { name?: string; uri?: string }) => void };
let ai: AI | null = null;

export function Telemetry() {
  const pathname = usePathname();
  useEffect(() => {
    const cs = process.env.NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING;
    if (!cs || ai) return;
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
      inst.addTelemetryInitializer((item) => {
        item.tags = item.tags || {};
        item.tags["ai.cloud.role"] = "manali-web";
      });
      ai = inst;
      inst.trackPageView({ name: document.title, uri: location.href });
    });
  }, []);
  useEffect(() => {
    if (ai && pathname) ai.trackPageView({ name: document.title, uri: location.href });
  }, [pathname]);
  return null;
}
