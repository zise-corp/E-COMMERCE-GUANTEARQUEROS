"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/Icons";
import { CheckoutSteps } from "./CheckoutSteps";
import { useCart } from "./CartProvider";
import { SupportModal } from "./SupportModal";

export function ConfirmationView({ number, delivery }: { number: number; delivery: string }) {
  const cart = useCart();
  const [supportOpen, setSupportOpen] = useState(false);

  // Red de seguridad: si se llegó acá sin pasar por el polling, el carrito igual se limpia.
  useEffect(() => {
    if (cart.items.length > 0) cart.clear();
    if (cart.orderId !== null) cart.setOrderId(null);
    // Solo al montar: no queremos reaccionar a cada cambio del carrito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mx-auto w-full max-w-[700px] px-5 py-14 pb-28 text-center sm:px-8 sm:py-[90px]">
      <div className="flex justify-center">
        <CheckoutSteps current={3} />
      </div>

      <div className="animate-rise">
        <div className="mx-auto flex h-24 w-24 items-center justify-center bg-brand text-ink-950 clip-shield">
          <CheckIcon size={44} strokeWidth={2.4} />
        </div>

        <h1 className="mt-7 font-display text-[clamp(2.5rem,9vw,3.625rem)] uppercase leading-none skew-fast">
          ¡Gracias por tu compra!
        </h1>

        <p className="mt-[18px] inline-block bg-brand px-[26px] py-2.5 font-display text-[26px] text-ink-950 skew-fast-8">
          Pedido #{number}
        </p>

        <p className="mt-[22px] text-[15.5px] leading-relaxed text-content-muted">
          Ya registramos tu pedido. {delivery}. Te vamos a contactar por WhatsApp para coordinar.
        </p>

        <div className="mt-[34px] flex flex-wrap items-center justify-between gap-4 border border-line bg-ink-900 p-[22px] text-left">
          <div>
            <p className="font-display text-xl uppercase">¿Necesitás ayuda?</p>
            <p className="mt-1 text-[13px] text-content-muted">
              Escribinos con tu número de pedido.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="border border-brand px-5 py-3 text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-brand transition-colors duration-150 hover:bg-brand hover:text-ink-950"
          >
            Contactar
          </button>
        </div>

        <ButtonLink href="/" fullWidth size="lg" className="mt-[26px] py-[19px]">
          Volver a la tienda
        </ButtonLink>
      </div>

      <SupportModal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        orderNumber={number}
      />
    </section>
  );
}
