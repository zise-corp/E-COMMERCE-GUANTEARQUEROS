/**
 * Crea o actualiza un usuario del panel.
 *
 *   npm run admin:create -- --user dani --pass "unaClaveLarga"
 *
 * La contraseña se guarda con Argon2id. Nunca se imprime ni se registra.
 */
import { eq } from "drizzle-orm";
import { hash } from "@node-rs/argon2";
import { db } from "../src/db/index";
import { adminUsers } from "../src/db/schema";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // el archivo puede no existir
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// Parámetros recomendados por OWASP para Argon2id.
export const ARGON_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

async function main() {
  const username = arg("user");
  const password = arg("pass");
  const role = arg("role") ?? "owner";

  if (!username || !password) {
    console.error('Uso: npm run admin:create -- --user <usuario> --pass "<contraseña>"');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("La contraseña necesita al menos 10 caracteres.");
    process.exit(1);
  }

  const passwordHash = await hash(password, ARGON_OPTIONS);
  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.username, username),
  });

  if (existing) {
    await db.update(adminUsers).set({ passwordHash, role }).where(eq(adminUsers.id, existing.id));
    console.log(`Contraseña actualizada para "${username}".`);
  } else {
    await db.insert(adminUsers).values({ username, passwordHash, role });
    console.log(`Usuario "${username}" creado con rol ${role}.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
