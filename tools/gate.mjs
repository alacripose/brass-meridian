// The gate is the definition of done. It reads source and receipts; it does
// not trust a summary. Run it after tests, probe, build, and status.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reviewCopy, reviewProse } from "./prose.mjs";
import { verifyLedger } from "./ledger.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok: Boolean(ok), detail });
}
function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}
function json(path) {
  try {
    return JSON.parse(read(path));
  } catch {
    return null;
  }
}
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (["node_modules", "dist", ".git", "target", ".cloud-attachments", "artifacts"].includes(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// --- version and changelog -------------------------------------------------
const pkg = json("package.json");
const version = pkg?.version ?? "0";
check("package is MIT", pkg?.license === "MIT");
const changelog = read("CHANGELOG.md");
check("changelog names this version", changelog.includes(`## [${version}]`), `looking for ${version}`);

// --- prose -----------------------------------------------------------------
try {
  const docs = [
    "README.md",
    "AGENTS.md",
    "CHANGELOG.md",
    "ledger/README.md",
    ...readdirSync(resolve(root, "docs")).filter((n) => n.endsWith(".md")).map((n) => `docs/${n}`),
    ...readdirSync(resolve(root, "tickets")).filter((n) => n.endsWith(".md")).map((n) => `tickets/${n}`),
  ];
  const issues = [];
  for (const path of docs) {
    for (const issue of reviewProse(read(path))) issues.push({ path, ...issue });
  }
  const copyIssues = reviewCopy(read("src/copy.ts")).map((issue) => ({ path: "src/copy.ts", ...issue }));
  check("two-second prose", issues.length === 0 && copyIssues.length === 0, [...issues, ...copyIssues].slice(0, 4).map((i) => `${i.path}:${i.kind}:${i.detail}`).join(" | "));
} catch (error) {
  check("two-second prose", false, String(error));
}

// --- ledgers ---------------------------------------------------------------
try {
  const ledger = verifyLedger();
  check("ledger schema and evidence", ledger.problems.length === 0, ledger.problems.slice(0, 4).join(" | "));
  check("ledger has rows", ledger.rows > 0, `${ledger.rows} rows`);
  for (const type of ["failures", "health", "probes", "tests", "improvements", "reconciliation"]) {
    const dir = resolve(root, "ledger", type);
    const files = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith(".jsonl")) : [];
    check(`ledger ${type}`, files.length > 0, files.join(","));
  }
  const rows = readFileSync(resolve(root, "ledger/reconciliation/phase-06.jsonl"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const ids = new Set(rows.map((row) => row.q));
  check("reconciliation covers every answer", rows.length === 100 && ids.size === 100 && rows.every((row) => ["consistent", "contradicts", "taste"].includes(row.verdict) && Boolean(row.source)), `${rows.length} rows`);
} catch (error) {
  check("ledger schema", false, String(error));
}

// --- tickets ---------------------------------------------------------------
try {
  const files = readdirSync(resolve(root, "tickets")).filter((n) => n.endsWith(".md"));
  const problems = [];
  for (const file of files) {
    const text = read(`tickets/${file}`);
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!front) {
      problems.push(`${file} has no front matter`);
      continue;
    }
    const fields = Object.fromEntries(front[1].split(/\r?\n/).map((line) => {
      const at = line.indexOf(":");
      return at < 0 ? [line.trim(), ""] : [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }));
    if (!fields.id || !file.startsWith(fields.id)) problems.push(`${file} id ${fields.id ?? "?"}`);
    if (!["open", "active", "done"].includes(fields.status)) problems.push(`${file} status ${fields.status}`);
    if (fields.status === "done" && (!fields.evidence || !existsSync(resolve(root, fields.evidence)))) {
      problems.push(`${file} done evidence ${fields.evidence ?? "missing"}`);
    }
  }
  check("ticket front matter", problems.length === 0, problems.slice(0, 4).join(" | "));
} catch (error) {
  check("ticket front matter", false, String(error));
}

// --- progress and status ---------------------------------------------------
let percent = 0;
try {
  const progress = json("state/progress.json");
  const totals = progress?.totals ?? {};
  percent = totals.percent ?? 0;
  check("progress is labelled 6.0", progress?.label === "6.0" && totals.have > 0 && totals.need > 0, `${totals.have}/${totals.need}`);
  check("status percentage is current", read("STATUS.md").includes(`6.0 inventory ${percent}%`), `expected ${percent}%`);
  check("status rejects the legacy label", !read("STATUS.md").includes("Legacy inventory") && !read("STATUS.md").includes("Project 5.5%"), "legacy label");
} catch (error) {
  check("progress file", false, String(error));
}

// --- measured 6.0 inventory ------------------------------------------------
try {
  const scope = json("state/scope.json");
  const progress = json("state/progress.json");
  const areas = scope?.areas ?? [];
  const need = areas.reduce((sum, area) => sum + (area.need ?? 0), 0);
  const have = areas.reduce((sum, area) => sum + (area.have ?? 0), 0);
  const scopePercent = need ? Math.round((have / need) * 1000) / 10 : 0;
  const countsOk = areas.every((area) => Number.isInteger(area.have) && Number.isInteger(area.need) && area.need > 0 && area.have >= 0 && area.have <= area.need);
  const evidenceOk = areas.every((area) => Array.isArray(area.evidence) && area.evidence.length > 0 && area.evidence.every((path) => existsSync(resolve(root, path))));
  const gapOk = areas.every((area) => Array.isArray(area.missing) && area.missing.length <= Math.max(0, area.need - area.have));
  check("scope label is 6.0", scope?.label === "6.0");
  check("scope has measured counts", areas.length >= 18 && countsOk, `${areas.length} areas`);
  check("scope evidence exists", evidenceOk);
  check("scope names a gap and a next step", gapOk && areas.every((area) => area.have >= area.need || Boolean(area.next)));
  check("scope percentage is single digit", scopePercent > 0 && scopePercent < 10, `${scopePercent}%`);
  check("progress mirrors scope", progress?.totals?.have === have && progress?.totals?.need === need && progress?.totals?.percent === scopePercent, `${progress?.totals?.have}/${progress?.totals?.need}`);
  check("scope drops the old figure", !read("README.md").includes("5.5%") && !read("STATUS.md").includes("5.5%"), "old figure");
} catch (error) {
  check("scope inventory", false, String(error));
}

// --- snapshot ABI ----------------------------------------------------------
try {
  const wasm = readFileSync(resolve(root, "public/brass_core.wasm"));
  const instance = new WebAssembly.Instance(new WebAssembly.Module(wasm), {});
  const ex = instance.exports;
  check("wasm snapshot length", ex.sim_snapshot_len() === 8494, `${ex.sim_snapshot_len()}`);
  check("wasm ABI version", ex.sim_version() === 1, `${ex.sim_version()}`);
  check("64-bit seed ABI", typeof ex.sim_init64 === "function" && typeof ex.sim_seed_lo === "function" && typeof ex.sim_seed_hi === "function");
  check("save format 9 is declared", read("core/src/lib.rs").includes("w.push(9)"));
  check("world ABI is exported", typeof ex.sim_world_step === "function" && typeof ex.sim_world_region === "function" && Math.abs(ex.sim_world_km() - 5009.375) < 0.001);
  check("chunk ABI is exported", typeof ex.sim_chunk_count === "function" && typeof ex.sim_chunk === "function" && typeof ex.sim_chunk_id_lo === "function");
  const ts = read("src/sim.ts");
  check("TS stride mirrors the core", ts.includes("TOWER_STRIDE = 16") && ts.includes("ENEMY_STRIDE = 12"));
  check("TS path base mirrors the core", ts.includes("PROJ_STRIDE = 10") && ts.includes("FX_STRIDE = 8"));
} catch (error) {
  check("snapshot ABI", false, String(error));
}

// --- receipts --------------------------------------------------------------
try {
  const wasmReceipt = json("artifacts/receipts/wasm-build.json");
  const wasm = readFileSync(resolve(root, "public/brass_core.wasm"));
  const digest = createHash("sha256").update(wasm).digest("hex");
  check("wasm receipt matches artifact", Boolean(wasmReceipt?.ok) && wasmReceipt.sha256 === digest, wasmReceipt?.sha256 ?? "missing");
  check("typescript tests passed", Boolean(json("artifacts/receipts/test.json")?.ok));
  check("rust tests passed", Boolean(json("artifacts/receipts/rust-test.json")?.ok));
  check("headless probe passed", Boolean(json("artifacts/receipts/probe.json")?.ok));
  check("production build passed", Boolean(json("artifacts/receipts/build.json")?.ok));
} catch (error) {
  check("receipts", false, String(error));
}

// --- refusals --------------------------------------------------------------
try {
  const source = read("src/refusals.ts");
  const ids = [...source.matchAll(/"([a-z][a-z0-9-]+)"/g)].map((m) => m[1]);
  const doc = read("docs/REFUSALS.md");
  const missing = ids.filter((id) => !doc.includes(`\`${id}\``));
  check("refusal ids are documented", ids.length >= 5 && missing.length === 0, missing.join(",") || `${ids.length} ids`);
} catch (error) {
  check("refusal ids", false, String(error));
}

// --- secrets ---------------------------------------------------------------
try {
  const patterns = [
    /gh[pousr]_[A-Za-z0-9]{20,}/,
    /github_pat_[A-Za-z0-9_]{20,}/,
    /sk-[A-Za-z0-9]{20,}/,
    /AKIA[0-9A-Z]{16}/,
    /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/,
    /xox[baprs]-[A-Za-z0-9-]{10,}/,
  ];
  const hits = [];
  for (const file of walk(root)) {
    if ([".png", ".jpg", ".webp", ".wasm", ".zip", ".ico"].includes(extname(file))) continue;
    if (file.endsWith("package-lock.json")) continue;
    const text = readFileSync(file, "utf8");
    if (patterns.some((pattern) => pattern.test(text))) hits.push(file.replace(root + "\\", "").replace(root + "/", ""));
  }
  check("no committed secrets", hits.length === 0, hits.slice(0, 3).join(","));
  check("no root .env", !existsSync(resolve(root, ".env")));
  check(".env is ignored", read(".gitignore").includes(".env"));
} catch (error) {
  check("secret scan", false, String(error));
}

// --- repository shape ------------------------------------------------------
for (const file of ["README.md", "AGENTS.md", "LICENSE", "CONTRIBUTING.md", ".github/workflows/ci.yml", ".github/workflows/release.yml"]) {
  check(`file ${file}`, existsSync(resolve(root, file)));
}
try {
  const ci = read(".github/workflows/ci.yml");
  check("CI runs tests, probe, scope, scan, gate", ["npm test", "npm run test:rust", "npm run probe", "npm run scope", "npm run scan", "npm run gate"].every((line) => ci.includes(line)));
  check("PWA shell exists", read("index.html").includes("viewport-fit=cover"));
} catch (error) {
  check("CI shape", false, String(error));
}

const ok = checks.every((item) => item.ok);
const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
console.log(`GATE-${ok ? "PASS" : "FAIL"} ${passed}/${checks.length}`);
console.log(`GATE-JSON ${JSON.stringify({ ok, passed, total: checks.length, percent, checks })}`);
mkdirSync(resolve(root, "artifacts/receipts"), { recursive: true });
writeFileSync(
  resolve(root, "artifacts/receipts/gate.json"),
  JSON.stringify({ ok, at: new Date().toISOString(), passed, total: checks.length, percent, checks }, null, 2) + "\n",
);
process.exit(ok ? 0 : 1);
