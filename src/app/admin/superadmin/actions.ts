"use server";

import { resetAdminPasswordBySuperAdmin } from "@/db/queries/auth";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { superAdminResetPasswordSchema } from "@/lib/validators";

export type SuperAdminResetState = { ok?: boolean; error?: string };

export async function superAdminResetPasswordAction(
  input: unknown,
): Promise<SuperAdminResetState> {
  const session = await requireSuperAdmin();
  const parsed = superAdminResetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa las contraseñas." };
  }

  const result = await resetAdminPasswordBySuperAdmin(
    session.uid,
    "admin",
    parsed.data.newPassword,
  );
  if (!result.ok) return { error: result.error };
  return { ok: true };
}
