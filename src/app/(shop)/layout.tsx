import { CartDrawer } from "@/components/shop/CartDrawer";
import { CartProvider } from "@/components/shop/CartProvider";
import { Footer } from "@/components/shop/Footer";
import { Header } from "@/components/shop/Header";
import { ToastProvider } from "@/components/ui/Toast";
import { getNavCategories } from "@/db/queries/catalog";

export const revalidate = 300;

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const categories = await getNavCategories();

  // DREI vive dentro de Poleras: el ítem del nav apunta a esa categoría.
  const drei = categories.find((c) => c.slug === "poleras") ?? categories[1] ?? null;

  return (
    <CartProvider>
      <ToastProvider>
        <div className="flex min-h-dvh flex-col">
          <Header categories={categories} dreiSlug={drei?.slug ?? null} />
          <main className="flex-1">{children}</main>
          <Footer categories={categories} />
        </div>
        <CartDrawer />
      </ToastProvider>
    </CartProvider>
  );
}
