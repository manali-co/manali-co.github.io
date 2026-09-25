"use server";
import { requireOwner } from "@/lib/admin";
import { sendAnnouncement } from "@/lib/backend";

export async function announce(post: { slug: string; title: string; summary: string; url: string; cover?: string; author: string }) {
  const { ok } = await requireOwner();
  if (!ok) return null;
  return sendAnnouncement(post);
}
