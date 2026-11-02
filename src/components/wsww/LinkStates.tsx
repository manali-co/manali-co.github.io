import type { ReactNode } from "react";
import { APP_STORE_URL } from "@/lib/wsww-link";
import "@/styles/wsww-link.css";

/* The frame every film link page shares (board 8's header: the app icon and "What Should We
   Watch · wsww.app"), and the two pages for a link that can't be shown. Neither of those two is
   drawn yet (design-gaps-web.md, 1 and 2): they reuse the drawn header, title style and "Get the
   app" button, with the API's own wording, until the design draws them. */

export function LinkFrame({ children }: { children: ReactNode }) {
  return (
    <div className="wsl">
      {/* The app's faces (tokens/fonts.css), as on the waitlist. React hoists this into <head>; the
          page sends no referrer, so Google sees neither the page nor its token. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router: these pages only, hoisted by React */}
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600&family=Figtree:wght@400;500;600&display=swap" />
      <div className="wsl-col">
        <header className="wsl-head">
          {/* eslint-disable-next-line @next/next/no-img-element -- a 28px icon from /public, no optimiser needed */}
          <img src="/apps/what-should-we-watch/apple-touch-icon-180.png" alt="" width={28} height={28} />
          <span className="wsl-micro">What Should We Watch · wsww.app</span>
        </header>
        {children}
      </div>
    </div>
  );
}

/** One page for every link that can't be shown: unknown, expired, revoked, blocked, malformed, or
    social switched off. Identical on purpose, so a page never says which. */
export function LinkUnavailable() {
  return (
    <LinkFrame>
      <h1 className="wsl-display-l wsl-told">This link isn’t available.</h1>
      <div className="wsl-bottom">
        <a className="wsl-btn wsl-btn--primary" href={APP_STORE_URL}>Get the app</a>
      </div>
    </LinkFrame>
  );
}

/** The API is rate limiting this visitor, or can't be reached: worth another try. */
export function LinkBusy() {
  return (
    <LinkFrame>
      <h1 className="wsl-display-l wsl-told">Give it a minute and try again.</h1>
    </LinkFrame>
  );
}
