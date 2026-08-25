import { permanentRedirect } from "next/navigation";

export default async function LegacySubcategoryPage({
  params,
}: {
  params: Promise<{ categoria: string; sub: string }>;
}) {
  const { categoria, sub } = await params;
  permanentRedirect(`/${categoria}/${sub}`);
}
