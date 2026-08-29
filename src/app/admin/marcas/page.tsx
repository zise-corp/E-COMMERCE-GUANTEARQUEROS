import Link from "next/link";
import { AdminTopbar } from "@/components/admin/AdminShell";
import { BrandsManager } from "@/components/admin/BrandsManager";
import { getAdminBrands } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "Marcas" };

export default async function AdminBrandsPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  await requireAdmin();
  const { nuevo } = await searchParams;
  const rows = await getAdminBrands();
  return <><AdminTopbar title="Marcas" subtitle={`${rows.length} ${rows.length === 1 ? "marca" : "marcas"}`} action={<Link href="/admin/marcas?nuevo=1" className="whitespace-nowrap bg-brand px-4 py-[11px] text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-ink-950 hover:bg-brand-hot">+ Nueva marca</Link>} /><div className="px-5 py-[26px] pb-16 sm:px-7"><BrandsManager rows={rows} openNew={nuevo === "1"} /></div></>;
}
