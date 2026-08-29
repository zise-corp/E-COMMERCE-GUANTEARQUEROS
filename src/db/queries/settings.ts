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
  shippingPrice: number;
  discounts: DiscountCode[];
};

export const CHECKOUT_DEFAULT: CheckoutSettings = { shippingPrice: 30, discounts: [] };

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

function isCheckout(value: unknown): value is CheckoutSettings {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v["shippingPrice"] === "number" && Array.isArray(v["discounts"]);
}

export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  return withFallback<CheckoutSettings>(CHECKOUT_DEFAULT, async () => {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, CHECKOUT_KEY))
      .limit(1);
    return row && isCheckout(row.value) ? row.value : CHECKOUT_DEFAULT;
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
