import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { processYoPagoCallback } from "@/db/queries/payments";
import { OrderError } from "@/db/queries/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// trim: un espacio pegado a un valor (p. ej. " AA45-…") no debe dejar un cobro sin confirmar.
const callbackSchema = z.object({
  transactionId: z.union([z.string().trim().min(1).max(100), z.number()]).transform(String),
  companyCode: z.string().trim().min(1).max(50),
  // Informativos: se guardan tal cual llegan y nunca bloquean la confirmación.
  description: z.unknown().transform((v) => (typeof v === "string" ? v.trim().slice(0, 500) : null)),
  dateRequest: z.unknown().transform((v) => (typeof v === "string" ? v.trim().slice(0, 100) : null)),
}).passthrough();

// Como en Tienda-Virtual, los rechazos de negocio responden HTTP 200 con State "01".
const missingParams = { State: "01", message: "Faltan parámetros requeridos (transactionId o companyCode)" };
const notFound = { State: "01", message: "Orden no encontrada para los datos proporcionados" };

function equalSecret(actual: string | null, expected: string | undefined): boolean {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!equalSecret(request.headers.get("Username"), process.env.YOPAGO_CALLBACK_USERNAME) || !equalSecret(request.headers.get("Password"), process.env.YOPAGO_CALLBACK_PASSWORD)) {
    return NextResponse.json({ State: "01", message: "Acceso No Autorizado" }, { status: 401 });
  }
  // Sin chequeo de Content-Type, igual que Tienda-Virtual: no sabemos qué
  // cabecera manda YoPago y la autenticación ya se verificó. Rechazar por la
  // cabecera podía dejar un cobro hecho sin confirmar; el JSON.parse y el
  // schema de abajo ya descartan lo inválido.
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 16_384) return NextResponse.json(missingParams, { status: 413 });
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return NextResponse.json(missingParams); }
  const parsed = callbackSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json(missingParams);
  const payloadHash = createHash("sha256").update(raw).digest("hex");
  const eventKey = createHash("sha256").update(`yopago:${parsed.data.companyCode}:${parsed.data.transactionId}`).digest("hex");
  try {
    // Todo callback autenticado queda registrado en payment_events, se encuentre o no el pago.
    const result = await processYoPagoCallback(parsed.data, eventKey, payloadHash);
    if (result === "not_found") return NextResponse.json(notFound);
    return NextResponse.json({ State: "00", message: result === "duplicate" ? "COMPLETADO (YA PROCESADA)" : "COMPLETADO" });
  } catch (error) {
    if (error instanceof OrderError) return NextResponse.json(notFound);
    console.error("[payments/yopago/webhook] Callback processing failed", { eventKey, error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ State: "99", message: "Error General" }, { status: 500 });
  }
}
