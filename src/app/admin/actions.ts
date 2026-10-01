"use server";
import { requireOwner } from "@/lib/admin";
import { adminDataTable, adminTelemetry, adminTelemetryNow, deleteReply, moderateComment, ownerComment, previewAnnouncement, sendAnnouncement, type AnnouncePost, type TelemetryRange } from "@/lib/backend";
import { revalidatePath } from "next/cache";

export async function announce(post: AnnouncePost) {
  const { ok } = await requireOwner();
  if (!ok) return { error: "failed" as const };
  const r = await sendAnnouncement(post);
  revalidatePath("/admin/");
  return r;
}

export async function previewEmail(post: AnnouncePost, theme: "light" | "dark") {
  const { ok } = await requireOwner();
  if (!ok) return null;
  return previewAnnouncement(post, theme);
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

/* Read-only, polled by the Traffic panel. */
export async function telemetry(range: TelemetryRange) {
  const { ok } = await requireOwner();
  if (!ok) return { ok: false as const, reason: "Not signed in as the owner." };
  return adminTelemetry(range === "7d" ? "7d" : "24h");
}

export async function telemetryNow() {
  const { ok } = await requireOwner();
  if (!ok) return { ok: false as const, reason: "Not signed in as the owner." };
  return adminTelemetryNow();
}

export async function storedRows(table: string, offset: number) {
  const { ok } = await requireOwner();
  if (!ok) return null;
  return adminDataTable(table, offset);
}
