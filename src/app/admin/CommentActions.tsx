"use client";
import { useActionState } from "react";
import { moderate, replyAsOwner, type ActionResult } from "./actions";

/* Moderation and "reply as the author" for one comment. Failures show next to the buttons, and a
   failed reply keeps its text. */
export function CommentActions({ slug, id, title, pending, canReply }: { slug: string; id: string; title: string; pending: boolean; canReply: boolean }) {
  const [mod, modAction, modBusy] = useActionState<ActionResult, FormData>(moderate, { ok: true });
  const [rep, repAction, repBusy] = useActionState<ActionResult, FormData>(replyAsOwner, { ok: true });
  return (
    <>
      <span style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {pending && (
          <form action={modAction}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="approve" />
            <button className="button button--sm button--primary" type="submit" disabled={modBusy}>Approve</button></form>
        )}
        <form action={modAction}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="remove" />
          <button className="button button--sm" type="submit" disabled={modBusy}>Remove</button></form>
        {!mod.ok && <span role="alert" className="cc__status cc__status--err" style={{ flexBasis: "auto" }}>{mod.error}</span>}
      </span>
      {canReply && (
        <form action={repAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input type="hidden" name="slug" value={slug} /><input type="hidden" name="id" value={id} /><input type="hidden" name="title" value={title} />
          <label className="sr-only" htmlFor={`r-${id}`}>Reply as the author</label>
          <input key={rep.ok ? "sent" : "kept"} id={`r-${id}`} name="text" defaultValue={rep.ok ? "" : rep.text} className="cc__field" style={{ flex: "1 1 220px", height: 36, padding: "0 12px", fontSize: "var(--text-sm)" }} placeholder="Reply as the author…" maxLength={2000} />
          <button className="button button--sm" type="submit" disabled={repBusy}>{repBusy ? "Posting…" : "Reply"}</button>
          {!rep.ok && <span role="alert" className="cc__status cc__status--err">{rep.error}</span>}
        </form>
      )}
    </>
  );
}
