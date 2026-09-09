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

async function key(kind: TokenKind): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(`${secret()}:gq:v2:${kind}`),
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

export type TokenKind = "admin" | "order" | "quote";
export type TokenPayload = Record<string, unknown> & { exp: number; kind: TokenKind };
type Payloads = { admin: AdminSession; order: OrderSession; quote: QuoteSession };

export async function signToken(payload: TokenPayload): Promise<string> {
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await key(payload.kind), encoder.encode(body));
  return `${body}.${base64url(signature)}`;
}

export async function verifyToken<K extends TokenKind>(token: string | undefined, kind: K): Promise<Payloads[K] | null> {
  if (!token || token.length > 8192) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const given = token.slice(dot + 1);

  let expected: ArrayBuffer;
  try {
    expected = await crypto.subtle.sign("HMAC", await key(kind), encoder.encode(body));
    if (!timingSafeEqual(fromBase64url(given), new Uint8Array(expected))) return null;
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as Record<string, unknown> | null;
    if (!parsed || parsed.kind !== kind || typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp) || parsed.exp <= Date.now()) return null;
    const positiveId = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
    if (kind === "admin" && (!positiveId(parsed.uid) || typeof parsed.username !== "string" || !parsed.username || typeof parsed.role !== "string" || !parsed.role || !positiveId(parsed.version))) return null;
    if (kind === "order" && (!Array.isArray(parsed.orderIds) || parsed.orderIds.length < 1 || parsed.orderIds.length > 10 || !parsed.orderIds.every(positiveId))) return null;
    if (kind === "quote" && (typeof parsed.requestHash !== "string" || !/^[a-f0-9]{64}$/.test(parsed.requestHash) || typeof parsed.priceHash !== "string" || !/^[a-f0-9]{64}$/.test(parsed.priceHash))) return null;
    return parsed as Payloads[K];
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

export type AdminSession = TokenPayload & { kind: "admin"; uid: number; username: string; role: string; version: number };
export type OrderSession = TokenPayload & { kind: "order"; orderIds: number[] };
export type QuoteSession = TokenPayload & { kind: "quote"; requestHash: string; priceHash: string };
