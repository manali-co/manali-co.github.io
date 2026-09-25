import Link from "next/link";
import { site } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";
import { Picture } from "./Picture";
import { Icon } from "./Icon";

/* Sticky bar. Phones: mark only, three links, a mail glyph for Subscribe, the toggle.
   Wider: compact lockup and a secondary Subscribe button. The hero owns the big logo moment. */
export function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav__inner">
        <Link className="nav__brand" href="/" aria-label="manali apps, home">
          <Picture light="/brand/mark-color.svg" dark="/brand/mark-on-dark.svg" alt="" className="nav__mark" width={36} height={36} />
          <Picture light="/brand/lockup-light.svg" dark="/brand/lockup-dark.svg" alt="manali apps" className="nav__lockup" width={120} height={40} />
        </Link>
        <nav className="nav__links" aria-label="Site">
          <Link href="/#projects">Projects</Link>
          <Link href="/blog/">Blog</Link>
          <a href={site.github} rel="me">GitHub</a>
          <Link href="/subscribe/" className="button button--sm nav__subscribe">Subscribe</Link>
          <Link href="/subscribe/" className="nav__subscribe-glyph" aria-label="Subscribe"><Icon name="mail" size={18} /></Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
