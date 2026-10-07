"use client";

import { createContext, useContext } from "react";

const ContactContext = createContext<string | null>(null);

export function ContactProvider({ phone, children }: { phone: string; children: React.ReactNode }) {
  return <ContactContext.Provider value={phone}>{children}</ContactContext.Provider>;
}

export function useContactPhone(): string {
  const phone = useContext(ContactContext);
  if (phone === null) throw new Error("Falta el número de contacto de la tienda.");
  return phone;
}
