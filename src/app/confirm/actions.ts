"use server";
import { redirect } from "next/navigation";
import { confirm } from "@/lib/backend";

export async function confirmAction(form: FormData) {
  const token = String(form.get("token") || "");
  const ok = token ? await confirm(token) : false;
  redirect(ok ? "/confirm/?result=ok" : "/confirm/?result=no");
}
