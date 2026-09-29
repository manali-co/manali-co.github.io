import type { NextConfig } from "next";

/* STATIC_EXPORT=1 produces a plain static site for GitHub Pages (home, blog, posts, projects,
   feed, social cards). Server-only routes (admin, sign-in, confirm, unsubscribe, /api/*) are set
   aside by scripts/static-export.mjs for that build, and Clerk is swapped for a stub since its
   package ships server actions. The Vercel build keeps everything. Both builds use trailing
   slashes so every post has one path, and one comment thread, on either host. */
const isStatic = process.env.STATIC_EXPORT === "1";
const stub = "./src/lib/clerk-stub.tsx";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self' https://*.clerk.accounts.dev https://clerk.com",
      // Next's own inline bootstrap needs 'unsafe-inline' here; the real script guard is that
      // post Markdown renders with html: false, so no author-supplied script ever reaches a page.
      "script-src 'self' 'unsafe-inline' https://giscus.app https://*.clerk.accounts.dev https://challenges.cloudflare.com https://js.monitor.azure.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://giscus.app",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "frame-src https://giscus.app https://*.clerk.accounts.dev https://challenges.cloudflare.com",
      "connect-src 'self' https://giscus.app https://api.github.com https://*.clerk.accounts.dev https://clerk.com https://*.in.applicationinsights.azure.com https://*.applicationinsights.azure.com https://dc.services.visualstudio.com https://js.monitor.azure.com",
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  trailingSlash: true,
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
          return [{ source: "/(.*)", headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
