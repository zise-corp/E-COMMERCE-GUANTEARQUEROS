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
import { calculateOrderPricing, createOrder, findCheckoutOrder, getOrder, listOrders, priceLines, setOrderStatus, updateOrder } from "../src/db/queries/orders";
import { abandonYoPagoPayment, processYoPagoCallback, startYoPagoPayment } from "../src/db/queries/payments";
import { clearLoginAttempts, isAdminSessionCurrent, reserveLoginAttempt } from "../src/db/queries/auth";
import { getCheckoutSettings, setCheckoutSettings } from "../src/db/queries/settings";
import { paymentState } from "../src/lib/order-status";
import { buildYoPagoPayload, normalizeYoPagoCurrency, validateYoPagoCardUrl } from "../src/lib/yopago";

async function main() {
  process.env["ADMIN_SESSION_SECRET"] = randomUUID() + randomUUID();
  process.env["DATABASE_URL"] = "postgresql://unused-test-only";
  process.env["APP_BASE_URL"] = "https://shop.example.com";
  process.env["YOPAGO_ALLOWED_CARD_HOSTS"] = "yopago.com.bo";
  process.env["YOPAGO_CALLBACK_USERNAME"] = "cb-user";
  process.env["YOPAGO_CALLBACK_PASSWORD"] = "cb-pass";
  // .invalid nunca resuelve: aunque el fetch interceptado fallara, nada sale a YoPago.
  process.env["YOPAGO_QR_URL"] = "https://yopago.invalid/pay/qr/generateQr";
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

    assert.equal(normalizeYoPagoCurrency("Bs"), "BOB");
    assert.equal(validateYoPagoCardUrl("https://secure.yopago.com.bo/pay"), "https://secure.yopago.com.bo/pay");
    assert.throws(() => validateYoPagoCardUrl("https://yopago.com.bo.evil.example/pay"));
    assert.throws(() => validateYoPagoCardUrl("http://yopago.com.bo/pay"));
    const providerPayload = buildYoPagoPayload({ orderId: 7, codeTransaction: "1041-1757555555555", amount: "10.00", currency: "BOB", concept: "Test" });
    // El código de comercio que YoPago habilitó para GuanteArqueros, sin depender del .env.
    assert.equal(providerPayload.companyCode, "AA45-QE59-56ER-RO99");
    // Mismos formatos que Tienda-Virtual: monto como `amount.toString()`, codeExternal vacío y retorno corto.
    assert.equal(providerPayload.amount, "10");
    assert.equal(buildYoPagoPayload({ orderId: 7, codeTransaction: "x", amount: "10.50", currency: "BOB", concept: "Test" }).amount, "10.5");
    assert.equal(providerPayload.codeExternal, "");
    assert.equal(providerPayload.urlSuccess, "https://shop.example.com/checkout/result?pedido=7");
    // La pasarela solo cobra: los datos de facturación van fijos, no salen del cliente.
    assert.equal(providerPayload.billName, "Sin Nombre");
    assert.equal(providerPayload.billNit, "0");
    console.log("ok yopago: código de comercio AA45, payload con los formatos de Tienda-Virtual y redirección de tarjeta segura");

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
      shipping: { name: "Ana", lastName: "Prueba", phone: "71234567", email: "ana@example.com", documentId: "1234567", mode: "pickup", department: "La Paz" },
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

    const [intent] = await database.insert(schema.paymentAttempts).values({ orderId: first.id, method: "qr", companyCode: "TEST-COMPANY", transactionCode: "ORDER-TEST-1", transactionId: "REAL-1", amount: pricing.total, currency: "BOB", status: "created" }).returning();
    await database.update(schema.orders).set({ financialStatus: "payment_created", paymentMethod: "qr", transactionId: "REAL-1", companyCode: "TEST-COMPANY", codeTransaction: "ORDER-TEST-1" }).where(eq(schema.orders.id, first.id));
    await assert.rejects(updateOrder(first.id, input.shipping, lines, pricing, requestHash(input)));
    assert.ok(intent);
    assert.equal(await processYoPagoCallback({ transactionId: "REAL-1", companyCode: "TEST-COMPANY" }, "event-1", "hash-1"), "processed");
    assert.equal(await processYoPagoCallback({ transactionId: "REAL-1", companyCode: "TEST-COMPANY" }, "event-1", "hash-1"), "duplicate");
    const [stock] = await database.select().from(schema.products).where(eq(schema.products.id, product!.id));
    assert.equal(stock?.stock, 4);
    assert.equal((await getOrder(first.id))?.paymentStatus, "pagado");
    await assert.rejects(abandonYoPagoPayment(first.id));
    await assert.rejects(updateOrder(first.id, input.shipping, lines, pricing, requestHash(input)));
    await assert.rejects(setOrderStatus(first.id, "cancelado"));
    await setOrderStatus(first.id, "en_proceso");
    await setOrderStatus(first.id, "completado");
    await assert.rejects(setOrderStatus(first.id, "recibido"));
    console.log("ok pago real: callback idempotente, estado terminal y stock una sola vez");

    const secondInput = { ...input, checkoutKey: randomUUID(), discountCode: "", items: [{ productId: product!.id, size: "8", personalization: null, quantity: 1 }, { productId: second!.id, size: null, personalization: null, quantity: 2 }] };
    const secondLines = await priceLines(secondInput.items);
    const secondPricing = await calculateOrderPricing(secondLines, "", input.shipping);
    const secondOrder = await createOrder(input.shipping, secondLines, secondPricing, secondInput.checkoutKey, requestHash(secondInput));
    await database.insert(schema.paymentAttempts).values({ orderId: secondOrder.id, method: "qr", companyCode: "TEST-COMPANY", transactionCode: "ORDER-TEST-2", transactionId: "REAL-2", amount: secondPricing.total, currency: "BOB", status: "created" });
    await abandonYoPagoPayment(secondOrder.id);
    assert.equal((await getOrder(secondOrder.id))?.financialStatus, "abandoned");
    await database.update(schema.products).set({ stock: 0 }).where(eq(schema.products.id, second!.id));
    assert.equal(await processYoPagoCallback({ transactionId: "REAL-2", companyCode: "TEST-COMPANY" }, "event-2", "hash-2"), "processed");
    assert.equal((await database.select().from(schema.products).where(eq(schema.products.id, product!.id)))[0]?.stock, 4);
    assert.equal((await getOrder(secondOrder.id))?.financialStatus, "paid_inventory_review");
    assert.equal((await getOrder(secondOrder.id))?.transactionId, "REAL-2");
    console.log("ok conciliación: pago confirmado sin stock queda pagado y requiere revisión sin descuento parcial");

    // Integración YoPago de punta a punta, pasando por startYoPagoPayment (antes
    // las pruebas insertaban el intento a mano y nunca lo ejercitaban). fetch
    // interceptado: un pedido de retiro en local genera su QR, solo viaja el
    // monto, y el callback lo confirma aunque la cabecera no diga JSON.
    const sentToProvider: Record<string, unknown>[] = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      sentToProvider.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
      return new Response(
        JSON.stringify({ status: 0, transactionId: "QR-PICKUP-1", qrId: "Q-1", qr: "iVBORw0KGgo=" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;
    try {
      const pickupInput = quoteOrderSchema.parse({
        checkoutKey: randomUUID(), discountCode: "",
        shipping: { name: "Ana", lastName: "Retiro", phone: "71234567", email: "ana@example.com", documentId: "1234567 LP", mode: "pickup", department: "La Paz" },
        items: [{ productId: product!.id, size: "9", quantity: 1 }],
      });
      const pickupLines = await priceLines(pickupInput.items);
      const pickupPricing = await calculateOrderPricing(pickupLines, "", pickupInput.shipping);
      const pickupOrder = await createOrder(pickupInput.shipping, pickupLines, pickupPricing, pickupInput.checkoutKey, requestHash(pickupInput));
      const pickupIntent = await startYoPagoPayment(pickupOrder.id, "qr");
      assert.equal(pickupIntent.transactionId, "QR-PICKUP-1");
      assert.equal(sentToProvider.length, 1);
      assert.equal(sentToProvider[0]?.["companyCode"], "AA45-QE59-56ER-RO99");
      assert.equal(sentToProvider[0]?.["amount"], String(Number(pickupPricing.total)));
      // Código corto como en Tienda-Virtual (antes medía 82 caracteres).
      assert.match(String(sentToProvider[0]?.["codeTransaction"]), /^\d+-\d{13}$/);
      assert.equal(sentToProvider[0]?.["codeExternal"], "");
      assert.equal(sentToProvider[0]?.["billName"], "Sin Nombre");
      assert.equal(sentToProvider[0]?.["billNit"], "0");
      // Queda registrado en el pedido al generar el QR, antes (e independientemente) de que se pague.
      const savedPickup = (await getOrder(pickupOrder.id))!;
      assert.equal(savedPickup.transactionId, "QR-PICKUP-1");
      assert.equal(savedPickup.paymentStatus, "pendiente");
      // En el admin figura como "Esperando pago" hasta que llegue el callback.
      assert.equal(paymentState((await listOrders()).find((r) => r.id === pickupOrder.id)!), "waiting");
      const [pendingRow] = await database.select().from(schema.orders).where(eq(schema.orders.id, pickupOrder.id));
      assert.equal(pendingRow?.companyCode, "AA45-QE59-56ER-RO99");
      assert.equal(pendingRow?.codeTransaction, sentToProvider[0]?.["codeTransaction"]);
      assert.equal(savedPickup.email, "ana@example.com");
      assert.equal(savedPickup.documentId, "1234567 LP");
      const { POST: callback } = await import("../src/app/api/payments/yopago/webhook/route");
      const callYoPago = (body: unknown, headers: Record<string, string> = {}) => callback(new Request("https://shop.example.com/api/checkout/callback", {
        method: "POST", headers: { Username: "cb-user", Password: "cb-pass", ...headers }, body: JSON.stringify(body),
      }));
      // El callback tal cual el curl de prueba, con el espacio inicial en companyCode.
      const callbackResponse = await callYoPago({ transactionId: "QR-PICKUP-1", companyCode: " AA45-QE59-56ER-RO99", description: "Confirmacion de Pago via QR", dateRequest: "2026-04-07T21:00:00Z" }, { "content-type": "text/plain" });
      assert.equal(callbackResponse.status, 200);
      assert.equal(((await callbackResponse.json()) as { State: string }).State, "00");
      assert.equal((await getOrder(pickupOrder.id))?.paymentStatus, "pagado");
      const [paidEvent] = await database.select().from(schema.paymentEvents).where(eq(schema.paymentEvents.transactionId, "QR-PICKUP-1"));
      assert.deepEqual([paidEvent?.companyCode, paidEvent?.description, paidEvent?.dateRequest, paidEvent?.processingStatus], ["AA45-QE59-56ER-RO99", "Confirmacion de Pago via QR", "2026-04-07T21:00:00Z", "processed"]);
      // Apenas llega el callback, el admin lo lista como pagado, con método e ID de Transacción.
      const adminRow = (await listOrders()).find((r) => r.id === pickupOrder.id)!;
      assert.deepEqual([paymentState(adminRow), adminRow.paymentMethod, adminRow.transactionId], ["paid", "qr", "QR-PICKUP-1"]);
      assert.equal(paymentState({ paymentStatus: "pagado", financialStatus: "paid_inventory_review" }), "review");
      assert.equal(paymentState({ paymentStatus: "pendiente", financialStatus: "abandoned" }), "abandoned");
      // Una transacción que no generamos (el 746411 del curl) responde State "01" con HTTP 200,
      // como Tienda-Virtual, pero igual queda registrada; y un reintento se vuelve a evaluar.
      for (let i = 0; i < 2; i++) {
        const unknownResponse = await callYoPago({ transactionId: "746411", companyCode: "AA45-QE59-56ER-RO99", description: "Confirmacion de Pago via QR" });
        assert.deepEqual([unknownResponse.status, ((await unknownResponse.json()) as { State: string }).State], [200, "01"]);
      }
      const unknownEvents = await database.select().from(schema.paymentEvents).where(eq(schema.paymentEvents.transactionId, "746411"));
      assert.deepEqual(unknownEvents.map((e) => e.processingStatus), ["failed"]);
    } finally {
      globalThis.fetch = realFetch;
    }
    console.log("ok integración yopago: transactionId en el pedido antes de pagar, callback con los campos de YoPago, y todo callback queda registrado");

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
