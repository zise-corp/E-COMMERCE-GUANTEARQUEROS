import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita mezclar chunks de `next dev` con los de `next build` cuando ambos
  // comandos se ejecutan durante una sesión de trabajo.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ik.imagekit.io", pathname: "/**" },
      { protocol: "https", hostname: "contents.mediadecathlon.com", pathname: "/**" },
      // DEMO temporal: fotos de stock para mostrarle la tienda "terminada" al
      // cliente antes de tener las fotos reales. Sacar esta línea cuando el catálogo
      // real ya tenga sus propias fotos subidas.
      { protocol: "https", hostname: "loremflickr.com", pathname: "/**" },
    ],
    // El diseño trabaja sobre fondo oscuro: nada de placeholders blancos.
    formats: ["image/avif", "image/webp"],
  },
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
