"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { FeedbackData, FeedbackItem, FeedbackType } from "@/lib/feedback-admin";

/* What Should We Watch · Feedback: what people send from the app's Send feedback sheet. Counts (all,
   last 7 days, by type), a type filter, then the latest reports newest first. A 1:1 port of Claude
   Design's components/admin/FeedbackPanel (Manali Apps Design System); classes are fb-. Read-only:
   GET /v1/feedback has no resolve, delete or reply. Data comes from adminFeedback() on the server,
   so the operator token never reaches the browser. */

const TZ = "America/New_York";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEK = 7 * 86400e3;
const PAGE = 20;
const num = (v: number) => Number(v || 0).toLocaleString("en-US");
const parts = (ms: number, o: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
const exactTime = (ms: number) => {
  const p = parts(ms, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${p.weekday} ${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}`;
};
function relativeTime(ms: number, now: number) {
  const s = Math.max(0, (now - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) { const h = Math.round(s / 3600); return `${h} ${h === 1 ? "hour" : "hours"} ago`; }
  if (s < 172800) return "yesterday";
  if (s < 604800) return `${Math.round(s / 86400)} days ago`;
  const p = parts(ms, { day: "numeric", month: "numeric" });
  return `on ${p.day} ${MONTHS[Number(p.month) - 1]}`;
}

/* type → [singular, plural, icon]. Icon + word everywhere; the colour is extra. */
const TYPES: Record<FeedbackType, [string, string, string]> = { bug: ["Bug", "Bugs", "bug"], idea: ["Idea", "Ideas", "lightbulb"], other: ["Other", "Other", "message"] };
const ORDER: FeedbackType[] = ["bug", "idea", "other"];
const PLATFORM = { ios: "iOS", android: "Android", web: "Web" };
const shortId = (id: string) => (id.length > 10 ? `${id.slice(0, 8)}…` : id);
const whoLabel = (userId: string) => (/^clerk:/i.test(userId) ? "Member" : /^dev:/i.test(userId) ? "Guest device" : "Id");
const bareId = (userId: string) => userId.replace(/^(clerk|dev):/i, "").replace(/^user_/i, "");
type Filter = "all" | FeedbackType;
const NONE: Record<Filter, string> = { all: "No feedback yet.", bug: "No bugs yet.", idea: "No ideas yet.", other: "Nothing filed under Other yet." };

function TypeMark({ type, plural = false }: { type: FeedbackType; plural?: boolean }) {
  const [one, many, icon] = TYPES[type];
  return <span className={`fb__type fb__type--${type}`}><Icon name={icon} size={14} />{plural ? many : one}</span>;
}

/* Clamps at four lines; "Read all of it" appears only when something is hidden. */
function Message({ text, open, onToggle }: { text: string; open: boolean; onToggle: () => void }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [long, setLong] = useState(false);
  useLayoutEffect(() => { const el = ref.current; if (el && !open) setLong(el.scrollHeight > el.clientHeight + 1); }, [text, open]);
  return (
    <>
      <p ref={ref} className={`fb__msg${open ? "" : " is-clamped"}`}>{text}</p>
      {(long || open) && <button type="button" className="fb__more" aria-expanded={open} onClick={onToggle}>{open ? "Show less" : "Read all of it"}</button>}
    </>
  );
}

function Item({ it, now, open, onToggle }: { it: FeedbackItem; now: number; open: boolean; onToggle: () => void }) {
  const t = it.at * 1000;
  const meta = [it.platform ? PLATFORM[it.platform] : null, it.device, it.appVersion].filter(Boolean);
  return (
    <li className="fb__item">
      <TypeMark type={it.type} />
      <div className="fb__body">
        <Message text={it.message} open={open} onToggle={onToggle} />
        <p className="fb__meta">
          {it.userId ? <span>{whoLabel(it.userId)} <span className="fb__id" title={`Full id: ${it.userId}`}>{shortId(bareId(it.userId))}</span></span> : <span>Guest</span>}
          {meta.map((m, i) => <span key={i}>· {m}</span>)}
        </p>
      </div>
      <time className="fb__when" dateTime={new Date(t).toISOString()} title={exactTime(t)}>{relativeTime(t, now)}</time>
    </li>
  );
}

function Split({ counts, total }: { counts: Record<FeedbackType, number>; total: number }) {
  const label = total ? ORDER.map((k) => `${TYPES[k][1]} ${num(counts[k])}`).join(", ") : "No feedback yet";
  return (
    <div className="fb__group">
      <h3 className="fb__h">By type</h3>
      <div className="split" role="img" aria-label={label}>
        {total ? ORDER.map((k) => (counts[k] ? <span key={k} className={`split__part fb__part--${k}`} style={{ flex: `${counts[k]} 1 0` }} /> : null)) : <span className="split__part fb__part--none" style={{ flex: 1 }} />}
      </div>
      <ul className="fb__legend">
        {ORDER.map((k) => <li key={k} className={counts[k] ? "" : "is-zero"}><TypeMark type={k} plural /><span className="fb__legend-val"><b>{num(counts[k])}</b> · {total ? Math.round((counts[k] / total) * 100) : 0}%</span></li>)}
      </ul>
    </div>
  );
}

export function FeedbackPanel({ data, now, limit }: { data: FeedbackData; now: number; limit: number }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const list = data.state === "ready" ? data.items : [];
  const counts: Record<FeedbackType, number> = { bug: 0, idea: 0, other: 0 };
  for (const i of list) counts[i.type]++;
  const total = list.length;
  const capped = total >= limit;
  const week = list.filter((i) => now - i.at * 1000 < WEEK);
  const weekBugs = week.filter((i) => i.type === "bug").length;
  const filtered = filter === "all" ? list : list.filter((i) => i.type === filter);
  const visible = filtered.slice(0, shown);
  const pick = (f: Filter) => { setFilter(f); setShown(PAGE); };
  const key = (i: FeedbackItem) => i.id;
  const toggle = (k: string) => setOpen((o) => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const retry = <button className="button button--sm" type="button" onClick={() => router.refresh()}>Try again</button>;
  return (
    <div className="panel fb" style={{ gap: "var(--space-5)" }}>
      <div className="ann__top">
        <h2 className="panel__title">What Should We Watch · Feedback</h2>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-3)" }}>{data.state === "ready" ? (capped ? `Read-only · newest ${num(limit)}` : "Read-only") : ""}</span>
      </div>
      {data.state === "unconfigured" && (
        <div className="panel-state" role="status">
          <span className="panel-state__icon" aria-hidden="true"><Icon name="alert" size={16} /></span>
          <div className="panel-state__body"><p className="panel-state__title">Feedback isn&apos;t set up.</p><p className="panel-state__text">The API answered 503: <code className="fb__code">WSWW_ADMIN_TOKEN</code> isn&apos;t set on the What Should We Watch API. manali.page needs <code className="fb__code">WSWW_API_BASE_URL</code> and <code className="fb__code">WSWW_ADMIN_TOKEN</code> too; either one missing shows this.</p>{retry}</div>
        </div>
      )}
      {data.state === "unreachable" && (
        <div className="panel-state" role="alert">
          <span className="panel-state__icon panel-state__icon--bad" aria-hidden="true"><Icon name="alert" size={16} /></span>
          <div className="panel-state__body"><p className="panel-state__title">Couldn&apos;t reach the feedback API.</p><p className="panel-state__text">Nothing to show until it answers ({data.error}). Reports already sent are safe on the API.</p>{retry}</div>
        </div>
      )}
      {data.state === "ready" && <>
        <div className="fb__top">
          <div><p className="stat">{num(total)}</p><p className="stat__label">reports · {total ? (capped ? `the newest ${num(limit)}` : "all time") : "nobody yet"}</p></div>
          <div><p className="stat">{num(week.length)}</p><p className="stat__label">last 7 days · {week.length ? (weekBugs ? `${num(weekBugs)} ${weekBugs === 1 ? "bug" : "bugs"} among them` : "no bugs among them") : "nothing new"}</p></div>
          <Split counts={counts} total={total} />
        </div>
        {total > 0 && (
          <div className="fb__filter">
            <div className="seg fb__seg" role="group" aria-label="Filter by type">
              <button type="button" aria-pressed={filter === "all"} onClick={() => pick("all")}>All<span className="fb__n">{num(total)}</span></button>
              {ORDER.map((k) => <button key={k} type="button" aria-pressed={filter === k} disabled={!counts[k]} onClick={() => pick(k)}><Icon name={TYPES[k][2]} size={14} />{TYPES[k][1]}<span className="fb__n">{num(counts[k])}</span></button>)}
            </div>
            {filtered.length > 0 && <span className="fb__count">{filtered.length > visible.length ? `Newest ${num(visible.length)} of ${num(filtered.length)}` : `${filter === "all" ? "All " : ""}${num(filtered.length)} ${filtered.length === 1 ? "report" : "reports"}`}</span>}
          </div>
        )}
        <section className="fb__block" aria-label="Latest feedback">
          {visible.length
            ? <ol className="fb__list">{visible.map((it) => <Item key={key(it)} it={it} now={now} open={open.has(key(it))} onToggle={() => toggle(key(it))} />)}</ol>
            : <p className="fb__none">{NONE[filter]}{filter === "all" && !total ? " Whatever people send from the app’s Send feedback sheet lands here." : ""}</p>}
          {filtered.length > shown && <div className="fb__foot"><button className="button button--sm" type="button" onClick={() => setShown((n) => n + PAGE)}>Show {num(Math.min(PAGE, filtered.length - shown))} more</button></div>}
        </section>
      </>}
    </div>
  );
}
