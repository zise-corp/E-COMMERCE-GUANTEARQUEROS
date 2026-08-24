"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchIcon } from "@/components/ui/Icons";

/** Buscador del topbar. Filtra la sección actual escribiendo en el parámetro `q`. */
export function AdminSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [term, setTerm] = useState(params.get("q") ?? "");

  useEffect(() => setTerm(params.get("q") ?? ""), [params]);

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (term === current) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (term.trim()) next.set("q", term.trim());
      else next.delete("q");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(timer);
  }, [term, params, pathname, router]);

  return (
    <label className="flex w-full items-center gap-2 border border-ink-700 bg-ink-850 px-3 py-2 sm:w-[210px]">
      <SearchIcon size={14} className="text-content-dim" />
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[12.5px] text-content outline-none placeholder:text-content-dim"
      />
    </label>
  );
}
