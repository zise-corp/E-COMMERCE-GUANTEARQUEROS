import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

/** Falso durante un build sin base (por ejemplo un clon recién bajado). */
export function isDbConfigured(): boolean {
  return Boolean(process.env["DATABASE_URL"]);
}

// Next recarga módulos en cada cambio: el pool se guarda en globalThis para no
// abrir una conexión nueva por recarga en desarrollo.
const globalForDb = globalThis as unknown as {
  __gqSql?: ReturnType<typeof postgres>;
  __gqDb?: Db;
};

export function getDb(): Db {
  if (globalForDb.__gqDb) return globalForDb.__gqDb;

  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copiá .env.example a .env.local y completá la conexión de Postgres.",
    );
  }

  const client =
    globalForDb.__gqSql ??
    postgres(url, {
      max: process.env.NODE_ENV === "production" ? 10 : 3,
      idle_timeout: 20,
      // Los poolers (Supabase pgbouncer, Neon pooled) no soportan prepared statements.
      prepare: false,
    });

  const db = drizzle(client, { schema });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__gqSql = client;
    globalForDb.__gqDb = db;
  }
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
