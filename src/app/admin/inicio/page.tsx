import { AdminTopbar } from "@/components/admin/AdminShell";
import { HomeSettingsForm } from "@/components/admin/HomeSettingsForm";
import { getAdminProducts } from "@/db/queries/admin";
import { getHomeSettings } from "@/db/queries/settings";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Inicio" };

export default async function AdminHomePage() {
  await requireAdmin();
  const [settings, allProducts] = await Promise.all([getHomeSettings(), getAdminProducts()]);
  const products = allProducts
    .filter((product): product is typeof product & { imagePublicId: string } => Boolean(product.imagePublicId))
    .map(({ id, name, categoryName, brandName, imagePublicId }) => ({ id, name, categoryName, brandName, imagePublicId }));

  return (
    <>
      <AdminTopbar title="Inicio" subtitle="Imágenes principales de la tienda" />
      <div className="max-w-5xl px-5 py-7 pb-16 sm:px-7">
        <HomeSettingsForm initial={settings} products={products} />
      </div>
    </>
  );
}
