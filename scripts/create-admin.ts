/**
 * Crea o actualiza un usuario del panel.
 *
 *   .\node_modules\.bin\tsx.cmd scripts/create-admin.ts --user admin --pass-stdin
 *   .\node_modules\.bin\tsx.cmd scripts/create-admin.ts --user superadmin --role superadmin --pass-stdin
 *
 * La contraseña se guarda con Argon2id. Nunca se imprime ni se registra.
 */
import "../src/lib/load-env";
import { eq, sql } from "drizzle-orm";
import { hash } from "@node-rs/argon2";
import { db } from "../src/db/index";
import { adminUsers } from "../src/db/schema";

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
  const stdinPassword = process.argv.includes("--pass-stdin");
  if (stdinPassword && arg("pass")) {
    console.error("Usa --pass o --pass-stdin, no ambos.");
    process.exit(1);
  }
  let password = arg("pass");
  if (stdinPassword) {
    let input = "";
    for await (const chunk of process.stdin) input += chunk.toString();
    password = input.replace(/[\r\n]+$/, "");
  }
  const requestedRole = arg("role");

  if (!username || !password) {
    console.error('Uso: tsx scripts/create-admin.ts --user <usuario> --pass-stdin [--role owner|superadmin]');
    process.exit(1);
  }
  if (requestedRole && requestedRole !== "owner" && requestedRole !== "superadmin") {
    console.error("El rol debe ser owner o superadmin.");
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
  const role = requestedRole ?? existing?.role ?? "owner";

  if (existing) {
    await db.update(adminUsers).set({ passwordHash, role, sessionVersion: sql`${adminUsers.sessionVersion} + 1` }).where(eq(adminUsers.id, existing.id));
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
