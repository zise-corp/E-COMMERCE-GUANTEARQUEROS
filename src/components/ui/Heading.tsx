import { cn } from "@/lib/cn";

/** H1/H2 en Anton con skew. El texto corrido nunca lleva skew. */
export function Display({
  as: Tag = "h2",
  size = "md",
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3" | "div";
  size?: "xl" | "lg" | "md" | "sm";
  className?: string;
  children: React.ReactNode;
}) {
  const sizes = {
    xl: "text-[clamp(3.25rem,9vw,6.75rem)] leading-[0.86] tracking-[-0.01em]",
    lg: "text-[clamp(2.25rem,6vw,3.5rem)] leading-[0.92]",
    md: "text-[clamp(1.75rem,4vw,2.125rem)] leading-none",
    sm: "text-[22px] leading-none",
  } as const;
  return (
    <Tag className={cn("font-display uppercase skew-fast", sizes[size], className)}>{children}</Tag>
  );
}

/** Cabecera de sección: título + acción, separados por la línea del design system. */
export function SectionHeader({
  title,
  aside,
  className,
}: {
  title: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-[26px] flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3.5",
        className,
      )}
    >
      <Display as="h2" size="md">
        {title}
      </Display>
      {aside ? <div className="label-xs text-content-dim">{aside}</div> : null}
    </div>
  );
}
