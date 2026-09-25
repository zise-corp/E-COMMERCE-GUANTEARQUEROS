import Image from "next/image";
import { Escudo } from "@/components/brand/Escudo";
import { cn } from "@/lib/cn";
import { imageKitUrl, IMAGE_SIZES, type ImagePreset } from "@/lib/images";

/**
 * Imagen de producto con el respaldo de marca cuando todavía no hay foto cargada.
 * El placeholder es el escudo apagado sobre la base oscura: nunca un cuadro blanco
 * ni un ícono genérico.
 */
export function ProductImage({
  publicId,
  alt,
  preset = "grid",
  priority = false,
  className,
}: {
  publicId: string | null;
  alt: string;
  preset?: ImagePreset;
  priority?: boolean;
  className?: string;
}) {
  if (!publicId) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-ink-900",
          className,
        )}
        aria-label={alt}
        role="img"
      >
        <Escudo width={44} height={52} className="opacity-[0.13]" title="" />
      </div>
    );
  }

  const sizes = preset in IMAGE_SIZES ? IMAGE_SIZES[preset as keyof typeof IMAGE_SIZES] : undefined;

  return (
    <Image
      src={imageKitUrl(publicId, preset)}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
