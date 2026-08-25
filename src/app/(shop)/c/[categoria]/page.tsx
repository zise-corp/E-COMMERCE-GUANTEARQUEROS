import { permanentRedirect } from "next/navigation";

export default async function LegacyCategoryPage({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria } = await params;
  permanentRedirect(`/${categoria}`);
}
