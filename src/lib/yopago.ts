import "server-only";

/**
 * Adaptador de YoPago.
 *
 * Dos drivers detrás de una sola interfaz:
 *   - `sandbox` (por defecto): simula la pasarela sin salir del servidor. Sirve para
 *     probar el flujo completo — polling, webhook y paso 3 — sin credenciales.
 *   - `live`: llama a la API real.
 *
 * OJO: los nombres de endpoint y de campo del driver `live` están armados sobre la
 * forma habitual de estas pasarelas y hay que confirmarlos contra la documentación
 * que entregue YoPago. Todo lo específico del proveedor está acotado a este archivo:
 * cambiar los nombres acá no toca ni la UI ni la base.
 */

export type PaymentMethod = "qr" | "card";

export type PaymentIntent = {
  txId: string;
  method: PaymentMethod;
  amount: string;
  /** QR listo para mostrar (data URI o URL). En sandbox va null. */
  qrImage: string | null;
  /** URL del formulario de tarjeta, para el iframe. En sandbox va null. */
  checkoutUrl: string | null;
  sandbox: boolean;
};

export type ExternalStatus = "pendiente" | "pagado" | "fallido" | "reembolsado";

export function isSandbox(): boolean {
  return (process.env["YOPAGO_MODE"] ?? "sandbox") !== "live" || !process.env["YOPAGO_API_URL"];
}

function config() {
  const apiUrl = process.env["YOPAGO_API_URL"];
  const apiKey = process.env["YOPAGO_API_KEY"];
  const secret = process.env["YOPAGO_SECRET"];
  if (!apiUrl || !apiKey || !secret) {
    throw new Error("Faltan YOPAGO_API_URL, YOPAGO_API_KEY o YOPAGO_SECRET para el modo live.");
  }
  return { apiUrl, apiKey, secret };
}

export async function createPayment(input: {
  orderId: number;
  orderNumber: number;
  amount: string;
  method: PaymentMethod;
  customerName: string;
  callbackUrl: string;
}): Promise<PaymentIntent> {
  if (isSandbox()) {
    return {
      txId: `SBX-${input.orderNumber}-${Date.now().toString(36).toUpperCase()}`,
      method: input.method,
      amount: input.amount,
      qrImage: null,
      checkoutUrl: null,
      sandbox: true,
    };
  }

  const { apiUrl, apiKey } = config();

  const res = await fetch(`${apiUrl.replace(/\/$/, "")}/payments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: "BOB",
      method: input.method,
      reference: String(input.orderNumber),
      description: `Pedido #${input.orderNumber} · Guantearqueros Bolivia`,
      customer: { name: input.customerName },
      callback_url: input.callbackUrl,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`YoPago respondió ${res.status}. ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    transaction_id?: string;
    id?: string;
    qr_image?: string;
    qr?: string;
    checkout_url?: string;
    url?: string;
  };

  const txId = data.transaction_id ?? data.id;
  if (!txId) throw new Error("YoPago no devolvió un identificador de transacción.");

  return {
    txId,
    method: input.method,
    amount: input.amount,
    qrImage: data.qr_image ?? data.qr ?? null,
    checkoutUrl: data.checkout_url ?? data.url ?? null,
    sandbox: false,
  };
}

/** Traduce el estado del proveedor al enum de la base. */
export function mapStatus(raw: string): ExternalStatus {
  const value = raw.toLowerCase();
  if (["paid", "approved", "completed", "success", "pagado"].includes(value)) return "pagado";
  if (["failed", "rejected", "error", "expired", "cancelled", "fallido"].includes(value)) {
    return "fallido";
  }
  if (["refunded", "reembolsado"].includes(value)) return "reembolsado";
  return "pendiente";
}

/**
 * Verifica la firma del webhook con HMAC-SHA256 en tiempo constante.
 * En sandbox se acepta cualquier cosa: no hay proveedor del otro lado.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  if (isSandbox()) return true;

  const secret = process.env["YOPAGO_WEBHOOK_SECRET"] ?? config().secret;
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const given = signature.replace(/^sha256=/, "").toLowerCase();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
