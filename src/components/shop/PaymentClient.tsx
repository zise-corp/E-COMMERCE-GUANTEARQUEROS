"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldIcon } from "@/components/ui/Icons";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { formatBs, toNumber } from "@/lib/money";
import { CheckoutSteps } from "./CheckoutSteps";
import { useCart } from "./CartProvider";
import { ProductImage } from "./ProductImage";
import { SupportModal } from "./SupportModal";

type Method = "qr" | "card";

type Intent = {
  txId: string;
  method: Method;
  amount: string;
  qrImage: string | null;
  checkoutUrl: string | null;
  sandbox: boolean;
};

export type PaymentOrder = {
  id: number;
  number: number;
  total: string;
  paymentStatus: string;
  deliverySummary: string;
  items: {
    name: string;
    size: string | null;
    unitPrice: string;
    quantity: number;
    imagePublicId: string | null;
  }[];
};

const POLL_MS = 4000;

export function PaymentClient({ order, sandbox }: { order: PaymentOrder; sandbox: boolean }) {
  const router = useRouter();
  const cart = useCart();
  const [method, setMethod] = useState<Method | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const settled = useRef(false);

  /** El pago se genera solo al elegir método, sin botón extra. */
  const pick = useCallback(
    async (next: Method) => {
      setMethod(next);
      setIntent(null);
      setError(null);
      setLoading(true);
      try {
        const res = await fetch("/api/payments/yopago", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: order.id, method: next }),
        });
        const data = (await res.json()) as
          | { ok: true; intent: Intent }
          | { ok: false; error: string };
        if (!res.ok || !data.ok) {
          setError(data.ok ? "No pudimos generar el pago." : data.error);
          return;
        }
        setIntent(data.intent);
      } catch {
        setError("No pudimos conectar con la pasarela. Prueba de nuevo o escríbenos.");
      } finally {
        setLoading(false);
      }
    },
    [order.id],
  );

  /** Polling cada 4s. El webhook es la fuente de verdad; acá solo se lee. */
  useEffect(() => {
    if (!intent) return;
    let cancelled = false;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok: boolean;
          order?: { paymentStatus: string };
        };
        if (cancelled || !data.ok || !data.order) return;

        if (data.order.paymentStatus === "pagado" && !settled.current) {
          settled.current = true;
          cart.clear();
          cart.setOrderId(null);
          window.scrollTo(0, 0);
          router.replace("/checkout/confirmacion");
        } else if (data.order.paymentStatus === "fallido") {
          setError("El pago fue rechazado. Prueba con el otro método o escríbenos.");
          setIntent(null);
          setMethod(null);
        }
      } catch {
        // Un fallo de red puntual no rompe el polling: se reintenta al próximo tick.
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intent, order.id, cart, router]);

  async function simulate(result: "pagado" | "fallido") {
    await fetch("/api/payments/yopago/simulate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: order.id, result }),
    });
  }

  return (
    <section className="mx-auto w-full max-w-[1160px] px-5 py-8 pb-20 sm:px-8 sm:py-[34px]">
      <CheckoutSteps current={2} />

      <button
        type="button"
        onClick={() => {
          cart.openCart("shipping");
          router.push("/");
        }}
        className="mb-[22px] inline-flex items-center gap-2 text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-content-muted transition-colors duration-150 hover:text-brand"
      >
        ← Volver a envío
      </button>

      <div className="grid items-start gap-6 lg:grid-cols-[7fr_5fr]">
        <div className="border border-line bg-ink-900 p-5 sm:p-[26px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-[26px] uppercase skew-fast-6">Método de pago</h1>
            <span className="flex items-center gap-2 border border-[#2F5C3A] bg-[#2E5C3A]/[0.16] px-2.5 py-[7px] text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#7FD69B]">
              <ShieldIcon size={13} />
              Pago seguro SSL
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MethodCard
              active={method === "qr"}
              title="QR simple"
              detail="Cualquier banco · YoPago"
              onClick={() => pick("qr")}
            />
            <MethodCard
              active={method === "card"}
              title="Tarjeta"
              detail="Débito / crédito · YoPago"
              onClick={() => pick("card")}
            />
          </div>

          {loading ? (
            <div className="mt-[22px] flex h-[300px] flex-col items-center justify-center gap-3.5 border border-dashed border-[#3A3A38]">
              <Spinner />
              <p className="text-[13px] text-content-muted">
                Generando pago de {formatBs(order.total)}…
              </p>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-[22px] border-l-[3px] border-alert bg-alert/10 px-4 py-3 text-[13px] leading-relaxed text-alert-soft"
            >
              {error}
            </p>
          ) : null}

          {!loading && intent?.method === "qr" ? (
            <div className="mt-[22px] flex flex-col items-center gap-4 border border-line bg-ink-950 p-6 sm:p-7">
              {intent.qrImage ? (
                <Image
                  src={intent.qrImage}
                  alt={`QR de pago del pedido ${order.number}`}
                  width={256}
                  height={256}
                  unoptimized
                  className="h-48 w-48 border-[10px] border-content bg-content sm:h-64 sm:w-64"
                />
              ) : (
                <div
                  className="h-48 w-48 border-[10px] border-content sm:h-64 sm:w-64"
                  style={{
                    background:
                      "repeating-conic-gradient(#F5F3F0 0% 25%, #0A0A0A 0% 50%) 0 0 / 22px 22px",
                  }}
                  role="img"
                  aria-label="QR de ejemplo del modo sandbox"
                />
              )}
              <p className="text-xs tracking-[0.1em] text-content-dim tabular">
                TX ID · {intent.txId}
              </p>
              <p className="text-center text-[13px] text-content-muted">
                Escaneá con la app de tu banco. El monto ya viene cargado.
              </p>
            </div>
          ) : null}

          {!loading && intent?.method === "card" ? (
            <div
              className="mt-[22px] border border-line bg-ink-950"
              style={{ height: "min(70dvh, 500px)" }}
            >
              {intent.checkoutUrl ? (
                <iframe
                  src={intent.checkoutUrl}
                  title="Formulario de pago con tarjeta de YoPago"
                  className="h-full w-full"
                  allow="payment"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="label-xs text-content-dim">Formulario de tarjeta · YoPago</p>
                  <p className="text-[13px] text-content-muted">
                    En modo sandbox no hay pasarela real embebida.
                  </p>
                  <p className="text-xs text-content-dim tabular">TX ID · {intent.txId}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 lg:sticky lg:top-[132px]">
          <div className="border border-line bg-ink-900 p-5">
            <h2 className="mb-4 font-display text-xl uppercase skew-fast-6">
              Pedido #{order.number}
            </h2>

            <ul>
              {order.items.map((i, idx) => (
                <li
                  key={`${i.name}-${idx}`}
                  className="flex gap-3 border-b border-ink-800 py-2.5 last:border-b-0"
                >
                  <span className="relative block h-[46px] w-[46px] flex-none overflow-hidden bg-ink-950">
                    <ProductImage publicId={i.imagePublicId} alt={i.name} preset="thumb" />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px]">
                    <span className="block font-bold">{i.name}</span>
                    <span className="mt-0.5 block text-content-dim">
                      {i.size ? `Talla ${i.size} · ` : ""}
                      {i.quantity} × {formatBs(i.unitPrice)}
                    </span>
                  </span>
                  <span className="text-[13.5px] font-extrabold tabular">
                    {formatBs(toNumber(i.unitPrice) * i.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="label-xs tracking-[0.14em] text-content-dim">Total</span>
              <span className="font-display text-[34px] leading-none text-brand tabular">
                {formatBs(order.total)}
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] text-content-muted">{order.deliverySummary}</p>
          </div>

          {intent ? (
            <div
              className="flex items-center gap-3 border-l-[3px] border-brand bg-brand/[0.08] px-4 py-3.5"
              role="status"
              aria-live="polite"
            >
              <Spinner size={18} />
              <span className="text-[12.5px] leading-snug text-[#E8C8BC]">
                Esperando confirmación de pago… no cierres esta ventana.
              </span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="border border-[#3A3A38] px-4 py-3.5 text-center text-[12.5px] font-bold text-content-muted transition-colors duration-150 hover:border-brand hover:text-brand"
          >
            ¿Problemas con el pago? Contactar soporte
          </button>

          {sandbox ? (
            <div className="border border-dashed border-[#3A3A38] p-3">
              <p className="mb-2 text-center text-[10.5px] uppercase tracking-[0.14em] text-content-faint">
                Modo sandbox
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => simulate("pagado")}
                  className="border border-line-strong py-2 text-[11px] uppercase tracking-[0.1em] text-content-dim transition-colors duration-150 hover:border-state-ok hover:text-state-ok"
                >
                  Simular pagado
                </button>
                <button
                  type="button"
                  onClick={() => simulate("fallido")}
                  className="border border-line-strong py-2 text-[11px] uppercase tracking-[0.1em] text-content-dim transition-colors duration-150 hover:border-alert hover:text-alert-soft"
                >
                  Simular fallo
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <SupportModal
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        orderNumber={order.number}
      />
    </section>
  );
}

function MethodCard({
  active,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "border p-5 text-left transition-colors duration-150",
        active ? "border-brand bg-brand/[0.09]" : "border-line-strong bg-[#0F0F0E] hover:border-[#3A3A38]",
      )}
    >
      <span className="block font-display text-[22px] uppercase skew-fast-6">{title}</span>
      <span className="mt-1.5 block text-[12.5px] text-content-muted">{detail}</span>
    </button>
  );
}
