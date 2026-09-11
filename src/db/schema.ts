import {
  pgTable, serial, text, integer, numeric, boolean, timestamp,
  jsonb, pgEnum, uniqueIndex, index, uuid, check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* ---------- enums ---------- */
export const deliveryMode = pgEnum("delivery_mode", ["pickup", "delivery"]);
export const orderStatus = pgEnum("order_status", [
  "recibido", "en_proceso", "completado", "cancelado",
]);
export const paymentStatus = pgEnum("payment_status", [
  "pendiente", "pagado", "fallido", "reembolsado",
]);

/* ---------- admin ---------- */
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("owner"),
  sessionVersion: integer("session_version").notNull().default(1),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const loginAttempts = pgTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  until: timestamp("until", { withTimezone: true }).notNull(),
});

/* ---------- catálogo ---------- */
// Categorías y subcategorías en la misma tabla vía parent_id.
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  parentId: integer("parent_id").references((): any => categories.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  highlighted: boolean("highlighted").notNull().default(true),
  imagePath: text("image_path"),
  imageFileId: text("image_file_id"),
}, (t) => ({ slugUq: uniqueIndex("categories_slug_uq").on(t.slug) }));

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  // acento propio para sub-marcas (DREI usa #1B3A5C); null = usa el naranja de marca
  accentHex: text("accent_hex"),
  active: boolean("active").notNull().default(true),
  isOwnBrand: boolean("is_own_brand").notNull().default(false),
  position: integer("position").notNull().default(0),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  categoryId: integer("category_id").references(() => categories.id, { onDelete: "restrict" }).notNull(),
  subcategoryId: integer("subcategory_id").references(() => categories.id, { onDelete: "set null" }),
  brandId: integer("brand_id").references(() => brands.id, { onDelete: "set null" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: numeric("compare_at_price", { precision: 10, scale: 2 }),
  currency: text("currency").notNull().default("BOB"),
  stock: integer("stock").notNull().default(0),
  sizes: text("sizes").array().notNull().default([]),
  // atributos manuales del admin: [{ name, value }] — texto libre, sin listas fijas
  attributes: jsonb("attributes").$type<{ name: string; value: string }[]>().notNull().default([]),
  customizable: boolean("customizable").notNull().default(false),
  published: boolean("published").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  slugUq: uniqueIndex("products_slug_uq").on(t.slug),
  catIdx: index("products_category_idx").on(t.categoryId),
}));

export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  // `public_id` se conserva como nombre físico por compatibilidad; guarda el filePath de ImageKit.
  publicId: text("public_id").notNull(),
  fileId: text("file_id"),
  alt: text("alt").notNull().default(""),
  position: integer("position").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
});

/* ---------- pedidos ---------- */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").defaultRandom().notNull(),
  number: integer("number").notNull().unique(),   // correlativo visible (#1041)
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  note: text("note"),
  invoiceRequested: boolean("invoice_requested").notNull().default(false),
  businessName: text("business_name"),
  taxId: text("tax_id"),

  mode: deliveryMode("mode").notNull().default("pickup"),
  // condicionales de entrega
  department: text("department"),                 // delivery
  address: text("address"),                       // delivery + región local
  lat: numeric("lat", { precision: 9, scale: 6 }),
  lng: numeric("lng", { precision: 9, scale: 6 }),
  mapsUrl: text("maps_url"),
  documentId: text("document_id"),                // delivery + otro departamento (CI)
  email: text("email"),
  branch: text("branch"),                         // delivery + otro departamento: sucursal de la agencia

  status: orderStatus("status").notNull().default("recibido"),
  paymentStatus: paymentStatus("payment_status").notNull().default("pendiente"),
  financialStatus: text("financial_status").$type<"pending" | "payment_created" | "paid" | "abandoned" | "expired" | "paid_inventory_review" | "payment_failed" | "cancelled">().notNull().default("pending"),
  paymentMethod: text("payment_method"),          // qr | card
  // Campos de YoPago con sus mismos nombres. Se guardan al generar el QR o la
  // tarjeta, se pague o no, y el callback los fija al intento que se pagó.
  transactionId: text("transactionId"),           // ID de Transacción que devuelve YoPago
  companyCode: text("companyCode"),
  codeTransaction: text("codeTransaction"),       // código propio enviado a YoPago
  paidAt: timestamp("paid_at", { withTimezone: true }),
  inventoryProcessedAt: timestamp("inventory_processed_at", { withTimezone: true }),
  confirmationEmailSentAt: timestamp("confirmation_email_sent_at", { withTimezone: true }),
  checkoutKey: text("checkout_key").unique(),
  requestHash: text("request_hash"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }),
  shippingAmount: numeric("shipping_amount", { precision: 10, scale: 2 }),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }),
  discountCode: text("discount_code"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("BOB"),
  notifiedAt: timestamp("notified_at", { withTimezone: true }), // WhatsApp/email: etapa posterior
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  publicIdUq: uniqueIndex("orders_public_id_unique").on(t.publicId),
  statusIdx: index("orders_status_idx").on(t.status),
  transactionCompanyIdx: index("orders_transaction_company_idx").on(t.transactionId, t.companyCode),
}));

