/**
 * Firma y verificación de cookies con HMAC-SHA256 sobre Web Crypto, para que el
 * mismo código sirva en el middleware (edge) y en los route handlers (node).
 *
 * Formato del token: <payload base64url>.<firma base64url>
 */

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of view) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function secret(): string {
  const value = process.env["ADMIN_SESSION_SECRET"];
  if (!value || value.length < 24) {
    throw new Error(
      "ADMIN_SESSION_SECRET falta o es muy corto. Generalo con: " +
        'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
  }
  return value;
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Comparación en tiempo constante: no filtra cuántos bytes coincidieron. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export type TokenPayload = Record<string, unknown> & { exp: number };

export async function signToken(payload: TokenPayload): Promise<string> {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await key(), encoder.encode(body));
  return `${body}.${base64url(signature)}`;
}

export async function verifyToken<T extends TokenPayload>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const given = token.slice(dot + 1);

  let expected: ArrayBuffer;
  try {
    expected = await crypto.subtle.sign("HMAC", await key(), encoder.encode(body));
  } catch {
    return null;
  }

  if (!timingSafeEqual(fromBase64url(given), new Uint8Array(expected))) return null;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as T;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/* Nombres y duraciones de las dos cookies del proyecto. */

export const ADMIN_COOKIE = "gq_admin";
export const ADMIN_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

export const ORDER_COOKIE = "gq_order";
export const ORDER_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 horas

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

export type AdminSession = TokenPayload & { uid: number; username: string; role: string };
export type OrderSession = TokenPayload & { orderIds: number[] };
