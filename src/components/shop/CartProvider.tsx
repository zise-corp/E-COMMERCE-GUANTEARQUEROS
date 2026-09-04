"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { sumLines } from "@/lib/money";

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  brandName: string | null;
  unitPrice: string;
  size: string | null;
  quantity: number;
  imagePublicId: string | null;
  /** Stock al momento de agregar: tope del stepper, no fuente de verdad. */
  stock: number;
  personalization: string | null;
};

export type CartStep = "items" | "shipping";

type CartState = {
  items: CartItem[];
  count: number;
  subtotal: number;
  open: boolean;
  step: CartStep;
  ready: boolean;
  /** Pedido ya creado en el server durante esta sesión: se actualiza, no se duplica. */
  orderId: number | null;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (productId: number, size: string | null, personalization: string | null, quantity: number) => void;
  remove: (productId: number, size: string | null, personalization: string | null) => void;
  clear: () => void;
  syncImages: (images: { productId: number; imagePublicId: string | null }[]) => void;
  openCart: (step?: CartStep) => void;
  closeCart: () => void;
  setStep: (step: CartStep) => void;
  setOrderId: (id: number | null) => void;
};

const Ctx = createContext<CartState | null>(null);

const STORAGE_KEY = "gq.cart.v1";
const ORDER_KEY = "gq.orderId.v1";

function sameLine(a: CartItem, productId: number, size: string | null, personalization: string | null) {
  return a.productId === productId && (a.size ?? null) === (size ?? null) && (a.personalization ?? null) === (personalization ?? null);
}

function parseItems(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((i): i is CartItem => {
      if (typeof i !== "object" || i === null) return false;
      const v = i as Record<string, unknown>;
      return (
        typeof v["productId"] === "number" &&
        typeof v["name"] === "string" &&
        typeof v["unitPrice"] === "string" &&
        typeof v["quantity"] === "number"
      );
    });
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<CartStep>("items");
  const [ready, setReady] = useState(false);
  const [orderId, setOrderIdState] = useState<number | null>(null);

  // Hidratación: el carrito vive en localStorage, el pedido en la sesión.
  useEffect(() => {
    setItems(parseItems(window.localStorage.getItem(STORAGE_KEY)));
    const stored = window.sessionStorage.getItem(ORDER_KEY);
    if (stored) {
      const n = Number.parseInt(stored, 10);
      if (Number.isFinite(n)) setOrderIdState(n);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  // Dos pestañas abiertas comparten el carrito.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setItems(parseItems(event.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setOrderId = useCallback((id: number | null) => {
    setOrderIdState(id);
    if (id === null) window.sessionStorage.removeItem(ORDER_KEY);
    else window.sessionStorage.setItem(ORDER_KEY, String(id));
  }, []);

  const add = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => sameLine(i, item.productId, item.size, item.personalization));
      if (idx === -1) return [...prev, { ...item, quantity }];
      const next = prev.slice();
      const hit = next[idx];
      if (!hit) return prev;
      next[idx] = {
        ...hit,
        quantity: Math.min(hit.stock || 99, hit.quantity + quantity),
        // El precio y la imagen se refrescan con lo último visto en la tienda.
        unitPrice: item.unitPrice,
        imagePublicId: item.imagePublicId,
      };
      return next;
    });
  }, []);

  const setQuantity = useCallback((productId: number, size: string | null, personalization: string | null, quantity: number) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (!sameLine(i, productId, size, personalization)) return [i];
        if (quantity <= 0) return [];
        return [{ ...i, quantity: Math.min(i.stock || 99, quantity) }];
      }),
    );
  }, []);

  const remove = useCallback((productId: number, size: string | null, personalization: string | null) => {
    setItems((prev) => prev.filter((i) => !sameLine(i, productId, size, personalization)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const syncImages = useCallback((images: { productId: number; imagePublicId: string | null }[]) => {
    const byProduct = new Map(images.map((item) => [item.productId, item.imagePublicId]));
    setItems((current) => current.map((item) =>
      byProduct.has(item.productId)
        ? { ...item, imagePublicId: byProduct.get(item.productId) ?? null }
        : item,
    ));
  }, []);

  const openCart = useCallback((next: CartStep = "items") => {
    setStep(next);
    setOpen(true);
  }, []);

  const closeCart = useCallback(() => setOpen(false), []);

  const value = useMemo<CartState>(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = sumLines(items);
    return {
      items,
      count,
      subtotal,
      open,
      step,
      ready,
      orderId,
      add,
      setQuantity,
      remove,
      clear,
      syncImages,
      openCart,
      closeCart,
      setStep,
      setOrderId,
    };
  }, [items, open, step, ready, orderId, add, setQuantity, remove, clear, syncImages, openCart, closeCart, setOrderId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart necesita <CartProvider>");
  return ctx;
}
