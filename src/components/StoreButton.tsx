/* Ported from the design system (components/core/StoreButton.jsx). A store link for an app.
   live: a black two-line store button, or the official badge artwork when `badge` is set (Apple
   and Google require their own badges in production). soon: the same shape in a dashed outline,
   not a link. */
const COPY = {
  "app-store": { live: ["Download on the", "App Store"], soon: ["Coming to the", "App Store"] },
  "google-play": { live: ["Get it on", "Google Play"], soon: ["Coming to", "Google Play"] },
} as const;

export type Store = { store: keyof typeof COPY; state: "live" | "soon"; href?: string; badge?: string };

export function StoreButton({ store, state, href, badge }: Store) {
  const [small, big] = COPY[store][state];
  if (state === "live" && href && badge) {
    return <a className="store store--badge" href={href} target="_blank" rel="noopener noreferrer" aria-label={`${small} ${big}`}><img src={badge} alt="" height={48} /></a>;
  }
  if (state === "live" && href) {
    return <a className="store" href={href} target="_blank" rel="noopener noreferrer"><span className="store__small">{small}</span><span className="store__big">{big}</span></a>;
  }
  return <span className="store store--soon" aria-disabled="true"><span className="store__small">{small}</span><span className="store__big">{big}</span></span>;
}
