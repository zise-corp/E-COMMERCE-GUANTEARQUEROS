type PaymentEnvironment = {
  NODE_ENV?: string;
  YOPAGO_MODE?: string;
  ALLOW_PAYMENT_SANDBOX?: string;
};

export function paymentSandboxAllowed(env: PaymentEnvironment): boolean {
  const mode = env.YOPAGO_MODE ?? (env.NODE_ENV === "production" ? "disabled" : "sandbox");
  return mode === "sandbox" && (env.NODE_ENV !== "production" || env.ALLOW_PAYMENT_SANDBOX === "true");
}
