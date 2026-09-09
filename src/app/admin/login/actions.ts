"use server";

import { redirect } from "next/navigation";
import { loginAdmin } from "@/lib/admin-auth";
import { adminLoginSchema } from "@/lib/validators";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = adminLoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const result = await loginAdmin(parsed.data.username, parsed.data.password);

  if (!result.ok) return { error: result.error };

  const target = formData.get("next");
  redirect(typeof target === "string" && (target === "/admin" || target.startsWith("/admin/")) ? target : "/admin");
}
