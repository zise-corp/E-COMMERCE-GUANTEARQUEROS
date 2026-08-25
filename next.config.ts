import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      // DEMO temporal: fotos de stock para mostrarle la tienda "terminada" al
      // cliente antes de tener Cloudinary. Sacar esta línea cuando el catálogo
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
