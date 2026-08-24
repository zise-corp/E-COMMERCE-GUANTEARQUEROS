import { Anton, Manrope } from "next/font/google";

/** Anton: títulos y precios. Siempre uppercase, casi siempre con skew. */
export const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

/** Manrope: UI, texto de producto, tablas del admin. */
export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});
