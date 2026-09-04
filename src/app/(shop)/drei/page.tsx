import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryView, type SearchParams } from "@/components/shop/CategoryView";
import { DreiIntro } from "@/components/shop/DreiIntro";
import { isDreiVisible } from "@/db/queries/catalog";

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
  if (!(await isDreiVisible())) notFound();

  return (
    <>
      <DreiIntro />
      <CategoryView
        categorySlug="poleras"
        searchParams={await searchParams}
        displayName="DREI Athletic"
        fixedBrandName="DREI"
      />
    </>
  );
}
