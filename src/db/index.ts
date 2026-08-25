import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

/** Falso durante un build sin base (por ejemplo un clon recién bajado). */
export function isDbConfigured(): boolean {
  return Boolean(process.env["DATABASE_URL"]);
}

// Un solo pool por proceso, siempre — no solo en dev. Guardarlo en globalThis
// evita abrir una conexión nueva en cada recarga por HMR en desarrollo, pero la
// razón de fondo aplica igual en producción: un server ya arriba sirve muchos
// requests a lo largo de su vida y tiene que reusar el mismo pool en todos,
// nunca abrir uno por consulta. (Antes esto solo se guardaba fuera de
// producción por error: en producción cada `db.algo(...)` creaba un pool nuevo
// y nunca lo reutilizaba, así que las conexiones se iban acumulando sin
// cerrarse hasta agotar el límite de Postgres — rompía tanto `next build` como
// el server ya desplegado bajo tráfico real.)
const globalForDb = globalThis as unknown as {
  __gqSql?: ReturnType<typeof postgres>;
  __gqDb?: Db;
};

export function getDb(): Db {
  if (globalForDb.__gqDb) return globalForDb.__gqDb;

  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copia .env.example a .env.local y completa la conexión de Postgres.",
    );
  }

  // `next build` genera las páginas estáticas en varios workers en paralelo,
  // cada uno como proceso aparte con su propio pool: con max:10 por worker, unos
  // pocos workers a la vez ya superan el límite de conexiones de Postgres
  // ("sorry, too many clients already"). En build, un pool chico por worker
  // alcanza de sobra; el pool grande es para el server ya arriba, que sí
  // atiende tráfico real concurrente en un solo proceso.
  const isBuildPhase = process.env["NEXT_PHASE"] === PHASE_PRODUCTION_BUILD;
  const client = postgres(url, {
    max: isBuildPhase ? 2 : process.env.NODE_ENV === "production" ? 10 : 3,
    idle_timeout: 20,
    // Los poolers (Supabase pgbouncer, Neon pooled) no soportan prepared statements.
    prepare: false,
  });

  const db = drizzle(client, { schema });
  globalForDb.__gqSql = client;
  globalForDb.__gqDb = db;
  return db;
}

/**
 * Conexión perezosa: no se abre nada al importar el módulo, así el build no
 * necesita una base y el error de configuración aparece recién al consultar.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

let warned = false;

/**
 * Para las páginas públicas: sin DATABASE_URL devuelve el fallback en vez de romper
 * el build. Si la base *sí* está configurada y la consulta falla, el error sube.
 */
export async function withFallback<T>(fallback: T, run: () => Promise<T>): Promise<T> {
  if (!isDbConfigured()) {
    if (!warned) {
      warned = true;
      console.warn(
        "[db] Sin DATABASE_URL: las páginas se renderizan vacías. Configurá .env.local.",
      );
    }
    return fallback;
  }
  return run();
}
