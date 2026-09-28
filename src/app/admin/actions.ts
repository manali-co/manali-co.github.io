"use server";
import { requireOwner } from "@/lib/admin";
import { sendAnnouncement, type AnnouncePost } from "@/lib/backend";

export async function announce(post: AnnouncePost) {
  const { ok } = await requireOwner();
  if (!ok) return { error: "failed" as const };
  return sendAnnouncement(post);
}
