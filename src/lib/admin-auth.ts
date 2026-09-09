import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verify } from "@node-rs/argon2";
import { db } from "@/db/index";
import { adminUsers } from "@/db/schema";
import { clearLoginAttempts, isAdminSessionCurrent, reserveLoginAttempt } from "@/db/queries/auth";
import {
  ADMIN_COOKIE,
  ADMIN_MAX_AGE_SECONDS,
  cookieOptions,
  signToken,
  verifyToken,
  type AdminSession,
} from "./session";

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  try {
    const session = await verifyToken(store.get(ADMIN_COOKIE)?.value, "admin");
    if (!session) return null;
    if (!(await isAdminSessionCurrent(session))) return null;
    return session;
  } catch {
    return null;
  }
}

/** Para páginas y acciones del panel: sin sesión no se sigue. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loginAdmin(username: string, password: string): Promise<LoginResult> {
  if (!(await reserveLoginAttempt(username))) return { ok: false, error: "Demasiados intentos. Prueba de nuevo en 10 minutos." };
  const user = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.username, username),
  });

  // Mismo mensaje para usuario inexistente y contraseña incorrecta: no se filtra
  // qué usuarios existen.
  const genericError = "Usuario o contraseña incorrectos.";
  if (!user) {
    // Se verifica igual contra un hash de descarte para no delatar por el tiempo
    // de respuesta que el usuario no existe.
    await verify(DUMMY_HASH, password).catch(() => false);
    return { ok: false, error: genericError };
  }

  const valid = await verify(user.passwordHash, password).catch(() => false);
  if (!valid) return { ok: false, error: genericError };

  await clearLoginAttempts(username);

  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsers.id, user.id));

  const token = await signToken({
    kind: "admin",
    uid: user.id,
    username: user.username,
    role: user.role,
    version: user.sessionVersion,
    exp: Date.now() + ADMIN_MAX_AGE_SECONDS * 1000,
  });

  const store = await cookies();
  store.set(ADMIN_COOKIE, token, { ...cookieOptions, maxAge: ADMIN_MAX_AGE_SECONDS });

  return { ok: true };
}

export async function logoutAdmin(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

/** Hash Argon2id de una contraseña al azar; solo se usa para igualar tiempos. */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHR2YWx1ZQ$5wJZ5o8yq0Xz8kFqf3H1oQZ7VYbP2nJmKcRtWxLdEuA";
