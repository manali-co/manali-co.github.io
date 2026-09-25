"use client";
import { useState, useTransition } from "react";
import { announce } from "./actions";

import type { AnnouncePost as PostLite } from "@/lib/backend";

/* Pick the latest post, preview the email, confirm, send. Two clicks on purpose. */
export function AnnounceCard({ post, lastEmail }: { post: PostLite | null; lastEmail?: { subject: string; sent: string; recipients: number } }) {
  const [step, setStep] = useState<"idle" | "confirm" | "done" | "error">("idle");
  const [result, setResult] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const alreadySent = post && lastEmail?.subject === post.title;
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
                <button className="button button--primary button--sm" type="button" disabled={pending} onClick={() => start(async () => { const r = await announce(post); if (r) { setResult(r.recipients); setStep("done"); } else setStep("error"); })}>{pending ? "Sending…" : "Yes, send it"}</button>
                <button className="button button--sm" type="button" onClick={() => setStep("idle")}>Not now</button>
              </p>
            </>
          )}
          {step === "done" && <p className="subscribe__status subscribe__status--ok">Sent to {result} people.</p>}
          {step === "error" && <p className="subscribe__status subscribe__status--err">The backend said no. Check the API logs.</p>}
        </>
      )}
    </div>
  );
}
