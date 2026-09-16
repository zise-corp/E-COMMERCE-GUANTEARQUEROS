import { and, eq, sql } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { db } from "../index";
import { adminUsers, loginAttempts } from "../schema";
import type { AdminSession } from "@/lib/session";

const ARGON_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Upsert atómico: los ocho intentos se comparten entre todas las instancias. */
export async function reserveLoginAttempt(username: string): Promise<boolean> {
  const [attempt] = await db.insert(loginAttempts).values({
    key: username.toLowerCase(), count: 1, until: new Date(Date.now() + 10 * 60_000),
  }).onConflictDoUpdate({
    target: loginAttempts.key,
    set: {
      count: sql`CASE WHEN ${loginAttempts.until} <= now() THEN 1 ELSE ${loginAttempts.count} + 1 END`,
      until: sql`CASE WHEN ${loginAttempts.until} <= now() THEN now() + interval '10 minutes' ELSE ${loginAttempts.until} END`,
    },
    setWhere: sql`${loginAttempts.until} <= now() OR ${loginAttempts.count} < 8`,
  }).returning({ key: loginAttempts.key });
  return Boolean(attempt);
}

export async function isAdminSessionCurrent(session: AdminSession): Promise<boolean> {
  const user = await db.query.adminUsers.findFirst({ where: eq(adminUsers.id, session.uid) });
  return Boolean(user && user.sessionVersion === session.version && user.username === session.username && user.role === session.role);
}

export async function clearLoginAttempts(username: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.key, username.toLowerCase()));
}

export type PasswordChangeResult =
  | { ok: true; username: string; role: string; sessionVersion: number }
  | { ok: false; error: string };

/** Verifica, reemplaza el hash e invalida todas las sesiones anteriores. */
export async function changeAdminPassword(
  userId: number,
  expectedSessionVersion: number,
  currentPassword: string,
  newPassword: string,
): Promise<PasswordChangeResult> {
  const attemptKey = `password-change:${userId}`;
  if (!(await reserveLoginAttempt(attemptKey))) {
    return { ok: false, error: "Demasiados intentos. Prueba nuevamente en 10 minutos." };
  }

  const user = await db.query.adminUsers.findFirst({ where: eq(adminUsers.id, userId) });
  if (!user || user.sessionVersion !== expectedSessionVersion) {
    return { ok: false, error: "La sesión cambió. Vuelve a iniciar sesión." };
  }

  const currentIsValid = await verify(user.passwordHash, currentPassword).catch(() => false);
  if (!currentIsValid) return { ok: false, error: "La contraseña actual es incorrecta." };

  const repeatsCurrent = await verify(user.passwordHash, newPassword).catch(() => false);
  if (repeatsCurrent) return { ok: false, error: "La nueva contraseña debe ser diferente de la actual." };

  const passwordHash = await hash(newPassword, ARGON_OPTIONS);
  const [updated] = await db
    .update(adminUsers)
    .set({
      passwordHash,
      sessionVersion: sql`${adminUsers.sessionVersion} + 1`,
    })
    .where(and(eq(adminUsers.id, userId), eq(adminUsers.sessionVersion, expectedSessionVersion)))
    .returning({
      username: adminUsers.username,
      role: adminUsers.role,
      sessionVersion: adminUsers.sessionVersion,
    });

  if (!updated) return { ok: false, error: "La sesión cambió. Vuelve a iniciar sesión." };
  await clearLoginAttempts(attemptKey);
  return { ok: true, ...updated };
}
