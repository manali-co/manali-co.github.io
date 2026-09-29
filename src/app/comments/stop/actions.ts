"use server";
import { redirect } from "next/navigation";
import { stopCommentEmails } from "@/lib/backend";

export async function stopAction(form: FormData) {
  const post = String(form.get("post") || ""), id = String(form.get("id") || ""), token = String(form.get("token") || "");
  if (/^[a-z0-9][a-z0-9-]{0,120}$/.test(post) && /^\d{13}-[0-9a-f]{6}$/.test(id) && /^[0-9a-f]{32}$/.test(token)) await stopCommentEmails(post, id, token);
  redirect(`/comments/stop/?done=1&post=${encodeURIComponent(post)}`);
}
