"use server";

import { redirect } from "next/navigation";
import { loginAdmin } from "@/lib/admin-auth";
import { adminLoginSchema } from "@/lib/validators";

/**
 * Freno simple de fuerza bruta, en memoria del proceso. Alcanza para un panel de
 * un solo dueño; si el panel crece o se despliega en varias instancias, esto
 * debería mudarse a la base o a un KV.
 */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = adminLoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const key = parsed.data.username.toLowerCase();
  const now = Date.now();
  const record = attempts.get(key);

  if (record && record.until > now && record.count >= MAX_ATTEMPTS) {
    const minutes = Math.ceil((record.until - now) / 60000);
    return { error: `Demasiados intentos. Prueba de nuevo en ${minutes} min.` };
  }

  const result = await loginAdmin(parsed.data.username, parsed.data.password);

  if (!result.ok) {
    const next = record && record.until > now ? record : { count: 0, until: now + WINDOW_MS };
    next.count += 1;
    attempts.set(key, next);
    return { error: result.error };
  }

  attempts.delete(key);
  const target = formData.get("next");
  redirect(typeof target === "string" && target.startsWith("/admin") ? target : "/admin");
}
