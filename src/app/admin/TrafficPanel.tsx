"use client";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import type { Telemetry, TelemetryRange } from "@/lib/backend";
import { telemetry, telemetryNow } from "./actions";

/* Ported from the design system (components/admin/TrafficPanel.jsx). Live telemetry from Application
   Insights, read by the API: who is on the site now (last 5 minutes, every 15s), then a 24h | 7d
   report every 2 minutes: tiles, views per bucket with people and error buckets, engagement
   (the comments funnel and other actions), top pages,
   breakdowns, browser errors, API routes. Polling pauses while the tab is hidden. */
const TZ = "America/New_York";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parts = (iso: string, o: Intl.DateTimeFormatOptions) => Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
const hm = (iso: string) => { const p = parts(iso, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); return `${p.hour}:${p.minute}`; };
const hourOf = (iso: string) => Number(parts(iso, { hour: "2-digit", hourCycle: "h23" }).hour);
const dayMonth = (iso: string) => { const p = parts(iso, { day: "numeric", month: "numeric" }); return `${p.day} ${MONTHS[Number(p.month) - 1]}`; };
const weekday = (iso: string) => parts(iso, { weekday: "short" }).weekday;
const dayShort = (iso: string) => `${weekday(iso)} ${parts(iso, { day: "numeric" }).day}`;
const dayLong = (iso: string) => `${weekday(iso)} ${dayMonth(iso)}`;
const when = (iso: string) => `${dayMonth(iso)}, ${hm(iso)}`;
const num = (v: number) => Number(v || 0).toLocaleString("en-US");
const sec = (s: number) => `${s < 10 ? String(Math.round(s * 10) / 10) : String(Math.round(s))}s`;
const pct = (v: number) => `${Math.round(v || 0)}%`;
const plural = (k: number, one: string, many: string) => `${num(k)} ${k === 1 ? one : many}`;
const nice = (m: number) => { if (m <= 5) return 5; const p = 10 ** Math.floor(Math.log10(m)); const f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
function bucketLabel(start: string, hours: number) {
  if (hours < 2) return `${dayLong(start)}, ${hm(start)}`;
  const end = hm(new Date(new Date(start).getTime() + hours * 3600e3).toISOString());
  return `${dayLong(start)}, ${hm(start)}–${end === "00:00" ? "24:00" : end}`;
}

type Bucket = { start: string; views: number; people: number; errors: number };
type Live = { count: number; pages: { path: string; people: number }[] };

function Live({ live }: { live: Live | null }) {
  if (!live) return <div className="traffic__live traffic__live--empty" aria-busy="true"><span className="skel" style={{ width: 240, maxWidth: "100%", height: 22 }} /></div>;
  const c = live.count;
  const pages = c > 0 ? live.pages : [];
  return (
    <div className={`traffic__live${pages.length ? "" : " traffic__live--empty"}`} aria-live="polite">
      <div className="traffic__live-head">
        <span className={`traffic__pulse${c ? "" : " traffic__pulse--idle"}`} aria-hidden="true" />
        <span className="traffic__live-count">{c ? (c === 1 ? "1 person on the site now" : `${num(c)} people on the site now`) : "Nobody right now."}</span>
        <span className="traffic__live-note">last 5 minutes</span>
      </div>
      {pages.length > 0 && <ul className="traffic__live-pages" aria-label="Pages they're on">{pages.map((p) => <li key={p.path}><span className="traffic__path" title={p.path}>{p.path}</span><span className="traffic__num">{num(p.people)}</span></li>)}</ul>}
    </div>
  );
}

function Tiles({ t }: { t: Telemetry["totals"] }) {
  const tiles = [
    { label: "Page views", value: num(t.pageviews) },
    { label: "People", value: num(t.people) },
    { label: "Sessions", value: num(t.sessions) },
    // the API sums engaged seconds; the tile is per view
    { label: "Avg engaged time", value: sec(t.pageviews ? t.seconds / t.pageviews : 0), note: "per view" },
    { label: "Avg reading depth", value: pct(t.depth) },
    { label: "Browser errors", value: num(t.errors), bad: t.errors > 0 },
    { label: "API calls", value: num(t.calls), note: t.failed ? `${num(t.failed)} failed` : "none failed", badNote: t.failed > 0 },
  ];
  return (
    <div className="traffic__tiles">
      {tiles.map((x) => (
        <div key={x.label} className="traffic__tile">
          <span className="traffic__tile-label">{x.bad && <span className="traffic__tile-dot" aria-hidden="true" />}{x.label}</span>
          <span className="traffic__tile-value">{x.value}</span>
          {x.note && <span className={`traffic__tile-note${x.badNote ? " is-bad" : ""}`}>{x.note}</span>}
        </div>
      ))}
    </div>
  );
}

function Chart({ buckets, bucketHours }: { buckets: Bucket[]; bucketHours: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((es) => setW(Math.round(es[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const compact = w < 600;
  const H = compact ? 184 : 232, L = 36, T = 12, B = 40;
  const plotW = Math.max(0, w - L), plotH = H - T - B, base = T + plotH;
  const max = nice(Math.max(1, ...buckets.map((b) => Math.max(b.views, b.people))));
  const slot = buckets.length ? plotW / buckets.length : 0;
  const bw = Math.max(2, Math.min(slot * 0.64, 24));
  const cx = (i: number) => L + i * slot + slot / 2;
  const y = (v: number) => base - (v / max) * plotH;
  const line = buckets.map((b, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)} ${y(b.people).toFixed(1)}`).join(" ");
  const ticks = buckets.flatMap((b, i) => {
    const h = hourOf(b.start);
    if (bucketHours >= 6) return h === 0 ? [{ i, text: compact ? weekday(b.start) : dayShort(b.start) }] : [];
    return h % 6 === 0 ? [{ i, text: hm(b.start) }] : [];
  });
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!slot) return;
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left - L) / slot);
    setActive(i >= 0 && i < buckets.length ? i : null);
  };
  const b = active != null ? buckets[active] : null;
  const tipW = 212;
  const tipLeft = b && active != null ? Math.min(Math.max(cx(active) - tipW / 2, 0), Math.max(0, w - tipW)) : 0;
  const total = buckets.reduce((s, d) => s + d.views, 0);
  return (
    <div ref={ref} className="traffic__chart" style={{ height: H }}>
      {w > 0 && (
        <svg className={`traffic__svg${b ? " has-active" : ""}`} width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label={`${plural(total, "page view", "page views")} across ${buckets.length} buckets. Hover or tap for each one.`}
          onPointerMove={pick} onPointerDown={pick} onPointerLeave={(e) => { if (e.pointerType === "mouse") setActive(null); }}>
          {[0, max / 2, max].map((v) => (
            <g key={`y${v}`}>
              <line className="traffic__grid" x1={L} x2={w} y1={y(v)} y2={y(v)} />
              <text className="traffic__axis" x={L - 10} y={y(v)} dy="0.35em" textAnchor="end">{num(v)}</text>
            </g>
          ))}
          {ticks.map((t) => (
            <g key={`x${t.i}`}>
              <line className="traffic__grid" x1={L + t.i * slot} x2={L + t.i * slot} y1={base} y2={base + 12} />
              <text className="traffic__axis" x={L + t.i * slot + 4} y={base + 30}>{t.text}</text>
            </g>
          ))}
          {b && active != null && <line className="traffic__guide" x1={cx(active)} x2={cx(active)} y1={T} y2={base} />}
          {buckets.map((d, i) => (d.views > 0 ? <rect key={`b${i}`} className={`traffic__bar${i === active ? " is-active" : ""}`} x={cx(i) - bw / 2} y={y(d.views)} width={bw} height={base - y(d.views)} rx={Math.min(2, bw / 2)} /> : null))}
          {buckets.map((d, i) => (d.errors > 0 ? <rect key={`e${i}`} className="traffic__err" x={cx(i) - bw / 2} y={base + 3} width={bw} height={5} rx={1.5} /> : null))}
          <path className="traffic__line" d={line} />
          {b && active != null && <circle className="traffic__dot" cx={cx(active)} cy={y(b.people)} r={3.5} />}
        </svg>
      )}
      {b && (
        <div className="traffic__tip" role="status" style={{ left: tipLeft, width: tipW }}>
          <span className="traffic__tip-time">{bucketLabel(b.start, bucketHours)}</span>
          <span>{plural(b.views, "page view", "page views")} · {plural(b.people, "person", "people")}</span>
          {b.errors > 0 && <span className="is-bad">{plural(b.errors, "browser error", "browser errors")}</span>}
        </div>
      )}
    </div>
  );
}

const Depth = ({ v }: { v: number }) => (
  <span className="depth"><span className="depth__track"><span className="depth__fill" style={{ width: `${Math.max(2, Math.min(100, v || 0))}%` }} /></span><span className="depth__val">{pct(v)}</span></span>
);

function Pages({ pages }: { pages: Telemetry["pages"] }) {
  if (!pages.length) return <p className="traffic__none">No page views yet.</p>;
  return (
    <ul className="traffic__pages">
      <li className="traffic__page traffic__page--head" aria-hidden="true"><span>Page</span><span className="traffic__num traffic__wide">Views</span><span className="traffic__num traffic__wide">People</span><span className="traffic__num traffic__wide">Engaged</span><span>Reading depth</span></li>
      {pages.map((p) => (
        <li key={p.page} className="traffic__page">
          <span className="traffic__path" title={p.page}>{p.page}</span>
          <span className="traffic__num traffic__wide">{num(p.pageviews)}</span>
          <span className="traffic__num traffic__wide">{num(p.people)}</span>
          <span className="traffic__num traffic__wide">{sec(p.seconds)}</span>
          <span className="traffic__page-meta">{num(p.pageviews)} views · {num(p.people)} people · {sec(p.seconds)}</span>
          <Depth v={p.depth} />
        </li>
      ))}
    </ul>
  );
}

function BarList({ items, mono }: { items: { label: string; v: number; extra?: string }[]; mono?: boolean }) {
  if (!items.length) return <p className="traffic__none">None yet.</p>;
  const max = Math.max(1, ...items.map((x) => x.v));
  return (
    <ul className="barlist">
      {items.map((x) => (
        <li key={x.label} className="barlist__item">
          <span className={`barlist__label${mono ? " barlist__label--mono" : ""}`} title={x.label}>{x.label}</span>
          <span className="barlist__value"><b>{num(x.v)}</b>{x.extra ? ` · ${x.extra}` : ""}</span>
          <span className="barlist__track" aria-hidden="true"><span className="barlist__fill" style={{ width: `${(x.v / max) * 100}%` }} /></span>
        </li>
      ))}
    </ul>
  );
}

/* Comments funnel: four steps, bars sized against step 1, the step-to-step rate between them. */
type Step = { people: number; count: number };
function Funnel({ e, countedFrom }: { e: Telemetry["engagement"]; countedFrom: string | null }) {
  const read = e.read.people, reached = e.reached.people, started = e.started.people, posted = e.posted.people;
  if (!read) return <p className="traffic__none">No one has read a post in this range yet.</p>;
  const steps: [string, number, string][] = [["Read a post", read, "Opened any blog post"], ["Reached the comments", reached, "The comment section came into view"], ["Started a comment", started, "Typed in the composer"], ["Posted", posted, "Public comment or private note sent"]];
  const rates: [number, number, string][] = [[read, reached, "reached the comments"], [reached, started, "started a comment"], [started, posted, "posted"]];
  const rate = ([a, b, l]: [number, number, string]) => (a ? `${Math.round((b / a) * 100)}% ${l}` : "—");
  return (
    <>
      <ol className="funnel">
        {steps.map(([l, v, hint], i) => (
          <Fragment key={l}>
            <li className={`funnel__step${v ? "" : " is-zero"}`}>
              <span className="funnel__label" title={hint}>{l}</span>
              <span className="funnel__value"><b>{num(v)}</b>{i > 0 && <span className="funnel__share"> · {Math.round((v / read) * 100)}%</span>}</span>
              <span className="funnel__track" aria-hidden="true"><span className="funnel__fill" style={{ width: `${v ? Math.max(1.5, (v / read) * 100) : 0}%` }} /></span>
            </li>
            {i < 3 && <li className="funnel__rate" aria-label={`Step to step: ${rate(rates[i])}`}>{rate(rates[i])}</li>}
          </Fragment>
        ))}
      </ol>
      {countedFrom && <p className="traffic__note">Reaching and starting a comment are counted from {countedFrom}.</p>}
    </>
  );
}

const ACTIONS: [keyof Telemetry["engagement"], string][] = [["reacted", "Reacted"], ["subscribed", "Subscribed"], ["followed", "Followed a series"], ["loved", "Loved a comment"], ["waitlist", "Joined the waitlist"]];

function Devices({ devices }: { devices: Telemetry["devices"] }) {
  const count = (k: string) => devices.find((d) => d.device === k)?.pageviews || 0;
  const a = count("phone"), b = count("laptop"), t = a + b;
  if (!t) return <p className="traffic__none">None yet.</p>;
  const share = (v: number) => `${Math.round((v / t) * 100)}%`;
  return (
    <>
      <div className="split" role="img" aria-label={`Phone ${a}, laptop ${b}`}>
        {a > 0 && <span className="split__part split__part--a" style={{ flex: a }} />}
        {b > 0 && <span className="split__part split__part--b" style={{ flex: b }} />}
      </div>
      <ul className="split__legend">
        <li><span className="split__dot split__part--a" /><span>Phone</span><span className="barlist__value"><b>{num(a)}</b> · {share(a)}</span></li>
        <li><span className="split__dot split__part--b" /><span>Laptop</span><span className="barlist__value"><b>{num(b)}</b> · {share(b)}</span></li>
      </ul>
    </>
  );
}

/* The reach/start events began on a known day; say so only while the range reaches back before it. */
function countedFrom(r: Telemetry) {
  const from = r.engagement.countedFrom;
  if (!from) return null; // unknown: say nothing rather than guess a date
  const rangeStart = new Date(r.series[0]?.t || from).getTime();
  return new Date(from).getTime() > rangeStart ? dayMonth(from) : null;
}

function Report({ r }: { r: Telemetry }) {
  const hours = r.step === "1h" ? 1 : 6;
  const buckets: Bucket[] = r.series.map((s) => ({ start: s.t, views: s.pageviews, people: s.people, errors: s.errors }));
  return (
    <>
      <Tiles t={r.totals} />
      <section className="traffic__block">
        <div className="traffic__chart-head">
          <h3 className="traffic__h">{hours < 2 ? "Page views per hour" : "Page views per 6 hours"}</h3>
          <ul className="traffic__legend"><li><span className="traffic__key traffic__key--bar" />Page views</li><li><span className="traffic__key traffic__key--line" />People</li><li><span className="traffic__key traffic__key--err" />Browser errors</li></ul>
        </div>
        <Chart key={r.range} buckets={buckets} bucketHours={hours} />
      </section>
      <section className="traffic__block">
        <h3 className="traffic__h">Engagement</h3>
        <div className="traffic__engage">
          <div className="traffic__group"><h4 className="traffic__sub">Comments</h4><Funnel e={r.engagement} countedFrom={countedFrom(r)} /></div>
          <div className="traffic__group"><h4 className="traffic__sub">Other actions</h4><BarList items={ACTIONS.map(([k, label]) => { const a = r.engagement[k] as Step; return { label, v: a.people, extra: a.count !== a.people ? plural(a.count, "time", "times") : "" }; })} /></div>
        </div>
      </section>
      <section className="traffic__block"><h3 className="traffic__h">Top pages</h3><Pages pages={r.pages} /></section>
      <section className="traffic__block traffic__breakdowns">
        <div className="traffic__group"><h3 className="traffic__h">Referrers</h3><BarList items={r.referrers.map((x) => ({ label: x.host, v: x.pageviews }))} /></div>
        <div className="traffic__group"><h3 className="traffic__h">Devices</h3><Devices devices={r.devices} /></div>
        <div className="traffic__group"><h3 className="traffic__h">Browsers</h3><BarList items={r.browsers.map((x) => ({ label: x.browser || "Unknown", v: x.people }))} /></div>
        <div className="traffic__group"><h3 className="traffic__h">Countries</h3><BarList items={r.countries.map((x) => ({ label: x.country || "Unknown", v: x.people }))} /></div>
        <div className="traffic__group"><h3 className="traffic__h">Events</h3><BarList mono items={r.events.map((x) => ({ label: x.name, v: x.count, extra: plural(x.people, "person", "people") }))} /></div>
        <div className="traffic__group"><h3 className="traffic__h">Outbound clicks</h3><BarList items={r.outbound.map((x) => ({ label: x.host, v: x.count }))} /></div>
      </section>
      <section className="traffic__block traffic__pair">
        <div className="traffic__group">
          <h3 className="traffic__h">Browser errors</h3>
          {r.errors.length ? <ul className="traffic__errors">{r.errors.map((e) => <li key={e.problemId}><span className="traffic__error-msg">{e.message || e.problemId}</span><span className="traffic__error-meta">{plural(e.count, "time", "times")} · {plural(e.people, "person", "people")} · last seen {when(e.latest)}</span></li>)}</ul> : <p className="traffic__none">No browser errors.</p>}
        </div>
        <div className="traffic__group">
          <h3 className="traffic__h">API routes</h3>
          <div className="traffic__scroll">
            <table className="dtable">
              <thead><tr><th>Route</th><th className="num">Calls</th><th className="num">Failed</th><th className="num">p95</th></tr></thead>
              <tbody>{r.api.map((a) => <tr key={a.route}><td className="mono">{a.route}</td><td className="num">{num(a.calls)}</td><td className={`num${a.failed > 0 ? " is-bad" : ""}`}>{num(a.failed)}</td><td className="num">{num(a.p95)} ms</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}

function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading telemetry" style={{ display: "grid", gap: "var(--space-5)" }}>
      <div className="traffic__tiles">{Array.from({ length: 7 }, (_, i) => <div key={i} className="traffic__tile"><span className="skel" style={{ width: "70%", height: 14 }} /><span className="skel" style={{ width: "45%", height: 28 }} /></div>)}</div>
      <section className="traffic__block"><span className="skel" style={{ width: 160, height: 16 }} /><span className="skel" style={{ height: 184, borderRadius: "var(--radius-md)" }} /></section>
      <section className="traffic__block">{[0, 1, 2].map((i) => <span key={i} className="skel" style={{ height: 18, width: `${100 - i * 18}%` }} />)}</section>
    </div>
  );
}

function PanelState({ icon = "activity", bad, title, text, action }: { icon?: string; bad?: boolean; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="panel-state" role={bad ? "alert" : undefined}>
      <span className={`panel-state__icon${bad ? " panel-state__icon--bad" : ""}`} aria-hidden="true"><Icon name={icon} size={16} /></span>
      <div className="panel-state__body"><p className="panel-state__title">{title}</p>{text && <p className="panel-state__text">{text}</p>}{action}</div>
    </div>
  );
}

/* Runs `fn` now and every `ms`, skipping ticks while the tab is hidden and catching up on return. */
function usePoll(fn: () => void, ms: number, deps: unknown[]) {
  const saved = useRef(fn);
  useEffect(() => { saved.current = fn; });
  useEffect(() => {
    saved.current();
    const tick = () => { if (document.visibilityState === "visible") saved.current(); };
    const id = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

type State = { s: "loading" } | { s: "ready"; r: Telemetry; at: string; stale?: string } | { s: "unconfigured" } | { s: "error"; why: string };
const NOT_OWNER = "Not signed in as the owner.";

export function TrafficPanel() {
  const [range, setRange] = useState<TelemetryRange>("24h");
  const [state, setState] = useState<State>({ s: "loading" });
  const [live, setLive] = useState<Live | null>(null);
  const [nonce, setNonce] = useState(0);
  const seq = useRef(0);

  const load = useCallback(async (r: TelemetryRange) => {
    const mine = ++seq.current; // a slow 24h answer must not land after the 7d one asked for later
    const res = await telemetry(r).catch(() => ({ ok: false as const, reason: "the site didn't answer" }));
    if (mine !== seq.current) return;
    // a failed refresh keeps the report on screen, marked stale; a lost sign-in never hides behind it
    if (!res.ok) setState((p) => (p.s === "ready" && res.reason !== NOT_OWNER ? { ...p, stale: res.reason } : { s: "error", why: res.reason }));
    else if (!res.data.configured) setState({ s: "unconfigured" });
    else setState({ s: "ready", r: res.data, at: new Date().toISOString() });
  }, []);
  usePoll(() => { void load(range); }, 120_000, [range, nonce, load]);
  usePoll(() => {
    telemetryNow().then((res) => {
      if (res.ok && res.data.configured) setLive({ count: res.data.people, pages: res.data.pages.map((p) => ({ path: p.page, people: p.people })) });
    }).catch(() => {});
  }, 15_000, []);

  const pickRange = (k: TelemetryRange) => { if (k !== range) { setState({ s: "loading" }); setRange(k); } };
  const s = state.s;
  return (
    <div className="panel traffic" style={{ gap: "var(--space-5)" }}>
      <div className="ann__top">
        <h2 className="panel__title">Traffic</h2>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-3)" }}>Visitors only, from Application Insights</span>
      </div>
      {s === "unconfigured" && <PanelState title="Telemetry isn't connected" text="Connect Application Insights to the API and page views, people and errors show up here." />}
      {state.s === "error" && <PanelState bad icon="alert" title={`Couldn't read telemetry: ${state.why}`} action={<button className="button button--sm" type="button" onClick={() => { setState({ s: "loading" }); setNonce((n) => n + 1); }}>Try again</button>} />}
      {(s === "ready" || s === "loading") && <>
        <Live live={live} />
        <div className="traffic__controls">
          <div className="seg" role="group" aria-label="Range">{(["24h", "7d"] as const).map((k) => <button key={k} type="button" aria-pressed={range === k} onClick={() => pickRange(k)}>{k}</button>)}</div>
          <span className={`traffic__updated${state.s === "ready" && state.stale ? " is-bad" : ""}`} role={state.s === "ready" && state.stale ? "status" : undefined}>{state.s === "ready" ? `Last updated ${hm(state.at)}${state.stale ? ` · couldn't refresh: ${state.stale}` : ""}` : "Loading…"}</span>
        </div>
        {state.s === "ready" ? <Report r={state.r} /> : <Loading />}
      </>}
    </div>
  );
}
