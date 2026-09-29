"use client";
import { useSyncExternalStore } from "react";
import type { PartView, SeriesView } from "@/lib/series";

/* Ported from the design system's seriesState (components/series/SeriesTrack.jsx). */
export type PartState = "read" | "current" | "unread" | "soon";
export type ReaderPart = PartView & { state: PartState };

export function seriesState(series: SeriesView, current: string | undefined, read: readonly string[]) {
  const parts: ReaderPart[] = series.parts.map((p) => ({ ...p, state: p.soon ? "soon" : p.slug === current ? "current" : p.slug && read.includes(p.slug) ? "read" : "unread" }));
  const published = parts.filter((p) => !p.soon);
  const idx = parts.findIndex((p) => p.state === "current");
  const readCount = published.filter((p) => p.slug && read.includes(p.slug)).length;
  const resume = readCount > 0 ? published.find((p) => p.state === "unread") : undefined;
  return {
    parts, published, total: parts.length, soonCount: parts.length - published.length, readCount,
    currentPart: idx >= 0 ? parts[idx] : undefined, next: idx >= 0 ? parts[idx + 1] : undefined,
    first: published[0], latest: published[published.length - 1], resume,
    mode: (readCount === 0 ? "start" : resume ? "resume" : "caught") as "start" | "resume" | "caught",
  };
}

/* Which posts this browser has finished (reached the end-of-post block), kept in localStorage.
   Never sent anywhere. The server renders as a first-time reader; the browser then fills in. */
const KEY = "ma-series-read";
const EMPTY: string[] = [];
const listeners = new Set<() => void>();
let raw: string | null = null;
let parsed: string[] = EMPTY;

function snapshot(): string[] {
  let now = "";
  try { now = localStorage.getItem(KEY) || ""; } catch {}
  if (now !== raw) {
    raw = now;
    try { const v = now ? JSON.parse(now) : []; parsed = Array.isArray(v) ? v.filter((x) => typeof x === "string") : EMPTY; } catch { parsed = EMPTY; }
  }
  return parsed;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) fn(); };
  addEventListener("storage", onStorage);
  return () => { listeners.delete(fn); removeEventListener("storage", onStorage); };
}

export function useSeriesRead(): string[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function markSeriesRead(slug: string) {
  const cur = snapshot();
  if (cur.includes(slug)) return;
  try { localStorage.setItem(KEY, JSON.stringify([...cur, slug].slice(-300))); } catch {}
  listeners.forEach((f) => f());
}
