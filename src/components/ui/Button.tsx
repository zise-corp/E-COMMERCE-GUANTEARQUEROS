import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "ghost" | "drei" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-extrabold uppercase " +
  "transition-[background-color,color,border-color,box-shadow,filter] duration-150 " +
  "select-none disabled:pointer-events-none";

const sizes: Record<Size, string> = {
  sm: "px-4 py-2.5 text-[11.5px] tracking-[0.1em]",
  md: "px-6 py-[15px] text-[12.5px] tracking-[0.12em]",
  lg: "px-[30px] py-[17px] text-[13.5px] tracking-[0.12em]",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-ink-950 hover:bg-brand-hot hover:shadow-glow-brand " +
    "focus-visible:bg-brand-hot focus-visible:shadow-glow-brand " +
    "disabled:bg-ink-700 disabled:text-content-faint disabled:shadow-none",
  outline:
    "border border-[#3A3A38] text-content hover:border-brand hover:text-brand " +
    "disabled:border-line disabled:text-content-faint",
  ghost:
    "text-content-muted hover:text-brand disabled:text-content-faint",
  drei:
    "border border-drei-line text-drei-ink hover:bg-drei disabled:opacity-50",
  danger:
    "border border-alert text-alert-soft hover:bg-alert hover:text-white disabled:opacity-50",
};

export type ButtonProps = {
  variant?: Variant;
  size?: Size;
  /** Corte diagonal del design system. Por defecto solo en `primary`. */
  slash?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
};

function classes({ variant = "primary", size = "md", slash, fullWidth, className }: ButtonProps) {
  const useSlash = slash ?? variant === "primary";
  return cn(
    base,
    sizes[size],
    variants[variant],
    useSlash && (size === "lg" ? "clip-slash-lg" : "clip-slash"),
    // Con clip-path el anillo de foco se recorta: se marca con glow y realce.
    useSlash && "focus-visible:outline-none focus-visible:ring-0 focus-visible:brightness-110",
    fullWidth ? "w-full" : "",
    className,
  );
}

export function Button({
  variant,
  size,
  slash,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  return (
    <button
      type="button"
      className={classes({ variant, size, slash, fullWidth, className, children })}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  slash,
  fullWidth,
  className,
  children,
  href,
  ...rest
}: ButtonProps & { href: string } & Omit<
    React.ComponentPropsWithoutRef<typeof Link>,
    "className" | "children" | "href"
  >) {
  return (
    <Link
      href={href}
      className={classes({ variant, size, slash, fullWidth, className, children })}
      {...rest}
    >
      {children}
    </Link>
  );
}
