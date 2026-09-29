"use client";
import { useEffect, useState } from "react";

/* Ported from the design system (components/comments/ReaderAvatar.jsx). A reader's anonymous
   identity comes from a public seed: the first 24 hex characters of sha256(browser id), exactly
   what the API stores with each comment. The browser id itself never leaves this browser. */
const ADJ = ["Quiet", "Early", "Gentle", "Late", "Bright", "Slow", "Warm", "Still", "Soft", "Clear", "Kind", "Calm", "Lucky", "Patient", "Easy", "Golden"];
const NOUN = ["Ridge", "Meadow", "Valley", "River", "Harbour", "Orchard", "Summit", "Pine", "Cedar", "Dune", "Cove", "Glen", "Brook", "Field", "Hollow", "Shore"];
/* ground, hill, sun: soft landscapes from the brand's paper, tints and sister colours */
export const SCENES = [
  ["#DCE7F2", "#93A9C5", "#F2B84B"], ["#FBE7B8", "#E8B79A", "#EE8079"], ["#DDF1ED", "#6ECBBE", "#F2B84B"], ["#ECE7FA", "#B8A6E6", "#FBE7B8"],
  ["#E7EFE3", "#8DBF9F", "#F2B84B"], ["#EEEFFA", "#9AA0EA", "#EE8079"], ["#FCE6E3", "#EE8079", "#FBE7B8"], ["#EFEBDF", "#84839E", "#F2B84B"],
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function readerIdentity(seed = "") {
  const h = hash(seed);
  return { name: `${ADJ[h % 16]} ${NOUN[(h >>> 4) % 16]}`, scene: (h >>> 8) % SCENES.length, peak: 22 + ((h >>> 11) % 5) * 12, sun: (h >>> 14) % 2 };
}

/* The browser's id (shared with reactions), created on first use, and its public seed. */
export function clientId() {
  try {
    let id = localStorage.getItem("ma-client");
    if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join(""); localStorage.setItem("ma-client", id); }
    return id;
  } catch { return ""; }
}

export async function seedOf(client: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(client));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

export function useReader() {
  const [me, setMe] = useState({ client: "", seed: "" });
  useEffect(() => {
    const client = clientId();
    if (!client || !crypto?.subtle) return;
    let live = true;
    seedOf(client).then((seed) => { if (live) setMe({ client, seed }); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return me;
}
