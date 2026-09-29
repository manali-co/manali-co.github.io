"use server";
import { requireOwner } from "@/lib/admin";
import { deleteReply, moderateComment, ownerComment, sendAnnouncement, type AnnouncePost } from "@/lib/backend";
import { revalidatePath } from "next/cache";

export async function announce(post: AnnouncePost) {
  const { ok } = await requireOwner();
  if (!ok) return { error: "failed" as const };
  return sendAnnouncement(post);
}

export async function removeReply(form: FormData) {
  const { ok } = await requireOwner();
  if (!ok) return;
  await deleteReply(String(form.get("slug") || ""), String(form.get("id") || ""));
  revalidatePath("/admin/");
}

export type ActionResult = { ok: boolean; error?: string; text?: string };

export async function moderate(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const { ok } = await requireOwner();
  if (!ok) return { ok: false, error: "Not signed in as the owner." };
  const action = String(form.get("action") || "");
  if (action !== "approve" && action !== "remove") return { ok: false, error: "Unknown action." };
  if (!(await moderateComment(String(form.get("slug") || ""), String(form.get("id") || ""), action))) {
    return { ok: false, error: `Couldn't ${action} it. The backend didn't take it; try again.` };
  }
  revalidatePath("/admin/");
  return { ok: true };
}

/* Reply on the site as the author: live at once, marked Author, and it emails the reader if they
   asked for replies. On failure the text comes back so nothing typed is lost. */
export async function replyAsOwner(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const text = String(form.get("text") || "").trim();
  const { ok } = await requireOwner();
  if (!ok) return { ok: false, error: "Not signed in as the owner.", text };
  if (!text) return { ok: false, error: "Write something first.", text };
  if (!(await ownerComment(String(form.get("slug") || ""), text.slice(0, 2000), String(form.get("id") || ""), String(form.get("title") || "")))) {
    return { ok: false, error: "Couldn't post the reply. It's still here; try again.", text };
  }
  revalidatePath("/admin/");
  return { ok: true };
}
