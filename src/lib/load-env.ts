/**
 * Carga .env.local / .env en los scripts que corren fuera de Next (seed, admin:create,
 * verify:sql). Next los lee solo, `tsx` no.
 *
 * Se importa por efecto: `import "@/lib/load-env";` como primera línea del script.
 */
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // el archivo puede no existir, no es un error
  }
}
