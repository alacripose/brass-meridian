import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const changelog = readFileSync(resolve(root, "CHANGELOG.md"), "utf8");
const start = changelog.indexOf(`## [${version}]`);
if (start < 0) {
  console.error(`RELEASE-FAIL no changelog section for ${version}`);
  process.exit(1);
}
const next = changelog.indexOf("\n## [", start + 4);
const section = changelog.slice(start, next < 0 ? undefined : next).trim();
console.log(section);
console.log("");
console.log(`Built from ${process.env.GITHUB_SHA ?? "the local tree"}.`);
