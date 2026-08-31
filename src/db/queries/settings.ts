import { eq } from "drizzle-orm";
import { db, withFallback } from "../index";
import { siteSettings } from "../schema";

export type CampaignSettings = {
  enabled: boolean;
  /** Frases del marquee, alternadas en loop. */
  messages: string[];
};

export const CAMPAIGN_KEY = "campaign";
export const CHECKOUT_KEY = "checkout";
export const HOME_KEY = "home";
export const DREI_NAV_KEY = "drei_nav";

export async function getDreiNavVisibility(): Promise<boolean> {
  return withFallback(true, async () => {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, DREI_NAV_KEY))
      .limit(1);
    return typeof row?.value === "boolean" ? row.value : true;
  });
}

export async function setDreiNavVisibility(active: boolean): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ key: DREI_NAV_KEY, value: active })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: active, updatedAt: new Date() },
    });
}

export type HomeSettings = {
  heroProductId: number | null;
  dreiImagePath: string | null;
  dreiImageFileId: string | null;
};

export const HOME_DEFAULT: HomeSettings = {
  heroProductId: null,
  dreiImagePath: "/demo-products/poleras.png",
  dreiImageFileId: null,
};

export type DiscountCode = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
};

export type CheckoutSettings = {
  localDeliveryPrice: number;
  transportPrice: number;
  discounts: DiscountCode[];
};

export const CHECKOUT_DEFAULT: CheckoutSettings = { localDeliveryPrice: 30, transportPrice: 30, discounts: [] };

export const CAMPAIGN_DEFAULT: CampaignSettings = {
  enabled: true,
  messages: ["DESCUENTOS EN TODA LA TIENDA", "ENVÍOS A TODA BOLIVIA"],
};

function isCampaign(value: unknown): value is CampaignSettings {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["enabled"] === "boolean" &&
    Array.isArray(v["messages"]) &&
    v["messages"].every((m) => typeof m === "string")
  );
}

export async function getCampaign(): Promise<CampaignSettings> {
  return withFallback<CampaignSettings>(CAMPAIGN_DEFAULT, async () => {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, CAMPAIGN_KEY))
      .limit(1);
    return row && isCampaign(row.value) ? row.value : CAMPAIGN_DEFAULT;
  });
}

export async function setCampaign(next: CampaignSettings): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ key: CAMPAIGN_KEY, value: next })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: next, updatedAt: new Date() },
    });
}

function parseCheckout(value: unknown): CheckoutSettings | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v["discounts"])) return null;
  if (typeof v["localDeliveryPrice"] === "number" && typeof v["transportPrice"] === "number") {
    return { localDeliveryPrice: v["localDeliveryPrice"], transportPrice: v["transportPrice"], discounts: v["discounts"] as DiscountCode[] };
  }
  // Compatibilidad con la configuración anterior, que tenía una sola tarifa.
  if (typeof v["shippingPrice"] === "number") {
    return { localDeliveryPrice: v["shippingPrice"], transportPrice: v["shippingPrice"], discounts: v["discounts"] as DiscountCode[] };
  }
  return null;
}

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  return withFallback<CheckoutSettings>(CHECKOUT_DEFAULT, async () => {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, CHECKOUT_KEY))
      .limit(1);
    return row ? (parseCheckout(row.value) ?? CHECKOUT_DEFAULT) : CHECKOUT_DEFAULT;
  });
}

export async function setCheckoutSettings(next: CheckoutSettings): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ key: CHECKOUT_KEY, value: next })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: next, updatedAt: new Date() },
    });
}

function isHomeSettings(value: unknown): value is HomeSettings {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v["heroProductId"] === null || (typeof v["heroProductId"] === "number" && Number.isInteger(v["heroProductId"]))) &&
    (v["dreiImagePath"] === null || typeof v["dreiImagePath"] === "string") &&
    (v["dreiImageFileId"] === null || typeof v["dreiImageFileId"] === "string")
  );
}

export async function getHomeSettings(): Promise<HomeSettings> {
  return withFallback<HomeSettings>(HOME_DEFAULT, async () => {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, HOME_KEY))
      .limit(1);
    return row && isHomeSettings(row.value) ? row.value : HOME_DEFAULT;
  });
}

export async function setHomeSettings(next: HomeSettings): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ key: HOME_KEY, value: next })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: next, updatedAt: new Date() },
    });
}
