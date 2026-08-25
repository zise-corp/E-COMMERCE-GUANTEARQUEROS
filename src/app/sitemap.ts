import type { MetadataRoute } from "next";
import { getAllCategorySlugs, getAllProductSlugs, getCategoryTree } from "@/db/queries/catalog";
import { site } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, subs, productSlugs] = await Promise.all([
    getCategoryTree(),
    getAllCategorySlugs(),
    getAllProductSlugs(),
  ]);

  const now = new Date();

  const categories = tree.map((c) => ({
    url: `${site.url}/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const subcategories = subs
    .filter((s) => s.parentSlug !== null)
    .map((s) => ({
      url: `${site.url}/${s.parentSlug}/${s.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  const products = productSlugs.map((slug) => ({
    url: `${site.url}/p/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    { url: site.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/drei`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...categories,
    ...subcategories,
    ...products,
  ];
}
