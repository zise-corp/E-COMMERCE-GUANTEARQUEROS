import { eq, sql } from "drizzle-orm";
import { db } from "../index";
import { adminUsers, loginAttempts } from "../schema";
import type { AdminSession } from "@/lib/session";

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
