"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { Spinner } from "@/components/ui/Spinner";
import { CloseIcon, SearchIcon } from "@/components/ui/Icons";
import { useDialog } from "@/components/ui/useDialog";
import { DreiTag } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { ProductImage } from "./ProductImage";

type Result = {
  slug: string;
  name: string;
  brandName: string | null;
  price: string;
  compareAtPrice: string | null;
  imagePublicId: string | null;
  isDrei: boolean;
};

export function SearchButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar productos"
        className="flex h-10 w-10 items-center justify-center border border-line bg-ink-850 text-content-dim transition-colors duration-150 hover:border-brand hover:text-brand"
      >
        <SearchIcon size={17} />
      </button>
      <SearchOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useDialog(open, onClose);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else {
      setTerm("");
      setResults([]);
      setSearched(false);
    }
  }, [open]);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { results: Result[] };
        setResults(data.results);
        setSearched(true);
      } catch {
        // abortado o red caída: se deja el último resultado
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term]);

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 sm:p-8">
        <button
          type="button"
          aria-label="Cerrar búsqueda"
          tabIndex={-1}
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-[#040404]/85 backdrop-blur-[3px] animate-fade-in"
        />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label="Buscar productos"
          tabIndex={-1}
          className="relative mt-[8vh] w-full max-w-[680px] border border-line bg-ink-900 animate-rise outline-none"
        >
          <div className="flex items-center gap-3 border-b border-line px-5">
            <SearchIcon size={18} className="text-content-dim" />
            <input
              ref={inputRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar guantes, DREI, canilleras..."
              className="flex-1 bg-transparent py-5 text-base text-content outline-none placeholder:text-content-faint"
              aria-label="Término de búsqueda"
            />
            {loading ? <Spinner size={18} /> : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="p-1 text-content-dim transition-colors duration-150 hover:text-brand"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          <div className="max-h-[52vh] overflow-y-auto">
            {results.map((r) => (
              <Link
                key={r.slug}
                href={`/p/${r.slug}`}
                onClick={onClose}
                className="flex items-center gap-4 border-b border-line-soft px-5 py-3 transition-colors duration-150 hover:bg-ink-850"
              >
                <span className="relative block h-14 w-14 flex-none overflow-hidden bg-ink-950">
                  <ProductImage publicId={r.imagePublicId} alt={r.name} preset="thumb" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="label-xs text-content-dim">{r.brandName ?? "Sin marca"}</span>
                    {r.isDrei ? <DreiTag /> : null}
                  </span>
                  <span className="mt-1 block truncate text-sm font-bold">{r.name}</span>
                </span>
                <Price value={r.price} compareAt={r.compareAtPrice} size="sm" />
              </Link>
            ))}

            {searched && !loading && results.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-content-dim">
                No encontramos nada con “{term.trim()}”.
              </p>
            ) : null}

            {!searched && !loading ? (
              <p className="px-5 py-8 text-center text-[13px] text-content-faint">
                Escribe al menos 2 letras.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Portal>
  );
}