// Precio y nombre CONGELADOS al momento de la compra.
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  size: text("size"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  imagePublicId: text("image_public_id"),
  attributesSnapshot: jsonb("attributes_snapshot").$type<{ name: string; value: string }[]>().notNull().default([]),
});

export const paymentAttempts = pgTable("payment_attempts", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "restrict" }).notNull(),
  provider: text("provider").notNull().default("yopago"),
  method: text("method").$type<"qr" | "card">().notNull(),
  companyCode: text("company_code").notNull(),
  transactionCode: text("transaction_code").notNull(),
  transactionId: text("transaction_id"),
  qrId: text("qr_id"),
  qrData: text("qr_data"),
  cardUrl: text("card_url"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").$type<"BOB" | "USD">().notNull(),
  status: text("status").$type<"pending" | "created" | "paid" | "abandoned" | "failed" | "expired" | "cancelled">().notNull().default("pending"),
  providerStatus: text("provider_status"),
  failureCode: text("failure_code"),
  failureMessage: text("failure_message"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  transactionCodeUq: uniqueIndex("payment_attempts_transaction_code_unique").on(t.transactionCode),
  transactionCompanyUq: uniqueIndex("payment_attempts_transaction_company_unique").on(t.transactionId, t.companyCode),
  orderIdx: index("payment_attempts_order_id_idx").on(t.orderId),
  statusIdx: index("payment_attempts_status_idx").on(t.status),
  methodCheck: check("payment_attempts_method_check", sql`${t.method} in ('qr', 'card')`),
  statusCheck: check("payment_attempts_status_check", sql`${t.status} in ('pending', 'created', 'paid', 'abandoned', 'failed', 'expired', 'cancelled')`),
  currencyCheck: check("payment_attempts_currency_check", sql`${t.currency} in ('BOB', 'USD')`),
  amountCheck: check("payment_attempts_amount_check", sql`${t.amount} >= 0`),
}));

export const paymentEvents = pgTable("payment_events", {
  id: serial("id").primaryKey(),
  paymentAttemptId: integer("payment_attempt_id").references(() => paymentAttempts.id, { onDelete: "restrict" }),
  provider: text("provider").notNull().default("yopago"),
  eventType: text("event_type").notNull(),
  eventKey: text("event_key").notNull(),
  payloadHash: text("payload_hash").notNull(),
  processingStatus: text("processing_status").$type<"received" | "processed" | "duplicate" | "failed">().notNull().default("received"),
  errorMessage: text("error_message"),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  // El callback tal como lo manda YoPago, con sus mismos nombres. Se registra
  // siempre, aunque no se encuentre el pago al que se refiere.
  transactionId: text("transactionId"),
  companyCode: text("companyCode"),
  description: text("description"),
  dateRequest: text("dateRequest"),               // tal cual llega, sin convertir a fecha
}, (t) => ({
  eventKeyUq: uniqueIndex("payment_events_event_key_unique").on(t.eventKey),
  attemptIdx: index("payment_events_payment_attempt_id_idx").on(t.paymentAttemptId),
}));

/* ---------- ajustes del sitio ----------
   Agregado sobre el esquema del bundle: la franja de campaña tiene que poder
   apagarse desde el admin, y eso necesita un lugar donde guardarlo.
   Clave/valor libre para no volver a migrar por cada flag nuevo. */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
