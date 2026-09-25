"use client";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { Icon } from "./Icon";

const KEY = "ma-coffee-nudge-seen";

/* One dry line and a small coffee pill at the end of a post. Shows once per session, then stays hidden. */
export function CoffeeNudge() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(KEY)) { setShow(true); sessionStorage.setItem(KEY, "1"); }
    } catch { setShow(true); }
  }, []);
  if (!show || !site.coffee) return null;
  return (
    <aside className="nudge" aria-label="Support">
      <p>This one was free, like all of them. Coffee keeps it that way.</p>
      <a className="button button--sm coffee" href={site.coffee} target="_blank" rel="noopener" title="Opens Ko-fi in a new tab"><Icon name="coffee" size={15} /> Buy us a coffee</a>
    </aside>
  );
}
