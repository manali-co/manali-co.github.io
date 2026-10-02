import { DiscoMark, type Mark } from "@/components/DiscoMark";
import { Icon } from "@/components/Icon";
import type { WaitlistPlatform, WaitlistSummary } from "@/lib/waitlist-admin";

/* What Should We Watch · Waitlist: people in line, iPhone | Android | not picked, joins per day
   over 14 days, the latest ten. A 1:1 port of Claude Design's components/admin/WaitlistPanel
   (Manali Apps Design System); classes are wq- (the waitlist page owns wl-). Server-rendered
   from waitlistSummary(), so the operator token never reaches the browser. */

const TZ = "America/New_York";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const num = (v: number) => Number(v || 0).toLocaleString("en-US");
const parts = (iso: string, o: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
const exactTime = (iso: string) => {
  const p = parts(iso, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${p.weekday} ${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}`;
};
const dayLabel = (ymd: string) => {
  const p = parts(`${ymd}T12:00:00Z`, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return `${p.weekday} ${p.day} ${p.month}`;
};
function relativeTime(iso: string, now: number) {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) { const h = Math.round(s / 3600); return `${h} ${h === 1 ? "hour" : "hours"} ago`; }
  if (s < 172800) return "yesterday";
  if (s < 604800) return `${Math.round(s / 86400)} days ago`;
  const p = parts(iso, { day: "numeric", month: "numeric" });
  return `on ${p.day} ${MONTHS[Number(p.month) - 1]}`;
}
const phoneLabel = (p: WaitlistPlatform) => (p === "ios" ? "iPhone" : p === "android" ? "Android" : "not picked");

const SLICES: [WaitlistPlatform, string, string][] = [["ios", "iPhone", "wq__slice--a"], ["android", "Android", "wq__slice--b"], ["none", "Not picked", "wq__slice--c"]];
const polar = (cx: number, cy: number, r: number, a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [x0, y0] = polar(cx, cy, r, a0), [x1, y1] = polar(cx, cy, r, a1);
  return `M${cx} ${cy}L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
}

/* Tiny counts stay legible: every non-zero slice gets at least 3°, taken from the largest. Zero draws an empty ring. */
function PhonePie({ phones, size = 120 }: { phones: Record<WaitlistPlatform, number>; size?: number }) {
  const vals = SLICES.map(([k]) => phones[k] || 0);
  const total = vals.reduce((s, v) => s + v, 0);
  const c = size / 2, r = c - 2;
  const label = total ? SLICES.map(([, l], i) => `${l} ${num(vals[i])}`).join(", ") : "Nobody in line yet";
  if (!total)
    return (
      <svg className="wq__pie wq__pie--empty" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
        <circle cx={c} cy={c} r={r - 1} /><text x={c} y={c} dy="0.35em" textAnchor="middle">0</text>
      </svg>
    );
  const MIN = (3 * Math.PI) / 180;
  let angles = vals.map((v) => (v / total) * 2 * Math.PI);
  const big = angles.indexOf(Math.max(...angles));
  angles = angles.map((a, i) => (vals[i] > 0 && a < MIN ? MIN : a));
  angles[big] = 2 * Math.PI - angles.reduce((s, a, i) => (i === big ? s : s + a), 0);
  const live = vals.filter((v) => v > 0).length;
  // where each slice starts: the running sum of the drawn slices before it
  const starts = angles.map((_, i) => angles.slice(0, i).reduce((s, x, j) => s + (vals[j] ? x : 0), 0));
  return (
    <svg className="wq__pie" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      {SLICES.map(([k, l, cls], i) => {
        if (!vals[i]) return null;
        const a0 = starts[i], a1 = a0 + angles[i];
        const tip = <title>{`${l}: ${num(vals[i])} · ${Math.round((vals[i] / total) * 100)}%`}</title>;
        return live === 1
          ? <circle key={k} className={`wq__slice ${cls}`} cx={c} cy={c} r={r}>{tip}</circle>
          : <path key={k} className={`wq__slice ${cls}`} d={arc(c, c, r, a0, a1)}>{tip}</path>;
      })}
    </svg>
  );
}

function Legend({ phones }: { phones: Record<WaitlistPlatform, number> }) {
  const total = SLICES.reduce((s, [k]) => s + (phones[k] || 0), 0);
  return (
    <ul className="wq__legend">
      {SLICES.map(([k, l, cls]) => {
        const v = phones[k] || 0;
        return (
          <li key={k} className={v ? "" : "is-zero"}>
            <span className={`wq__dot ${cls}`} aria-hidden="true" />
            <span>{l}</span>
            <span className="wq__legend-val"><b>{num(v)}</b> · {total ? Math.round((v / total) * 100) : 0}%</span>
          </li>
        );
      })}
    </ul>
  );
}

function Days({ days }: { days: WaitlistSummary["perDay"] }) {
  const max = Math.max(1, ...days.map((x) => x.joins));
  const sum = days.reduce((s, x) => s + x.joins, 0);
  const best = days.reduce<WaitlistSummary["perDay"][number] | null>((b, x) => (x.joins > (b ? b.joins : 0) ? x : b), null);
  return (
    <div className="wq__days-wrap">
      <div className="wq__days" role="img" aria-label={`${num(sum)} joined in the last 14 days`}>
        {days.map((x, i) => (
          <span key={x.day} className={`wq__day${x.joins ? "" : " wq__day--zero"}${i === days.length - 1 ? " is-today" : ""}`}
            style={{ height: x.joins ? `${Math.max(6, (x.joins / max) * 100)}%` : undefined }}
            title={`${dayLabel(x.day)}: ${x.joins === 1 ? "1 joined" : `${num(x.joins)} joined`}`} />
        ))}
      </div>
      <div className="wq__days-axis"><span>{days.length ? dayLabel(days[0].day) : ""}</span><span>today</span></div>
      <p className="wq__days-note">{sum ? `${num(sum)} in 14 days${best && best.joins > 1 ? ` · best day ${dayLabel(best.day)} (${num(best.joins)})` : ""}` : "No joins in the last 14 days."}</p>
    </div>
  );
}

function People({ latest, now }: { latest: WaitlistSummary["latest"]; now: number }) {
  if (!latest.length) return <p className="wq__none">Nobody yet. The page is live at manali.page/what-should-we-watch.</p>;
  return (
    <ol className="wq__people">
      <li className="wq__person wq__person--head" aria-hidden="true"><span>#</span><span /><span>Email</span><span>Phone</span><span className="wq__when">Joined</span></li>
      {latest.map((p) => (
        <li key={p.position} className="wq__person">
          <span className="wq__place">{num(p.position)}</span>
          <span className="wq__mark">{p.mark ? <DiscoMark mark={p.mark as Mark} size={20} /> : <span className="wq__mark-none" />}</span>
          <span className="wq__email" title={p.email}>{p.email}</span>
          <span className={`wq__phone${p.platform === "none" ? " is-none" : ""}`}>{phoneLabel(p.platform)}</span>
          <time className="wq__when" dateTime={p.joined} title={exactTime(p.joined)}>{relativeTime(p.joined, now)}</time>
          <span className="wq__meta">{phoneLabel(p.platform)} · <time dateTime={p.joined} title={exactTime(p.joined)}>{relativeTime(p.joined, now)}</time></span>
        </li>
      ))}
    </ol>
  );
}

export function WaitlistPanel({ data, now }: { data: WaitlistSummary | null; now: number }) {
  const week = data ? data.perDay.slice(-7).reduce((s, x) => s + x.joins, 0) : 0;
  return (
    <div className="panel wq">
      <div className="ann__top">
        <h2 className="panel__title">What Should We Watch · Waitlist</h2>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-3)" }}>{data ? "Pre-launch · App Store review" : ""}</span>
      </div>
      {!data ? (
        <div className="panel-state" role="alert">
          <span className="panel-state__icon panel-state__icon--bad" aria-hidden="true"><Icon name="alert" size={16} /></span>
          <div className="panel-state__body">
            <p className="panel-state__title">Waitlist not reachable.</p>
            <p className="panel-state__text">Set <code className="wq__code">WSWW_API_BASE_URL</code> and <code className="wq__code">WSWW_ADMIN_TOKEN</code> on the site.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="wq__top">
            <div>
              <p className="stat">{num(data.total)}</p>
              <p className="stat__label">in line · {data.total ? (week ? `+${num(week)} this week` : "none this week") : "nobody yet"}</p>
            </div>
            <div className="wq__pie-row"><PhonePie phones={data.platforms} /><Legend phones={data.platforms} /></div>
            <div className="wq__group"><h3 className="wq__h">Joins per day · 14 days</h3><Days days={data.perDay} /></div>
          </div>
          <section className="wq__block">
            <h3 className="wq__h">{data.total ? `Latest ${data.latest.length} of ${num(data.total)}` : "Latest"}</h3>
            <People latest={data.latest} now={now} />
          </section>
        </>
      )}
    </div>
  );
}
