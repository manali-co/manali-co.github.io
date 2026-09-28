"use client";
import { useState, useTransition } from "react";
import { announce } from "./actions";

import type { AnnouncePost as PostLite, AnnounceResult } from "@/lib/backend";

/* Pick the latest post, preview the email, confirm, send. Two clicks on purpose. */
export function AnnounceCard({ post, lastEmail }: { post: PostLite | null; lastEmail?: { subject: string; sent: string; recipients: number } }) {
  const [step, setStep] = useState<"idle" | "confirm" | "done" | "already" | "error">("idle");
  const [result, setResult] = useState<{ recipients: number; subscribers: number } | null>(null);
  const [pending, start] = useTransition();
  const alreadySent = post && lastEmail?.subject === post.title;
  const send = (force = false) => start(async () => {
    const r: AnnounceResult = await announce({ ...post!, force });
    if ("error" in r) setStep(r.error === "already" ? "already" : "error");
    else { setResult(r); setStep("done"); }
  });
  return (
    <div className="panel">
      <h2 className="panel__title">Send announcement</h2>
      {!post ? (
        <p className="muted">No posts yet.</p>
      ) : (
        <>
          <p className="muted">Latest post</p>
          <div className="list" style={{ gap: 4 }}>
            <strong>{post.title}</strong>
            <span className="muted">{post.summary}</span>
            <span className="muted">by {post.author}</span>
          </div>
          {alreadySent && step === "idle" && <p className="subscribe__status subscribe__status--ok">This one already went out.</p>}
          {step === "idle" && <p><button className="button button--sm" type="button" onClick={() => setStep("confirm")}>Preview and send</button></p>}
          {step === "confirm" && (
            <>
              <p className="muted">Subject: <strong>{post.title}</strong>. Body: cover, title, summary, author, a “Read it” button, unsubscribe footer. Goes to every confirmed subscriber.</p>
              <p className="release__actions">
                <button className="button button--primary button--sm" type="button" disabled={pending} onClick={() => send()}>{pending ? "Sending…" : "Yes, send it"}</button>
                <button className="button button--sm" type="button" onClick={() => setStep("idle")}>Not now</button>
              </p>
            </>
          )}
          {step === "done" && result && <p className="subscribe__status subscribe__status--ok">Accepted for {result.recipients} of {result.subscribers} subscribers.{result.recipients < result.subscribers ? " Some batches failed; the API logs say which." : ""}</p>}
          {step === "already" && (
            <>
              <p className="subscribe__status subscribe__status--ok">This post already went out. Send it again anyway?</p>
              <p className="release__actions">
                <button className="button button--sm" type="button" disabled={pending} onClick={() => send(true)}>{pending ? "Sending…" : "Yes, everyone gets it twice"}</button>
                <button className="button button--sm" type="button" onClick={() => setStep("idle")}>No</button>
              </p>
            </>
          )}
          {step === "error" && <p className="subscribe__status subscribe__status--err">The backend said no. Check that ADMIN_API_KEY is set here and MANALI_ADMIN_KEY on the API, then the API logs.</p>}
        </>
      )}
    </div>
  );
}
