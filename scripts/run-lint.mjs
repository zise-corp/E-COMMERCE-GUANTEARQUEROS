import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["node_modules/eslint/bin/eslint.js", "src", "scripts", "next.config.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, ESLINT_USE_FLAT_CONFIG: "false" },
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
