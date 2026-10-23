import type { NextConfig } from "next";

/* STATIC_EXPORT=1 produces a plain static site for GitHub Pages (home, blog, posts, projects,
   feed, social cards). Server-only routes (admin, sign-in, confirm, unsubscribe, /api/*) are set
   aside by scripts/static-export.mjs for that build. The Vercel build keeps everything. Both builds use trailing
   slashes so every post has one path, and one comment thread, on either host. */
const isStatic = process.env.STATIC_EXPORT === "1";

/* No auth vendor: the owner signs in with GitHub by plain redirects, so the only outside host a
   form may lead to is github.com (the sign-in button's redirect; Chrome checks form-action there). */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://github.com",
  // Next's own inline bootstrap needs 'unsafe-inline' here; the real script guard is that
  // post Markdown renders with html: false, so no author-supplied script ever reaches a page.
  "script-src 'self' 'unsafe-inline' https://giscus.app https://js.monitor.azure.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://giscus.app",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "frame-src https://giscus.app",
  "connect-src 'self' https://giscus.app https://api.github.com https://*.in.applicationinsights.azure.com https://*.applicationinsights.azure.com https://dc.services.visualstudio.com https://js.monitor.azure.com",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: csp },
];

const WSWW_HOST = "wsww.app";
// The production names (previews keep every path reachable, for testing).
const LIVE_HOSTS = "(?:(?:www\\.)?manali\\.page|wsww\\.app)";

const nextConfig: NextConfig = {
  /* Baked into the client so StaleTabGuard can tell when a newer deploy is live. */
  env: { NEXT_PUBLIC_BUILD: process.env.VERCEL_DEPLOYMENT_ID || "" },
  trailingSlash: true,
  // The follow endpoint reads a series title from content/series at request time.
  outputFileTracingIncludes: { "/api/subscribe": ["./content/series/**"] },
  // Links carry the slash; nothing redirects when a URL arrives without one. Social crawlers fetch the
  // generated card URL exactly as written in og:image, and some of them refuse a redirect.
  skipTrailingSlashRedirect: true,
  ...(isStatic
    ? {
        output: "export",
        images: { unoptimized: true },
      }
    : {
        // The project's vercel.app address still answers; send it to the real one.
        async redirects() {
          return [
            { source: "/:path*", has: [{ type: "host", value: "manali-web.vercel.app" }], destination: "https://manali.page/:path*", permanent: true },
            // What Should We Watch is live: its old waitlist address is now wsww.app (a 301, the board's
            // call). The leave page under it stays on manali.page, where the emails' links point.
            { source: "/what-should-we-watch{/}?", has: [{ type: "host", value: LIVE_HOSTS }], destination: "https://wsww.app/", statusCode: 301 },
            // The home page's own path in this deployment is only ever seen as wsww.app's root.
            { source: "/wsww-app{/}?", has: [{ type: "host", value: LIVE_HOSTS }], destination: "https://wsww.app/", statusCode: 301 },
          ];
        },
        // wsww.app is this same deployment under its own name: its root is the app's home page, and its
        // legal and support pages are the ones App Store Connect already links to.
        async rewrites() {
          return {
            beforeFiles: [
              { source: "/", has: [{ type: "host", value: WSWW_HOST }], destination: "/wsww-app/" },
              { source: "/privacy{/}?", has: [{ type: "host", value: WSWW_HOST }], destination: "/wsww/app/privacy.html" },
              { source: "/terms{/}?", has: [{ type: "host", value: WSWW_HOST }], destination: "/wsww/app/terms.html" },
              { source: "/support{/}?", has: [{ type: "host", value: WSWW_HOST }], destination: "/wsww/app/support.html" },
              // Those pages link each other relatively (terms.html, support.html…), which resolves to
              // /terms.html or /privacy/terms.html here; answer both.
              { source: "/:page(privacy|terms|support).html", has: [{ type: "host", value: WSWW_HOST }], destination: "/wsww/app/:page.html" },
              { source: "/:from(privacy|terms|support)/:page(privacy|terms|support).html", has: [{ type: "host", value: WSWW_HOST }], destination: "/wsww/app/:page.html" },
            ],
            afterFiles: [],
            fallback: [],
          };
        },
        async headers() {
          return [{ source: "/(.*)", headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
