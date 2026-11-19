// Append-only ledger helper.
//   node tools/ledger.mjs verify
//   node tools/ledger.mjs add tests T-0001 "claim" artifacts/receipts/test.json true
//
// Rows are one JSON object per line. A row is never edited; a correction is a
// new row that names the old one in `fixes`. Files rotate by phase so an old
// phase stays cheap to read.

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = new Set(["failures", "health", "probes", "tests", "improvements", "reconciliation"]);

function ledgerFiles() {
  const files = [];
  const base = resolve(root, "ledger");
  if (!existsSync(base)) return files;
  for (const type of readdirSync(base)) {
    if (!TYPES.has(type)) continue;
    const dir = resolve(base, type);
    for (const name of readdirSync(dir)) {
      if (name.endsWith(".jsonl")) files.push({ type, name, path: resolve(dir, name) });
    }
  }
  return files;
}

export function verifyLedger() {
  const problems = [];
  let rows = 0;
  for (const file of ledgerFiles()) {
    const lines = readFileSync(file.path, "utf8").split(/\r?\n/).filter(Boolean);
    let expected = 1;
    lines.forEach((line, index) => {
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        problems.push(`${file.type}/${file.name}:${index + 1} is not JSON`);
        return;
      }
      rows++;
      if (row.seq !== expected) problems.push(`${file.type}/${file.name}:${index + 1} seq ${row.seq} expected ${expected}`);
      expected = row.seq === expected ? expected + 1 : expected;
      for (const key of ["at", "ticket", "claim", "ev", "ok"]) {
        if (row[key] === undefined) problems.push(`${file.type}/${file.name}:${index + 1} missing ${key}`);
      }
      if (row.at && Number.isNaN(Date.parse(row.at))) problems.push(`${file.type}/${file.name}:${index + 1} bad date`);
      if (row.ev && !existsSync(resolve(root, row.ev))) problems.push(`${file.type}/${file.name}:${index + 1} evidence missing: ${row.ev}`);
      if (typeof row.ok !== "boolean") problems.push(`${file.type}/${file.name}:${index + 1} ok is not boolean`);
    });
  }
  return { problems, rows, files: ledgerFiles().length };
}

function add(type, ticket, claim, evidence, ok) {
  if (!TYPES.has(type)) {
    console.error(`LEDGER-FAIL unknown type ${type}`);
    process.exit(2);
  }
  if (!existsSync(resolve(root, evidence))) {
    console.error(`LEDGER-FAIL evidence does not exist: ${evidence}`);
    process.exit(2);
  }
  const file = resolve(root, "ledger", type, "phase-01.jsonl");
  mkdirSync(dirname(file), { recursive: true });
  const lines = existsSync(file) ? readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean) : [];
  const row = {
    seq: lines.length + 1,
    at: new Date().toISOString(),
    ticket,
    claim,
    ev: evidence,
    ok: ok === "true" || ok === true,
  };
  appendFileSync(file, JSON.stringify(row) + "\n");
  console.log(`LEDGER-ADD ${type} seq ${row.seq}`);
}

const invoked = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
const [command, ...rest] = process.argv.slice(2);
if (!invoked) {
  // Imported by the gate: expose verifyLedger only.
} else if (command === "verify") {
  const result = verifyLedger();
  for (const problem of result.problems) console.log(`FAIL ${problem}`);
  console.log(`LEDGER-${result.problems.length ? "FAIL" : "PASS"} rows=${result.rows} files=${result.files}`);
  process.exit(result.problems.length ? 1 : 0);
} else if (command === "add") {
  const [type, ticket, claim, evidence, ok] = rest;
  if (!type || !ticket || !claim || !evidence) {
    console.error("usage: ledger.mjs add <type> <ticket> <claim> <evidence> <true|false>");
    process.exit(2);
  }
  add(type, ticket, claim, evidence, ok);
} else {
  console.log("usage: ledger.mjs verify | add ...");
  process.exit(2);
}
