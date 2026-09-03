import type { OrderSummary } from "@/db/queries/orders";

/**
 * Etiqueta y color de cada estado de pedido. Fuente única: antes estaba
 * duplicado en el resumen y en la lista de pedidos, y los dos podían quedar
 * distintos.
 *
 * El verde es #45D48A y no el #6FCF8E de `state.ok`: contra el ámbar de
 * "en proceso" ese verde quedaba a ΔE 14.6 en visión normal (por debajo del
 * piso de 15) y a 8.5 en protanopía, o sea difíciles de diferenciar cuando van
 * pegados en la barra apilada. Este pasa ambos (17.0 y 8.1). El token global
 * `state.ok` no se toca porque lo usa la tienda, donde nunca aparece junto al
 * ámbar.
 *
 * El gris de "cancelado" es gris a propósito: es el estado inactivo y debe
 * retroceder, no competir con los activos.
 */
export const ORDER_STATUS_META: Record<
  OrderSummary["status"],
  { label: string; color: string; bg: string }
> = {
  recibido: { label: "Recibido", color: "#FA2A00", bg: "rgba(250,42,0,0.14)" },
  en_proceso: { label: "En proceso", color: "#E2B93B", bg: "rgba(226,185,59,0.13)" },
  completado: { label: "Completado", color: "#45D48A", bg: "rgba(69,212,138,0.13)" },
  cancelado: { label: "Cancelado", color: "#8A8783", bg: "rgba(138,135,131,0.12)" },
};

/** Orden de lectura: del que recién entra al que ya salió del flujo. */
export const ORDER_STATUS_ORDER: OrderSummary["status"][] = [
  "recibido",
  "en_proceso",
  "completado",
  "cancelado",
];
