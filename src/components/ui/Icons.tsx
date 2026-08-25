/**
 * Íconos de trazo, dibujados a mano. Nada de emoji ni de librerías de íconos:
 * el trazo recto de 1.6 acompaña la geometría angular del resto.
 */
type IconProps = { size?: number; className?: string; strokeWidth?: number };

function Svg({
  size = 16,
  className,
  strokeWidth = 1.6,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M15.5 15.5 20 20" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5 19 19M19 5 5 19" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4 12 5.5 5.5L20 7" />
    </Svg>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 12H4M10 6 4 12l6 6" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </Svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 4 6v6c0 4.4 3.4 7.7 8 9 4.6-1.3 8-4.6 8-9V6l-8-3Z" />
    </Svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 9h11v11H9zM4 15V4h11" />
    </Svg>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 4h2.5l2 11h10l2-8H7" />
      <circle cx="9" cy="19" r="1.4" />
      <circle cx="17" cy="19" r="1.4" />
    </Svg>
  );
}

/** Agarradera de arrastre: dos columnas de puntos, el gesto universal de "reordenar". */
export function GripIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <circle cx="7" cy="6" r="1.6" />
      <circle cx="7" cy="12" r="1.6" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="6" r="1.6" />
      <circle cx="17" cy="12" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </svg>
  );
}

export function WhatsappIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-1.8-1.3-2.3-2.3l1-1-1-2-1.2 1.3Z" />
    </Svg>
  );
}
