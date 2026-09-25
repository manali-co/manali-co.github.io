import { site, owner, ownerLinks } from "@/lib/site";
import { Picture } from "./Picture";
import { Icon } from "./Icon";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <Picture light="/brand/lockup-stacked.svg" dark="/brand/lockup-stacked-dark.svg" alt="manali apps" className="footer__lockup" width={132} height={90} />
        <p className="footer__line">{site.tagline}. Built by people, with help from agents. Yapp and the brand are CC BY 4.0; What Should We Watch is ours.</p>
        <div className="footer__coffee">
          <p>Everything here is free to use and costs us a little to run. If something made your evening better, a coffee keeps us up. Any amount, no pressure.</p>
          {site.coffee && <a className="button button--sm" href={site.coffee} target="_blank" rel="noopener"><Icon name="coffee" size={15} /> Buy us a coffee</a>}
        </div>
        <div className="footer__owner">
          <p className="footer__by">manali apps by <a href={owner.github} rel="me" target="_blank">{owner.name}</a></p>
          <p className="footer__socials">
            {ownerLinks.map((l) => (
              <a key={l.key} className="glyph glyph--lg" href={l.href} aria-label={l.label} title={l.label} rel="me noopener" target="_blank"><Icon name={l.icon} size={18} /></a>
            ))}
          </p>
        </div>
        <p className="footer__links">
          <a href={site.github} target="_blank" rel="noopener">GitHub org</a> · <a href="/feed.xml">RSS</a> · <a href="/subscribe/">Subscribe</a> · <a href="https://github.com/manali-co/.github/tree/main/brand" target="_blank" rel="noopener">Brand</a>
        </p>
      </div>
    </footer>
  );
}
