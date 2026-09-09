import "server-only";
import { paymentSandboxAllowed } from "./payment-mode";

/** La integración live queda cerrada hasta implementar el contrato de YoPago. */
export function isSandbox(): boolean {
  return paymentSandboxAllowed(process.env);
}
