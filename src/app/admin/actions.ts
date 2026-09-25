"use server";
import { requireOwner } from "@/lib/admin";
import { sendAnnouncement, type AnnouncePost } from "@/lib/backend";

export async function announce(post: AnnouncePost) {
  const { ok } = await requireOwner();
  if (!ok) return null;
  return sendAnnouncement(post);
}
