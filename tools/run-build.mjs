import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const started = Date.now();
const tsc = resolve(root, "node_modules/typescript/bin/tsc");
const vite = resolve(root, "node_modules/vite/bin/vite.js");
const typecheck = spawnSync(process.execPath, [tsc, "--noEmit"], { stdio: "inherit", cwd: root });
const build = typecheck.status === 0 ? spawnSync(process.execPath, [vite, "build"], { stdio: "inherit", cwd: root }) : { status: 1 };
const ok = typecheck.status === 0 && build.status === 0;
const files = [];
for (const file of ["dist/index.html", "dist/brass_core.wasm"]) {
  if (existsSync(resolve(root, file))) files.push({ file, bytes: statSync(resolve(root, file)).size });
}
mkdirSync(resolve(root, "artifacts/receipts"), { recursive: true });
writeFileSync(
  resolve(root, "artifacts/receipts/build.json"),
  JSON.stringify({ ok, kind: "production-build", at: new Date().toISOString(), ms: Date.now() - started, files }, null, 2) + "\n",
);
console.log(`BUILD-RECEIPT ${ok ? "PASS" : "FAIL"}`);
process.exit(ok ? 0 : 1);
