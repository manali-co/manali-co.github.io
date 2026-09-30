"use server";
import { redirect } from "next/navigation";
import { unsubscribe } from "@/lib/backend";
import { seriesTitle } from "@/lib/series";

export async function unsubscribeAction(form: FormData) {
  const token = String(form.get("token") || "");
  const raw = String(form.get("series") || "");
  const series = raw && seriesTitle(raw) ? raw : undefined; // only a real series slug goes to the API
  const r = token ? await unsubscribe(token, series) : { scope: "all" as const };
  // The API never says whether the token matched; neither do we. Either way, no more email.
  redirect(series && r.scope === "series" ? `/unsubscribe/?done=series&series=${series}` : "/unsubscribe/?done=1");
}
