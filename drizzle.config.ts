import { defineConfig } from "drizzle-kit";

// drizzle-kit corre fuera de Next: hay que cargar el .env a mano.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // el archivo puede no existir, no es un error
  }
}

// `generate` solo necesita el schema; `migrate`, `push` y `studio` sí necesitan la URL
// y fallan con un mensaje claro del propio drizzle-kit si el placeholder queda puesto.
const url = process.env["DATABASE_URL"] ?? "postgresql://sin-configurar/guantearqueros";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
