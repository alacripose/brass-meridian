import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { extname } from "node:path";

const root = process.cwd();
const skipExt = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".wasm", ".zip", ".ico",
  ".woff", ".woff2", ".ttf", ".otf", ".mp3", ".ogg", ".wav", ".pdf",
]);

const secretRules = [
  ["private-key", /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ["aws-key", /\bAKIA[0-9A-Z]{16}\b/],
  ["openai-key", /\bsk-[A-Za-z0-9]{20,}\b/],
  ["slack-token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
];

const pathRules = [
  ["windows-path", /\b[A-Za-z]:[\\/][A-Za-z0-9_.-]+[\\/]/],
  ["user-path", /(?:^|[\s"'`])\/(?:Users|home)\/[A-Za-z0-9_.-]+\//],
  ["drive-path", /(?:^|[\s"'`])\/[a-z]\/Documents\//i],
];

const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z"], {
  cwd: root,
  encoding: "utf8",
}).split("\0").filter(Boolean);

const hits = [];
const add = (file, rule) => hits.push(`${rule}: ${file}`);

for (const file of files) {
  if (/(^|\/)\.env(\.|$)/.test(file) && !file.endsWith(".env.example")) add(file, "env-file");
  if (/\.(pem|key|p12|pfx|keystore|jks)$/i.test(file)) add(file, "key-file");
  if (/(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/.test(file)) add(file, "key-file");
  if (skipExt.has(extname(file).toLowerCase())) continue;

  let text;
  try {
    if (statSync(file).size > 2_000_000) continue;
    const buffer = readFileSync(file);
    if (buffer.includes(0)) continue;
    text = buffer.toString("utf8");
  } catch {
    continue;
  }

  for (const [rule, pattern] of secretRules) if (pattern.test(text)) add(file, rule);
  for (const [rule, pattern] of pathRules) if (pattern.test(text)) add(file, rule);
}

if (hits.length) {
  console.error("DELIVERY-SCAN-FAIL");
  for (const hit of hits.slice(0, 20)) console.error(hit);
  if (hits.length > 20) console.error(`... ${hits.length - 20} more`);
  process.exit(1);
}

console.log(`DELIVERY-SCAN-PASS files=${files.length}`);
