import Link from "next/link";
import { site } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";
import { Picture } from "./Picture";

export function Nav() {
  return (
    <header className="nav">
      <div className="wrap nav__inner">
        <Link className="nav__brand" href="/" aria-label="manali apps, home">
          <Picture light="/brand/lockup-light.svg" dark="/brand/lockup-dark.svg" alt="manali apps" className="nav__lockup" width={160} height={53} />
        </Link>
        <nav className="nav__links" aria-label="Site">
          <Link href="/#projects">Projects</Link>
          <Link href="/blog/">Blog</Link>
          <a href={site.github} rel="me">GitHub</a>
          <Link href="/subscribe/" className="nav__subscribe">Subscribe</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
