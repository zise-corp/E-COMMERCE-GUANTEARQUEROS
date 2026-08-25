import type { Metadata } from "next";
import { CategoryView, type SearchParams } from "@/components/shop/CategoryView";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "DREI Athletic",
  description: "Indumentaria DREI Athletic en Guantearqueros Bolivia.",
  alternates: { canonical: "/drei" },
};

export default async function DreiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <CategoryView
      categorySlug="poleras"
      searchParams={await searchParams}
      displayName="DREI Athletic"
      fixedBrandName="DREI"
    />
  );
}
