import { readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL no está configurada.");

const query = await readFile(new URL("./expire-payments.sql", import.meta.url), "utf8");
const client = postgres(url, { max: 1, connect_timeout: 10, prepare: false });
const intervalMs = 30_000;
const signal = new AbortController();

process.on("SIGTERM", () => signal.abort());
process.on("SIGINT", () => signal.abort());

async function expireOnce() {
  const rows = await client.unsafe(query);
  if (rows.length) console.info(JSON.stringify({ event: "payment_attempts.abandoned_after_timeout", count: rows.length }));
  return rows.length;
}

try {
  if (process.argv.includes("--check")) {
    const [row] = await client`
      SELECT count(*)::int AS count
      FROM orders AS sale
      JOIN payment_attempts AS attempt ON attempt.order_id = sale.id
      WHERE attempt.status IN ('pending', 'created')
        AND sale.status = 'recibido'
        AND sale.payment_status = 'pendiente'
        AND sale.financial_status = 'payment_created'
        AND sale."transactionId" = attempt.transaction_id
        AND sale."companyCode" = attempt.company_code
        AND COALESCE(attempt.expires_at, attempt.created_at + INTERVAL '10 minutes') <= CURRENT_TIMESTAMP
    `;
    console.log(row.count);
  } else if (process.argv.includes("--loop")) {
    while (!signal.signal.aborted) {
      try {
        await expireOnce();
      } catch (error) {
        console.error("[payment-expirer] No se pudo actualizar el estado de pagos vencidos.", error);
      }
      try {
        await sleep(intervalMs, undefined, { signal: signal.signal });
      } catch {
        break;
      }
    }
  } else {
    console.log(await expireOnce());
  }
} finally {
  await client.end();
}
