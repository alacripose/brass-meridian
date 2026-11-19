import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const started = Date.now();
const result = spawnSync("cargo", ["test", "--manifest-path", resolve(root, "core/Cargo.toml"), "--quiet"], {
  stdio: "inherit",
  cwd: root,
});
const ok = result.status === 0;
const receipt = {
  ok,
  kind: "rust-tests",
  at: new Date().toISOString(),
  code: result.status,
  ms: Date.now() - started,
};
mkdirSync(resolve(root, "artifacts/receipts"), { recursive: true });
writeFileSync(resolve(root, "artifacts/receipts/rust-test.json"), JSON.stringify(receipt, null, 2) + "\n");
console.log(`RUST-RECEIPT ${ok ? "PASS" : "FAIL"} code=${result.status}`);
process.exit(result.status ?? 1);
