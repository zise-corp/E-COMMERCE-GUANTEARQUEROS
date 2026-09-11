import { z } from "zod";
import { site } from "./site";

export type PaymentMethod = "qr" | "card";
export type YoPagoCurrency = "BOB" | "USD";
/**
 * Lo único del pedido que necesita la pasarela: el monto y la referencia técnica
 * para ubicar el cobro. Los datos del cliente no viajan: se guardan en el pedido
 * para el administrador, y ningún dato faltante puede bloquear un cobro.
 */
export type YoPagoPaymentInput = { orderId: number; codeTransaction: string; amount: string; currency: YoPagoCurrency; concept: string };

/** Código de comercio que YoPago habilitó específicamente para GuanteArqueros. */
export const YOPAGO_COMPANY_CODE = "AA45-QE59-56ER-RO99";

const responseSchema = z.object({
  status: z.coerce.number(), message: z.string().optional(),
  transactionId: z.union([z.string(), z.number()]).transform(String).optional(),
  qrId: z.union([z.string(), z.number()]).transform(String).optional(),
  qr: z.string().optional(), url: z.string().optional(), urlCard: z.string().optional(),
}).passthrough();

export class YoPagoError extends Error {
  constructor(message: string, readonly code = "provider_error") { super(message); }
}

export function assertYoPagoReady(): void {
  if (process.env.YOPAGO_MODE !== "live") throw new YoPagoError("YOPAGO_MODE must be live", "configuration_error");
  requiredEnv("YOPAGO_CALLBACK_USERNAME");
  requiredEnv("YOPAGO_CALLBACK_PASSWORD");
  appBaseUrl();
}

export function normalizeYoPagoCurrency(value: string): YoPagoCurrency {
  if (value === "BOB" || value === "Bs") return "BOB";
  if (value === "USD" || value === "$") return "USD";
  throw new YoPagoError("Unsupported payment currency", "unsupported_currency");
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new YoPagoError(`Missing ${name}`, "configuration_error");
  return value;
}

function appBaseUrl(): string {
  const configured = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) throw new YoPagoError("Missing APP_BASE_URL", "configuration_error");
  const url = new URL(configured);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new YoPagoError("APP_BASE_URL must use HTTPS in production", "configuration_error");
  return url.origin;
}

/** "140.00" → "140" y "140.50" → "140.5": el formato de `amount.toString()` en Tienda-Virtual. */
function formatYoPagoAmount(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new YoPagoError("Invalid payment amount", "invalid_amount");
  return String(amount);
}

export function buildYoPagoPayload(input: YoPagoPaymentInput) {
  // Mismos formatos que Tienda-Virtual, que sí cobra: valores cortos y
  // codeExternal vacío. Con un codeTransaction de 82 caracteres y URLs de ~110
  // YoPago respondía HTTP 400 "Internal Error". El retorno solo informa: el
  // cobro lo confirma el callback.
  const returnUrl = `${appBaseUrl()}/checkout/result?pedido=${input.orderId}`;
  return {
    companyCode: YOPAGO_COMPANY_CODE, codeTransaction: input.codeTransaction,
    urlSuccess: returnUrl, urlFailed: returnUrl,
    // Datos de facturación fijos, como los valores por defecto de Tienda-Virtual.
    // El email es el de la tienda: si YoPago manda un comprobante, le llega al
    // negocio y no a una casilla ajena.
    billName: "Sin Nombre", billNit: "0", email: site.supportEmail,
    generateBill: "1", concept: input.concept, currency: input.currency, amount: formatYoPagoAmount(input.amount),
    messagePayment: "Gracias por su compra", codeExternal: "",
  };
}

async function requestYoPago(url: string, input: YoPagoPaymentInput) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(buildYoPagoPayload(input)), signal: controller.signal, cache: "no-store" });
    const raw = await response.text();
    // Se guarda el cuerpo entero (recortado) y no solo `message`: YoPago ahí
    // solo dice "Internal Error", y el resto puede explicar el rechazo.
    if (!response.ok) throw new YoPagoError(`YoPago returned HTTP ${response.status}: ${raw.replace(/\s+/g, " ").trim().slice(0, 300) || "empty body"}`, `http_${response.status}`);
    let json: unknown;
    try { json = JSON.parse(raw); } catch { throw new YoPagoError("YoPago returned invalid JSON", "invalid_response"); }
    const parsed = responseSchema.safeParse(json);
    if (!parsed.success) throw new YoPagoError("YoPago returned an unexpected response", "invalid_response");
    console.info(JSON.stringify({ event: "yopago.request", httpStatus: response.status, durationMs: Date.now() - startedAt, succeeded: parsed.data.status === 0 }));
    return parsed.data;
  } catch (error) {
    if (error instanceof YoPagoError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new YoPagoError("YoPago request timed out", "timeout");
    throw new YoPagoError("YoPago request failed", "network_error");
  } finally { clearTimeout(timeout); }
}

function endpoint(name: "YOPAGO_QR_URL" | "YOPAGO_CARD_URL", fallback: string) {
  const url = new URL(process.env[name]?.trim() || fallback);
  if (url.protocol !== "https:") throw new YoPagoError(`${name} must use HTTPS`, "configuration_error");
  return url.toString();
}

function providerReason(data: { status: number; message?: string }): string {
  return data.message ? `: ${data.message.replace(/\s+/g, " ").slice(0, 200)}` : ` (status ${data.status})`;
}

export async function generateYoPagoQr(input: YoPagoPaymentInput) {
  const data = await requestYoPago(endpoint("YOPAGO_QR_URL", "https://yopago.com.bo/pay/qr/generateQr"), input);
  if (data.status !== 0 || !data.transactionId || !data.qrId || !data.qr) throw new YoPagoError(`YoPago did not create a valid QR${providerReason(data)}`, "qr_creation_failed");
  return { transactionId: data.transactionId, qrId: data.qrId, qrImage: data.qr.startsWith("data:image/") ? data.qr : `data:image/png;base64,${data.qr}`, providerStatus: String(data.status) };
}

export function validateYoPagoCardUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new YoPagoError("YoPago card URL is not HTTPS", "unsafe_card_url");
  const allowed = (process.env.YOPAGO_ALLOWED_CARD_HOSTS || "yopago.com.bo").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  const host = url.hostname.toLowerCase();
  if (!allowed.some((domain) => host === domain || host.endsWith(`.${domain}`))) throw new YoPagoError("YoPago card URL host is not allowed", "unsafe_card_url");
  return url.toString();
}

export async function generateYoPagoCard(input: YoPagoPaymentInput) {
  const data = await requestYoPago(endpoint("YOPAGO_CARD_URL", "https://yopago.com.bo/pay/api/generateUrl"), input);
  if (data.status !== 0 || !data.transactionId || !data.urlCard) throw new YoPagoError(`YoPago did not create a valid card session${providerReason(data)}`, "card_creation_failed");
  return { transactionId: data.transactionId, checkoutUrl: validateYoPagoCardUrl(data.urlCard), providerStatus: String(data.status) };
}
