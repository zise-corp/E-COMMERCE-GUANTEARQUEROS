/**
 * Todo el sitio es Bs (BOB) y español boliviano: separador de miles ".", decimal ",".
 * Los precios llegan de Postgres `numeric` como string — nunca los pasamos por
 * `parseFloat` para guardarlos, solo para mostrarlos.
 */

export type Money = string | number;

export function toNumber(value: Money): number {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

/** "Bs 1.240" · "Bs 1.240,50" cuando hay centavos. */
export function formatBs(value: Money): string {
  const n = toNumber(value);
  const hasCents = Math.round(n * 100) % 100 !== 0;
  return `Bs ${n.toLocaleString("es-BO", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Solo el número, para cuando el "Bs" va aparte en otro tamaño. */
export function formatNumber(value: Money): string {
  return toNumber(value).toLocaleString("es-BO", { maximumFractionDigits: 2 });
}

/** "Bs 31,4k" para los KPI del admin. */
export function formatBsCompact(value: Money): string {
  const n = toNumber(value);
  if (Math.abs(n) < 1000) return formatBs(n);
  const k = n / 1000;
  return `Bs ${k.toLocaleString("es-BO", { maximumFractionDigits: 1 })}k`;
}

/** Porcentaje de descuento entero, o null si no hay precio anterior válido. */
export function discountPercent(price: Money, compareAt: Money | null | undefined): number | null {
  if (compareAt === null || compareAt === undefined) return null;
  const p = toNumber(price);
  const c = toNumber(compareAt);
  if (c <= 0 || p <= 0 || c <= p) return null;
  return Math.round((1 - p / c) * 100);
}

/** Suma de líneas en centavos enteros: evita el 0.1 + 0.2 de los flotantes. */
export function sumLines(lines: Array<{ unitPrice: Money; quantity: number }>): number {
  const cents = lines.reduce(
    (acc, l) => acc + Math.round(toNumber(l.unitPrice) * 100) * l.quantity,
    0,
  );
  return cents / 100;
}

/** Formato para columnas `numeric` de Postgres: siempre 2 decimales, punto decimal. */
export function toDbNumeric(value: Money): string {
  return toNumber(value).toFixed(2);
}
