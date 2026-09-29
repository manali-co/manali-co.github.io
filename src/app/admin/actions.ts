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

export async function moderate(form: FormData) {
  const { ok } = await requireOwner();
  if (!ok) return;
  const action = String(form.get("action") || "");
  if (action !== "approve" && action !== "remove") return;
  await moderateComment(String(form.get("slug") || ""), String(form.get("id") || ""), action);
  revalidatePath("/admin/");
}

/* Reply on the site as the author: live at once, marked Author, and it emails the reader if they
   asked for replies. */
export async function replyAsOwner(form: FormData) {
  const { ok } = await requireOwner();
  if (!ok) return;
  const text = String(form.get("text") || "").trim();
  if (!text) return;
  await ownerComment(String(form.get("slug") || ""), text.slice(0, 2000), String(form.get("id") || ""), String(form.get("title") || ""));
  revalidatePath("/admin/");
}
