import { AdminTopbar } from "@/components/admin/AdminShell";
import { HomeSettingsForm } from "@/components/admin/HomeSettingsForm";
import { getHeroCarouselProducts } from "@/db/queries/catalog";
import { getHomeSettings } from "@/db/queries/settings";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Inicio" };

export default async function AdminHomePage() {
  await requireAdmin();
  const [settings, heroOffers, heroNew] = await Promise.all([
    getHomeSettings(),
    getHeroCarouselProducts("offers", 6),
    getHeroCarouselProducts("new", 6),
  ]);
  const toOptions = (items: typeof heroOffers) => items.map(({ id, name, imagePublicId }) => ({ id, name, imagePublicId }));
  const collections = { offers: toOptions(heroOffers), new: toOptions(heroNew) };

  return (
    <>
      <AdminTopbar title="Inicio" subtitle="Carrusel de ofertas e imagen de DREI" />
      <div className="max-w-5xl px-5 py-7 pb-16 sm:px-7">
        <HomeSettingsForm initial={settings} collections={collections} />
      </div>
    </>
  );
}
