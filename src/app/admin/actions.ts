"use server";
import { requireOwner } from "@/lib/admin";
import { deleteReply, sendAnnouncement, type AnnouncePost } from "@/lib/backend";
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
