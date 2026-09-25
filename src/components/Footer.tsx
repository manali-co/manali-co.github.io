import { site, owner, ownerLinks } from "@/lib/site";
import { Picture } from "./Picture";
import { Icon } from "./Icon";

/* The site's sign-off, from the design's Footer: identity (lockup, "by", socials), support
   (coffee), quiet links, then the licence line. Stacked and centred on phones; three columns
   from 900px. */
export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <div className="footer__cols">
          <div className="footer__identity">
            <Picture light="/brand/lockup-stacked.svg" dark="/brand/lockup-stacked-dark.svg" alt="manali apps" className="footer__lockup" width={132} height={90} />
            <p className="footer__by">manali apps by <a href={owner.github} rel="me noopener" target="_blank">{owner.name}</a></p>
            <p className="footer__socials">
              {ownerLinks.map((l) => (
                <a key={l.key} className="glyph glyph--lg" href={l.href} aria-label={l.label} title={l.label} rel="me noopener" target="_blank"><Icon name={l.icon} size={18} /></a>
              ))}
            </p>
          </div>
          <div className="footer__support">
            <p>Everything here is free to use. It costs us a little to keep running, and a coffee keeps us up. Any amount. No pressure.</p>
            {site.coffee && <a className="button button--sm coffee" href={site.coffee} target="_blank" rel="noopener" title="Opens Ko-fi in a new tab" aria-label="Buy us a coffee (opens Ko-fi in a new tab)"><Icon name="coffee" size={16} /> Buy us a coffee</a>}
          </div>
          <nav className="footer__nav" aria-label="Footer">
            <a href={site.github} target="_blank" rel="noopener">GitHub org</a>
            <a href="/feed.xml">RSS</a>
            <a href="/subscribe/">Subscribe</a>
            <a href="https://github.com/manali-co/.github/tree/main/brand" target="_blank" rel="noopener">Brand</a>
          </nav>
        </div>
        <p className="footer__note">Yapp and the brand are CC BY 4.0. Use them, just say where they came from. What Should We Watch is source-available.</p>
      </div>
    </footer>
  );
}
