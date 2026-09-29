"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

/* Compact share row, from the design's ShareRow: copy link (with a "Link copied" moss state),
   the system share sheet where it exists, then X, Bluesky and LinkedIn intents. The link
   carries the post's own social card. */
function Pill({ href, onClick, icon, label, done, children }: { href?: string; onClick?: () => void; icon: string; label: string; done?: boolean; children?: React.ReactNode }) {
  const cls = `share__pill ${done ? "share__pill--done" : ""} ${children ? "" : "share__pill--icon"}`;
  if (href) return <a className={cls} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}><Icon name={icon} size={16} />{children}</a>;
  return <button className={cls} type="button" onClick={onClick} aria-label={label} title={label} aria-live="polite"><Icon name={done ? "check" : icon} size={16} />{children && <span className="share__text">{children}</span>}</button>;
}

export function ShareRow({ url, title, summary }: { url: string; title: string; summary?: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  // navigator.share is a browser fact; checking after mount keeps server and client HTML identical.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCanShare(typeof navigator.share === "function"); }, []);
  const enc = encodeURIComponent;
  const copy = async () => { try { await navigator.clipboard.writeText(url); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1800); };
  const share = () => navigator.share({ title, text: summary, url }).catch(() => {});
  return (
    <div className="share" role="group" aria-label="Share">
      <span className="share__label foot__label">Share</span>
      <Pill onClick={copy} icon="link" label={copied ? "Link copied" : "Copy link"} done={copied}>{copied ? "Link copied" : "Copy link"}</Pill>
      {canShare && <Pill onClick={share} icon="share" label="Share…" />}
      <Pill href={`https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}`} icon="x-logo" label="Share on X" />
      <Pill href={`https://bsky.app/intent/compose?text=${enc(`${title} ${url}`)}`} icon="butterfly" label="Share on Bluesky" />
      <Pill href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} icon="linkedin" label="Share on LinkedIn" />
    </div>
  );
}
