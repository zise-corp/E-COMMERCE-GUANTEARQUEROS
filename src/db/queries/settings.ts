import { eq } from "drizzle-orm";
import { db, withFallback } from "../index";
import { siteSettings } from "../schema";

export type CampaignSettings = {
  enabled: boolean;
  /** Frases del marquee, alternadas en loop. */
  messages: string[];
};

export const CAMPAIGN_KEY = "campaign";

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
