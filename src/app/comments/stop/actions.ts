"use server";
import { redirect } from "next/navigation";
import { stopCommentEmails } from "@/lib/backend";

/* Says "done" only when the API took the request. A malformed link or a failed call comes back to
   the same page with an error and the button, so the reader can try again. */
export async function stopAction(form: FormData) {
  const post = String(form.get("post") || ""), id = String(form.get("id") || ""), token = String(form.get("token") || "");
  const valid = /^[a-z0-9][a-z0-9-]{0,120}$/.test(post) && /^\d{13}-[0-9a-f]{6}$/.test(id) && /^[0-9a-f]{32}$/.test(token);
  if (!valid) redirect("/comments/stop/?error=link");
  if (!(await stopCommentEmails(post, id, token))) {
    redirect(`/comments/stop/?error=retry&post=${encodeURIComponent(post)}&id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`);
  }
  redirect(`/comments/stop/?done=1&post=${encodeURIComponent(post)}`);
}
