"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { sendWelcome } from "./actions";
import type { WelcomeCounts } from "@/lib/waitlist-admin";

/* The "You're in" welcome-email strip on the waitlist panel (Claude Design: WaitlistPanel's
   Welcome). Delivery counts, then one action for people who joined before the email existed.
   The API never re-sends to anyone who already got it, bounced, complained or left. */

const num = (v: number) => Number(v || 0).toLocaleString("en-US");
const plural = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`;
const COUNTS: [keyof WelcomeCounts, string, boolean?][] = [["sent", "Sent"], ["delivered", "Delivered"], ["bounced", "Bounced", true], ["spam", "Marked as spam", true], ["left", "Left the line"], ["pending", "Not sent yet"]];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function sentAt(iso: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/New_York" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day} ${MONTHS[Number(p.month) - 1]}, ${p.hour}:${p.minute}`;
}
const sampleText = (list: string[], n: number) => {
  const shown = list.slice(0, 3), more = n - shown.length;
  return shown.join(", ") + (more > 0 ? `${shown.length ? " and " : ""}${num(more)} more` : "");
};

type Step = "idle" | "confirm" | "sending" | "done";
type Result = { sent: number; failed: number; reason?: string; at: string };

export function WaitlistWelcome({ counts, sample, ready, preview, total }: { counts: WelcomeCounts; sample: string[]; ready: boolean; preview: "ok" | "failed"; total: number }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const pending = counts.pending;

  const send = async () => {
    setStep("sending"); setError("");
    const r = await sendWelcome();
    if ("error" in r) {
      setError(r.error === "Email isn't set up." ? r.error
        : r.error === "unknown" ? "No answer in time, so some may have gone out. Refresh the counts before trying again; nobody gets it twice."
        : "Couldn't send. Nothing went out; try again.");
      setStep("confirm"); return;
    }
    setResult(r); setStep("done");
    router.refresh(); // pull the new statuses and counts from the API
  };

  return (
    <section className="wq__mail" aria-label="Welcome email">
      <div className="wq__mail-head"><h3 className="wq__h">Welcome email</h3><span className="wq__mail-from">&quot;You&apos;re in&quot; · from Disco &lt;disco@manali.page&gt; · sent automatically to new joiners</span></div>
      <dl className="wq__mail-counts">
        {COUNTS.map(([k, l, bad]) => { const v = counts[k] || 0; return <div key={k} className={`wq__mail-count${bad && v ? " is-bad" : ""}${v ? "" : " is-zero"}`}><dt>{l}</dt><dd>{num(v)}</dd></div>; })}
      </dl>
      {preview === "failed" && (
        <div className="wq__mail-action"><p className="wq__mail-warn" role="alert"><Icon name="alert" size={14} />Couldn&apos;t check who&apos;s waiting for it just now.</p><button type="button" className="button button--sm" onClick={() => router.refresh()}>Try again</button></div>
      )}
      {preview === "ok" && !ready && <p className="wq__mail-warn" role="alert"><Icon name="alert" size={14} />Email isn&apos;t set up: add <code className="wq__code">RESEND_API_KEY</code> on the API{pending ? `, then ${plural(pending, "person gets", "people get")} theirs` : ""}.</p>}
      {preview === "ok" && ready && step === "idle" && (pending
        ? <div className="wq__mail-action"><button type="button" className="button button--primary button--sm" onClick={() => { setStep("confirm"); setError(""); }}><Icon name="send" size={15} />Send the welcome email to {plural(pending, "person", "people")} who {pending === 1 ? "hasn't" : "haven't"} had it</button><span className="wq__mail-note">Skips anyone who already had it, bounced, complained or left.</span></div>
        : <p className="wq__mail-ok"><Icon name="check" size={14} />{total ? "No one is waiting for it." : "No one in line yet."}</p>)}
      {preview === "ok" && ready && step === "confirm" && (
        <div className="wq__confirm" role="alertdialog" aria-label="Confirm send">
          <p className="wq__confirm-text">Send to {plural(pending, "person", "people")}? This can&apos;t be undone.</p>
          <p className="wq__confirm-sample">{sampleText(sample, pending)}</p>
          <div className="wq__mail-action">
            <button type="button" className="button button--primary" onClick={send}>Yes, send it</button>
            <button type="button" className="button button--ghost" onClick={() => { setStep("idle"); setError(""); }}>Not yet</button>
            {error && <span role="alert" className="wq__mail-note is-bad">{error}</span>}
          </div>
        </div>
      )}
      {step === "sending" && (
        <div className="wq__progress" role="progressbar" aria-valuemin={0} aria-valuemax={pending} aria-label="Sending the welcome email">
          <span className="wq__progress-text">Sending to {plural(pending, "person", "people")}…</span>
          <span className="wq__progress-track" aria-hidden="true"><span className="wq__progress-fill wq__progress-fill--busy" /></span>
        </div>
      )}
      {step === "done" && result && (
        <div className="wq__mail-action">
          <p className={`wq__result${result.failed ? " is-bad" : ""}`} role="status">
            <Icon name={result.failed ? "alert" : "check"} size={14} />
            <span>Sent to {num(result.sent)}{result.failed ? ` · ${num(result.failed)} failed${result.reason ? ` (${result.reason})` : ""}` : ""} · {sentAt(result.at)}</span>
          </p>
          <button type="button" className="button button--ghost button--sm" onClick={() => { setStep("idle"); setResult(null); }}>{result.failed ? "Back" : "Done"}</button>
        </div>
      )}
    </section>
  );
}
