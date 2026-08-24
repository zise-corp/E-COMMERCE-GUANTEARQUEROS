import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verify } from "@node-rs/argon2";
import { db } from "@/db/index";
import { adminUsers } from "@/db/schema";
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
    return await verifyToken<AdminSession>(store.get(ADMIN_COOKIE)?.value);
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

  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsers.id, user.id));

  const token = await signToken({
    uid: user.id,
    username: user.username,
    role: user.role,
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
