import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../index";

const MIN_SWEEP_INTERVAL_MS = 10_000;
let statement: Promise<string> | null = null;
let inFlight: Promise<void> | null = null;
let lastSuccessfulSweep = 0;

/**
 * Respaldo del proceso periódico de Docker. En desarrollo y en páginas abiertas,
 * la lectura siguiente vence los intentos sin esperar un worker externo.
 * La consulta SQL es la misma que usa el worker y es idempotente.
 */
export async function expirePendingPaymentsIfDue(minIntervalMs = MIN_SWEEP_INTERVAL_MS): Promise<void> {
  if (inFlight) return inFlight;
  if (Date.now() - lastSuccessfulSweep < minIntervalMs) return;

  inFlight = (async () => {
    statement ??= readFile(join(process.cwd(), "scripts", "expire-payments.sql"), "utf8")
      .catch((error: unknown) => { statement = null; throw error; });
    await db.execute(sql.raw(await statement));
    lastSuccessfulSweep = Date.now();
  })().finally(() => { inFlight = null; });

  return inFlight;
}
