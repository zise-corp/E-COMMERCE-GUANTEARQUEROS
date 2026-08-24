import { cn } from "@/lib/cn";
import { formatBs, type Money } from "@/lib/money";

/** Jerarquía agresiva: precio en Anton naranja, anterior tachado en `dim`. */
export function Price({
  value,
  compareAt,
  size = "md",
  className,
}: {
  value: Money;
  compareAt?: Money | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: { now: "text-[19px]", was: "text-xs" },
    md: { now: "text-[26px]", was: "text-[13px]" },
    lg: { now: "text-[30px]", was: "text-base" },
    xl: { now: "text-[clamp(2.5rem,6vw,3.5rem)]", was: "text-xl pb-2" },
  } as const;
  const showCompare =
    compareAt !== null && compareAt !== undefined && Number(compareAt) > Number(value);

  return (
    <span className={cn("flex flex-wrap items-baseline gap-2.5", className)}>
      <span className={cn("font-display leading-none text-brand tabular", sizes[size].now)}>
        {formatBs(value)}
      </span>
      {showCompare ? (
        <span className={cn("text-content-dim line-through tabular", sizes[size].was)}>
          {formatBs(compareAt)}
        </span>
      ) : null}
    </span>
  );
}
