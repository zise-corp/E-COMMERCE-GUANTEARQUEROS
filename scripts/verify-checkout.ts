/** Regresiones de seguridad y checkout sobre PostgreSQL embebido; nunca usa .env.local. */
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { signToken, verifyToken, type AdminSession } from "../src/lib/session";
import { quoteOrderSchema } from "../src/lib/validators";
import { checkoutHash, issueQuote, readQuote, requestHash } from "../src/lib/checkout-quote";
import { calculateOrderPricing, createOrder, findCheckoutOrder, getOrder, priceLines, setOrderStatus, updateOrder } from "../src/db/queries/orders";
import { applyPaymentResult, cancelSandboxPayment, startSandboxPayment } from "../src/db/queries/payments";
import { clearLoginAttempts, isAdminSessionCurrent, reserveLoginAttempt } from "../src/db/queries/auth";
import { getCheckoutSettings, setCheckoutSettings } from "../src/db/queries/settings";
import { paymentSandboxAllowed } from "../src/lib/payment-mode";

async function main() {
  process.env["ADMIN_SESSION_SECRET"] = randomUUID() + randomUUID();
  process.env["DATABASE_URL"] = "postgresql://unused-test-only";
  const client = new PGlite();
  const database = drizzle(client, { schema });
  // Inyecta exclusivamente el pool de este proceso de prueba.
  (globalThis as unknown as { __gqDb: unknown }).__gqDb = database;
  try {
    for (const file of (await readdir("drizzle")).filter((f) => f.endsWith(".sql")).sort()) {
      for (const statement of (await readFile(`drizzle/${file}`, "utf8")).split("--> statement-breakpoint")) {
        if (statement.trim()) await client.exec(statement);
      }
    }
    await client.exec("CREATE SEQUENCE IF NOT EXISTS orders_number_seq START WITH 1041");

    const admin: AdminSession = { kind: "admin", uid: 1, username: "test", role: "owner", version: 1, exp: Date.now() + 60_000 };
    const adminToken = await signToken(admin);
    const orderToken = await signToken({ kind: "order", orderIds: [1], exp: Date.now() + 60_000 });
    assert.ok(await verifyToken(adminToken, "admin"));
    assert.ok(await verifyToken(orderToken, "order"));
    assert.equal(await verifyToken(orderToken, "admin"), null);
    assert.equal(await verifyToken(adminToken, "order"), null);
    assert.equal(await verifyToken("bad.%%%", "admin"), null);
    assert.equal(await verifyToken(await signToken({ kind: "admin", exp: Date.now() + 60_000 }), "admin"), null);
    assert.equal(await verifyToken(await signToken({ ...admin, exp: Date.now() - 1 }), "admin"), null);
    assert.equal(await verifyToken(await signToken({ kind: "order", orderIds: [-1], exp: Date.now() + 60_000 }), "order"), null);
    const oldBody = Buffer.from(JSON.stringify({ uid: 1, role: "owner", exp: Date.now() + 60_000 })).toString("base64url");
    const oldSignature = createHmac("sha256", process.env["ADMIN_SESSION_SECRET"]!).update(oldBody).digest("base64url");
    assert.equal(await verifyToken(`${oldBody}.${oldSignature}`, "admin"), null);
    console.log("ok sesiones: propósito, payload, firma, expiración y rechazo de formato anterior");

    assert.equal(paymentSandboxAllowed({ NODE_ENV: "production", YOPAGO_MODE: "sandbox" }), false);
    assert.equal(paymentSandboxAllowed({ NODE_ENV: "production", YOPAGO_MODE: "sandbox", ALLOW_PAYMENT_SANDBOX: "true" }), true);
    assert.equal(paymentSandboxAllowed({ NODE_ENV: "production", YOPAGO_MODE: "live", ALLOW_PAYMENT_SANDBOX: "true" }), false);
    assert.equal(paymentSandboxAllowed({ NODE_ENV: "production" }), false);
    assert.equal(paymentSandboxAllowed({ NODE_ENV: "development" }), true);
    console.log("ok pagos: producción nunca cae al simulador sin habilitación explícita");

    await database.insert(schema.adminUsers).values({ username: "test", passwordHash: "test-only" });
    assert.equal(await isAdminSessionCurrent(admin), true);
    await database.update(schema.adminUsers).set({ sessionVersion: 2 }).where(eq(schema.adminUsers.id, 1));
    assert.equal(await isAdminSessionCurrent(admin), false);
    const attempts = await Promise.all(Array.from({ length: 12 }, () => reserveLoginAttempt("TEST")));
    assert.equal(attempts.filter(Boolean).length, 8);
    await clearLoginAttempts("test");
    assert.equal(await reserveLoginAttempt("test"), true);
    await database.update(schema.loginAttempts).set({ count: 8 });
    await database.update(schema.loginAttempts).set({ until: new Date(0) });
    assert.equal(await reserveLoginAttempt("test"), true);
    console.log("ok login: revocación por versión y límite persistente de ocho intentos");

    const [category] = await database.insert(schema.categories).values({ name: "Test", slug: "test-checkout" }).returning();
    const [product] = await database.insert(schema.products).values({ name: "Guante Test", slug: "guante-test", categoryId: category!.id, price: "10.05", stock: 5, sizes: ["8", "9"], published: true }).returning();
    const [second] = await database.insert(schema.products).values({ name: "Segundo Test", slug: "segundo-test", categoryId: category!.id, price: "5.00", stock: 2, published: true }).returning();
    await setCheckoutSettings({ localDeliveryPrice: 30, transportPrice: 40, discounts: [{ code: "MITAD", type: "percent", value: 50, active: true }] });
    const input = quoteOrderSchema.parse({
      checkoutKey: randomUUID(), discountCode: "MITAD",
      shipping: { name: "Ana", lastName: "Prueba", phone: "71234567", mode: "pickup", department: "La Paz" },
      items: [{ productId: product!.id, size: "8", quantity: 1 }],
    });
    const lines = await priceLines(input.items);
    const pricing = await calculateOrderPricing(lines, input.discountCode, input.shipping);
    assert.deepEqual(pricing, { subtotal: "10.05", shipping: "0.00", discount: "5.03", total: "5.02", discountCode: "MITAD" });
    const quoteToken = await issueQuote(input, lines, pricing);
    assert.ok(await readQuote(input, quoteToken));
    assert.equal(await readQuote({ ...input, discountCode: "" }, quoteToken), null);
    assert.equal(await verifyToken(quoteToken, "admin"), null);
    assert.equal(await verifyToken(quoteToken, "order"), null);
    await assert.rejects(calculateOrderPricing(lines, "INEXISTENTE", input.shipping));
    const quote = (await readQuote(input, quoteToken))!;
    assert.notEqual(checkoutHash({ lines, pricing: { ...pricing, total: "99.00" } }), quote.priceHash);
    console.log("ok cotización: datos vinculados, centavos y descuento inválido rechazado");

    const first = await createOrder(input.shipping, lines, pricing, input.checkoutKey, requestHash(input));
    const retry = await createOrder(input.shipping, lines, pricing, input.checkoutKey, requestHash(input));
    assert.equal(first.id, retry.id);
    assert.equal(retry.created, false);
    assert.equal((await findCheckoutOrder(input.checkoutKey, requestHash(input)))?.id, first.id);
    await assert.rejects(createOrder(input.shipping, lines, pricing, input.checkoutKey, "changed"));
    await setCheckoutSettings({ localDeliveryPrice: 999, transportPrice: 999, discounts: [] });
    const saved = (await getOrder(first.id))!;
    assert.equal(saved.discountAmount, "5.03");
    assert.equal(saved.shippingAmount, "0.00");
    assert.equal(saved.total, "5.02");
    console.log("ok pedido: reintento idempotente y desglose congelado ante cambios de ajustes");

    const intent = await startSandboxPayment(first.id, "qr");
    assert.equal((await startSandboxPayment(first.id, "qr")).txId, intent.txId);
    await assert.rejects(updateOrder(first.id, input.shipping, lines, pricing, requestHash(input)));
    const event = { orderId: first.id, transactionId: intent.txId, amount: pricing.total, currency: "BOB", status: "pagado" as const };
    await assert.rejects(applyPaymentResult({ ...event, amount: "999" }));
    await assert.rejects(applyPaymentResult({ ...event, currency: "USD" }));
    await assert.rejects(applyPaymentResult({ ...event, transactionId: "SBX-obsoleto" }));
    assert.equal(await applyPaymentResult(event), true);
    assert.equal(await applyPaymentResult(event), false);
    assert.equal(await applyPaymentResult({ ...event, status: "fallido" }), false);
    const [stock] = await database.select().from(schema.products).where(eq(schema.products.id, product!.id));
    assert.equal(stock?.stock, 4);
    assert.equal((await getOrder(first.id))?.paymentStatus, "pagado");
    await assert.rejects(startSandboxPayment(first.id, "card"));
    await assert.rejects(cancelSandboxPayment(first.id));
    await assert.rejects(updateOrder(first.id, input.shipping, lines, pricing, requestHash(input)));
    await assert.rejects(setOrderStatus(first.id, "cancelado"));
    await setOrderStatus(first.id, "en_proceso");
    await setOrderStatus(first.id, "completado");
    await assert.rejects(setOrderStatus(first.id, "recibido"));
    console.log("ok pago: importe/moneda/intento, idempotencia, estado terminal y stock una sola vez");

    const secondInput = { ...input, checkoutKey: randomUUID(), discountCode: "", items: [{ productId: product!.id, size: "8", personalization: null, quantity: 1 }, { productId: second!.id, size: null, personalization: null, quantity: 2 }] };
    const secondLines = await priceLines(secondInput.items);
    const secondPricing = await calculateOrderPricing(secondLines, "", input.shipping);
    const secondOrder = await createOrder(input.shipping, secondLines, secondPricing, secondInput.checkoutKey, requestHash(secondInput));
    const secondIntent = await startSandboxPayment(secondOrder.id, "qr");
    await database.update(schema.products).set({ stock: 0 }).where(eq(schema.products.id, second!.id));
    await assert.rejects(applyPaymentResult({ orderId: secondOrder.id, transactionId: secondIntent.txId, amount: secondPricing.total, currency: "BOB", status: "pagado" }));
    assert.equal((await database.select().from(schema.products).where(eq(schema.products.id, product!.id)))[0]?.stock, 4);
    assert.equal((await getOrder(secondOrder.id))?.paymentStatus, "pendiente");
    await cancelSandboxPayment(secondOrder.id);
    await assert.rejects(applyPaymentResult({ orderId: secondOrder.id, transactionId: secondIntent.txId, amount: secondPricing.total, currency: "BOB", status: "pagado" }));
    await updateOrder(secondOrder.id, input.shipping, lines, pricing, requestHash(secondInput));
    await setOrderStatus(secondOrder.id, "cancelado");
    await assert.rejects(startSandboxPayment(secondOrder.id, "qr"));
    console.log("ok rollback: sin stock no cambia ningún ítem ni pago; cancelar invalida el intento");

    await database.update(schema.siteSettings).set({ value: { localDeliveryPrice: -99, transportPrice: 0, discounts: [] } }).where(eq(schema.siteSettings.key, "checkout"));
    await assert.rejects(getCheckoutSettings());
    await client.exec("ALTER TABLE site_settings RENAME TO unavailable_settings");
    await assert.rejects(getCheckoutSettings());
    console.log("ok ajustes: corrupción o fallo de lectura nunca sustituye los importes por defaults");
    console.log("Todas las regresiones pasaron. PGlite serializa transacciones: no sustituye una prueba de carga con conexiones reales.");
  } finally {
    await client.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
