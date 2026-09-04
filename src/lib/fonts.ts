import localFont from "next/font/local";
import { Manrope } from "next/font/google";

/** Anton: títulos y precios. Siempre uppercase, casi siempre con skew. */
export const anton = localFont({
  src: "../app/fonts/Anton-Regular.ttf",
  variable: "--font-anton",
  weight: "400",
  style: "normal",
  display: "swap",
});

/** Manrope: UI, texto de producto, tablas del admin. */
export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});
