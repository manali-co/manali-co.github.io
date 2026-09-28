"use server";
import { redirect } from "next/navigation";
import { unsubscribe } from "@/lib/backend";

export async function unsubscribeAction(form: FormData) {
  const token = String(form.get("token") || "");
  if (token) await unsubscribe(token);
  // The API never says whether the token matched; neither do we. Either way, no more email.
  redirect("/unsubscribe/?done=1");
}
