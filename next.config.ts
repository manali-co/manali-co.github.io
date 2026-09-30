import type { NextConfig } from "next";

/* STATIC_EXPORT=1 produces a plain static site for GitHub Pages (home, blog, posts, projects,
   feed, social cards). Server-only routes (admin, sign-in, confirm, unsubscribe, /api/*) are set
   aside by scripts/static-export.mjs for that build, and Clerk is swapped for a stub since its
   package ships server actions. The Vercel build keeps everything. Both builds use trailing
   slashes so every post has one path, and one comment thread, on either host. */
const isStatic = process.env.STATIC_EXPORT === "1";
const stub = "./src/lib/clerk-stub.tsx";

/* Auth hosts appear only in the owner routes' policy. clerk.manali.page is the production Clerk
   instance's own domain; *.clerk.accounts.dev is the development instance, until it's retired. */
const CLERK = ["https://clerk.manali.page", "https://*.clerk.accounts.dev"];

function csp(owner: boolean) {
  const auth = owner ? CLERK : [];
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    ["form-action 'self'", ...auth, ...(owner ? ["https://clerk.com"] : [])].join(" "),
    // Next's own inline bootstrap needs 'unsafe-inline' here; the real script guard is that
    // post Markdown renders with html: false, so no author-supplied script ever reaches a page.
    ["script-src 'self' 'unsafe-inline' https://giscus.app https://js.monitor.azure.com", ...auth, ...(owner ? ["https://challenges.cloudflare.com"] : [])].join(" "),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://giscus.app",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    ["frame-src https://giscus.app", ...auth, ...(owner ? ["https://challenges.cloudflare.com"] : [])].join(" "),
    ["connect-src 'self' https://giscus.app https://api.github.com https://*.in.applicationinsights.azure.com https://*.applicationinsights.azure.com https://dc.services.visualstudio.com https://js.monitor.azure.com", ...auth, ...(owner ? ["https://clerk.com"] : [])].join(" "),
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
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
        turbopack: { resolveAlias: { "@clerk/nextjs": stub } },
      }
    : {
        // The project's vercel.app address still answers; send it to the real one.
        async redirects() {
          return [{ source: "/:path*", has: [{ type: "host", value: "manali-web.vercel.app" }], destination: "https://manali.page/:path*", permanent: true }];
        },
        async headers() {
          // Readers' pages get a policy with no auth hosts at all; only the owner's routes allow Clerk.
          return [
            { source: "/((?!(?:admin|sign-in|__clerk)(?:/|$)).*)", headers: [...baseHeaders, { key: "Content-Security-Policy", value: csp(false) }] },
            { source: "/:owner(admin|sign-in|__clerk)/:path*", headers: [...baseHeaders, { key: "Content-Security-Policy", value: csp(true) }] },
          ];
        },
      }),
};

export default nextConfig;
