"use client";
import { useState } from "react";
import { Icon } from "./Icon";

/* Share a post: the system share sheet where it exists (phones), otherwise copy the link and
   the usual networks. The link carries the post's own social card (opengraph-image). */
export function ShareRow({ url, title, summary }: { url: string; title: string; summary?: string }) {
  const [copied, setCopied] = useState(false);
  const text = summary ? `${title} — ${summary}` : title;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const share = async () => {
    try { await navigator.share({ title, text: summary, url }); } catch {}
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  const enc = encodeURIComponent;
  return (
    <div className="share" aria-label="Share this post">
      <span className="share__label">Share</span>
      {canShare && <button className="button button--sm" type="button" onClick={share}><Icon name="share" size={14} /> Share…</button>}
      <button className="button button--sm" type="button" onClick={copy} aria-live="polite">{copied ? "Link copied" : "Copy link"}</button>
      <a className="button button--sm" href={`https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`} target="_blank" rel="noopener">X</a>
      <a className="button button--sm" href={`https://bsky.app/intent/compose?text=${enc(`${text} ${url}`)}`} target="_blank" rel="noopener">Bluesky</a>
      <a className="button button--sm" href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`} target="_blank" rel="noopener">LinkedIn</a>
    </div>
  );
}
