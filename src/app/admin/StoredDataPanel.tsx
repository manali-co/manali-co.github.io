"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import type { StoredTable, TablePage } from "@/lib/backend";
import { storedRows } from "./actions";

/* Ported from the design system (components/admin/StoredDataPanel.jsx). Every table the API keeps,
   one row each (name, purpose, row count, last change); opening one shows its rows as stored,
   newest first, 50 a page. Client ids and confirmation tokens arrive shortened from the API. */
const num = (v: number) => Number(v || 0).toLocaleString("en-US");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/* Relative to `now`, the server's render time, so server and browser print the same words. */
function relativeTime(iso: string | null, now: number) {
  if (!iso) return "never";
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) { const h = Math.round(s / 3600); return `${h} ${h === 1 ? "hour" : "hours"} ago`; }
  if (s < 172800) return "yesterday";
  if (s < 604800) return `${Math.round(s / 86400)} days ago`;
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", day: "numeric", month: "numeric" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `on ${p.day} ${MONTHS[Number(p.month) - 1]}`;
}
const LONG = 26;
const PAGE = 50;

function Rows({ table }: { table: string }) {
  const [offset, setOffset] = useState(0);
  const [got, setGot] = useState<{ key: string; page: TablePage | "error" } | null>(null);
  const [sel, setSel] = useState<{ row: number; col: string } | null>(null);
  const [nonce, setNonce] = useState(0);
  // rows belong to the request that fetched them; any other request still shows as loading
  const key = `${offset}|${nonce}`;
  useEffect(() => {
    let alive = true;
    storedRows(table, offset).then((d) => alive && setGot({ key, page: d || "error" })).catch(() => alive && setGot({ key, page: "error" }));
    return () => { alive = false; };
  }, [table, offset, key]);
  const data = got?.key === key ? got.page : null;
  const go = (o: number) => { setSel(null); setOffset(Math.max(0, o)); };
  if (!data) return <div className="stored__open" aria-busy="true" aria-label={`Loading ${table}`}>{[90, 100, 96, 100, 84].map((w, i) => <span key={i} className="skel" style={{ height: 20, width: `${w}%` }} />)}</div>;
  if (data === "error") return <div className="stored__open"><p className="stored__empty">Couldn&apos;t load these rows.</p><button className="button button--sm" type="button" onClick={() => setNonce((n) => n + 1)} style={{ justifySelf: "start" }}>Try again</button></div>;
  if (!data.total) return <div className="stored__open"><p className="stored__empty">Nothing stored yet</p></div>;
  const picked = sel && data.rows[sel.row] ? { col: sel.col, value: data.rows[sel.row][sel.col] } : null;
  const end = Math.min(offset + data.rows.length, data.total);
  return (
    <div className="stored__open">
      <p className="stored__note">Client ids and confirmation tokens are shortened; everything else is as stored.</p>
      <div className="stored__scroll" tabIndex={0} aria-label={`${table} rows, scrolls sideways`}>
        <table className="dtable dtable--mono">
          <thead><tr>{data.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={`${row.PartitionKey ?? ""}|${row.RowKey ?? i}`}>
                {data.columns.map((c) => {
                  const v = row[c];
                  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
                  if (!s) return <td key={c}><span className="stored__faint" title="Empty">—</span></td>;
                  if (data.masked.includes(c)) return <td key={c}><span className="stored__masked" title="Shortened on purpose">{s}</span></td>;
                  if (s.length > LONG) { const on = !!sel && sel.row === i && sel.col === c; return <td key={c}><button type="button" className="stored__cell" title={s} aria-pressed={on} onClick={() => setSel(on ? null : { row: i, col: c })}>{s}</button></td>; }
                  return <td key={c}>{s}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {picked && (
        <div className="stored__full" role="region" aria-label={`Full value of ${picked.col}`}>
          <span className="stored__full-col">{picked.col}</span>
          <button type="button" className="stored__full-close" aria-label="Close" onClick={() => setSel(null)}><Icon name="x" size={16} /></button>
          <p className="stored__full-val">{String(picked.value)}</p>
        </div>
      )}
      <div className="stored__pager">
        <span className="stored__range">{num(offset + 1)}–{num(end)} of {num(data.total)} · newest first</span>
        {data.total > PAGE && (
          <div className="stored__pager-buttons">
            <button className="button button--sm" type="button" disabled={offset === 0} onClick={() => go(offset - PAGE)}><Icon name="arrow-left" size={14} />Newer</button>
            <button className="button button--sm" type="button" disabled={end >= data.total} onClick={() => go(offset + PAGE)}>Older<Icon name="arrow-right" size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

export function StoredDataPanel({ tables, now }: { tables: StoredTable[] | null; now: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="panel stored">
      <div className="ann__top">
        <h2 className="panel__title">Stored data</h2>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-3)" }}>{tables ? `${tables.length} tables` : ""}</span>
      </div>
      {!tables ? (
        <div className="panel-state" role="alert">
          <span className="panel-state__icon panel-state__icon--bad" aria-hidden="true"><Icon name="alert" size={16} /></span>
          <div className="panel-state__body"><p className="panel-state__title">Couldn&apos;t reach the API.</p><p className="panel-state__text">Tables and rows show here when it answers again.</p><button className="button button--sm" type="button" onClick={() => router.refresh()}>Try again</button></div>
        </div>
      ) : tables.length ? (
        <ul className="stored__list">
          {tables.map((t) => {
            const isOpen = open === t.name;
            return (
              <li key={t.name} className="stored__item">
                <button type="button" className="stored__row" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.name)}>
                  <span className="stored__name">{t.name}</span>
                  <span className="stored__purpose">{t.purpose}</span>
                  <span className="stored__count">{t.count === 1 ? "1 row" : `${num(t.count)}${t.capped ? "+" : ""} rows`}</span>
                  <span className="stored__updated">{t.count ? `updated ${relativeTime(t.updated, now)}` : "nothing yet"}</span>
                  <span className="stored__chev" aria-hidden="true"><Icon name="chevron-down" size={16} /></span>
                </button>
                {isOpen && <Rows table={t.name} />}
              </li>
            );
          })}
        </ul>
      ) : <p className="stored__empty">No tables yet.</p>}
    </div>
  );
}
