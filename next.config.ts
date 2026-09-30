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
          return [{ source: "/:path*", has: [{ type: "host", value: "manali-web.vercel.app" }], destination: "https://manali.page/:path*", permanent: true }];
        },
        async headers() {
          return [{ source: "/(.*)", headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
