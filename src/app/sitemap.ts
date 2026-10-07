import type { MetadataRoute } from "next";
import { getCategoryTree, getSitemapProducts } from "@/db/queries/catalog";
import { imageKitUrl } from "@/lib/images";
import { site } from "@/lib/site";

// En Docker no se pasan credenciales de base durante el build. Generar el mapa
// en runtime evita publicar una versión vacía creada sin DATABASE_URL.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, products] = await Promise.all([
    getCategoryTree(),
    getSitemapProducts(),
  ]);

  const categories = tree.map((c) => ({
    url: `${site.url}/${c.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const subcategories = tree.flatMap((category) =>
    category.children.map((subcategory) => ({
      url: `${site.url}/${category.slug}/${subcategory.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  );

  const productUrls = products.map((product) => ({
    url: `${site.url}/p/${product.slug}`,
    lastModified: new Date(product.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.7,
    ...(product.imagePublicId
      ? { images: [new URL(imageKitUrl(product.imagePublicId, "detail"), site.url).href] }
      : {}),
  }));

  return [
    { url: site.url, changeFrequency: "daily", priority: 1 },
    { url: `${site.url}/drei`, changeFrequency: "weekly" as const, priority: 0.8 },
    ...categories,
    ...subcategories,
    ...productUrls,
  ];
}
