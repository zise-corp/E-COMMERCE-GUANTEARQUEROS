/**
 * Punto de integración de la notificación al negocio (WhatsApp / email).
 *
 * FUERA DE ALCANCE en esta etapa: acá queda solo el enganche. Se llama después
 * de confirmar el pedido y después del webhook de pago; hoy no hace nada más que
 * dejar rastro en el log, y `orders.notified_at` queda sin usar a propósito.
 *
 * Cuando se implemente:
 *   1. mandar el mensaje (WhatsApp Business API o email transaccional),
 *   2. recién ahí escribir `orders.notified_at = now()`,
 *   3. nunca hacer que un fallo del envío tumbe la creación del pedido.
 */

export type OrderNotification = {
  id: number;
  number: number;
  customerName: string;
  customerPhone: string;
  total: string;
  mode: "pickup" | "delivery";
  department: string | null;
  paymentStatus: string;
};

export async function notifyNewOrder(order: OrderNotification): Promise<void> {
  // Pendiente de implementar. No lanza: el pedido ya está confirmado en la base.
  console.info(
    `[notify] pedido #${order.number} de ${order.customerName} (${order.customerPhone}) ` +
      `por Bs ${order.total} — envío de notificación pendiente de integrar.`,
  );
}

export async function notifyPaymentConfirmed(order: OrderNotification): Promise<void> {
  console.info(`[notify] pago confirmado del pedido #${order.number} — notificación pendiente.`);
}
