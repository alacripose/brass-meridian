import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entry = resolve(root, "node_modules/vitest/vitest.mjs");
const started = Date.now();
const result = spawnSync(process.execPath, [entry, "run"], { stdio: "inherit", cwd: root });
const ok = result.status === 0;
const receipt = {
  ok,
  kind: "typescript-tests",
  at: new Date().toISOString(),
  code: result.status,
  ms: Date.now() - started,
};
mkdirSync(resolve(root, "artifacts/receipts"), { recursive: true });
writeFileSync(resolve(root, "artifacts/receipts/test.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(`TEST-RECEIPT ${ok ? "PASS" : "FAIL"} code=${result.status}`);
process.exit(result.status ?? 1);
