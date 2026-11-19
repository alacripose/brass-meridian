// Headless proof. This reads the real wasm artifact and the documented
// snapshot layout, without a browser or a TypeScript build step.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wasm = new Uint8Array(readFileSync(resolve(root, "public/brass_core.wasm")));
const H = {
  version: 0,
  brass: 1,
  ingots: 2,
  core: 3,
  phase: 6,
  towers: 13,
  enemies: 14,
  pathSteps: 25,
  map: 29,
  raid: 30,
  pathCount: 31,
};
const SNAPSHOT = 8480;

function boot(seed) {
  const instance = new WebAssembly.Instance(new WebAssembly.Module(wasm), {});
  const ex = instance.exports;
  ex.sim_init(seed);
  return ex;
}

function snap(ex) {
  const ptr = ex.sim_snapshot_ptr();
  const len = ex.sim_snapshot_len();
  return new Float32Array(ex.memory.buffer, ptr, len);
}

function save(ex) {
  const len = ex.sim_save_len();
  const ptr = ex.sim_save_ptr();
  return Buffer.from(new Uint8Array(ex.memory.buffer, ptr, len));
}

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok: Boolean(ok), detail: detail ?? "" });
}

const firstEx = boot(42);
const first = snap(firstEx);
check("snapshot length", first.length === SNAPSHOT, `${first.length}`);
check("version", first[H.version] === 1, `${first[H.version]}`);
check("straight route is 16 steps", first[H.pathSteps] === 16, `${first[H.pathSteps]}`);
check("straight path has 17 nodes", first[H.pathCount] === 17, `${first[H.pathCount]}`);

const buildEx = boot(42);
check("empty plot", buildEx.sim_cell_state(8, 6) === 0);
check("pylon placed", buildEx.sim_place(8, 6, 3) === 0);
const detoured = snap(buildEx);
check("placement detours the route", detoured[H.pathSteps] > 16, `${detoured[H.pathSteps]}`);
check("occupied plot refuses", buildEx.sim_place(8, 6, 0) === -2);
check("tower count", detoured[H.towers] === 1, `${detoured[H.towers]}`);
check("brass paid", Math.abs(detoured[H.brass] - 115) < 0.01, `${detoured[H.brass]}`);

let refusals = 0;
for (let gz = 0; gz < 13; gz++) {
  if (buildEx.sim_place(8, gz, 0) !== 0) refusals++;
}
const walled = snap(buildEx);
check("a wall refuses at least one cell", refusals > 0, `${refusals}`);
check("a route survives every accepted wall", walled[H.pathSteps] >= 0 && walled[H.pathSteps] <= 40, `${walled[H.pathSteps]}`);

const mapEx = boot(42);
check("home tower placed", mapEx.sim_place(8, 6, 3) === 0);
check("switch to the flank", mapEx.sim_switch_map(1) === 0);
const flank = snap(mapEx);
check("flank is active", flank[H.map] === 1, `${flank[H.map]}`);
check("flank starts empty", flank[H.towers] === 0, `${flank[H.towers]}`);
check("home keeps its tower", mapEx.sim_map_tower_count(0) === 1, `${mapEx.sim_map_tower_count(0)}`);
check("flank route is legal", flank[H.pathSteps] > 0 && flank[H.pathSteps] <= 40, `${flank[H.pathSteps]}`);
check("track to the flank costs 14", mapEx.sim_track_cost(0, 1) === 14, `${mapEx.sim_track_cost(0, 1)}`);
check("track to the foundry costs 22", mapEx.sim_track_cost(1, 2) === 22, `${mapEx.sim_track_cost(1, 2)}`);
check("no far track", mapEx.sim_track_cost(0, 2) === -1, `${mapEx.sim_track_cost(0, 2)}`);
check("raid district is known", flank[H.raid] >= 0 && flank[H.raid] <= 2, `${flank[H.raid]}`);
check("switch back home", mapEx.sim_switch_map(0) === 0);
check("far travel refuses", mapEx.sim_switch_map(2) === -3);

const ashEx = boot(42);
check("hop to the flank", ashEx.sim_switch_map(1) === 0);
check("hop to the foundry", ashEx.sim_switch_map(2) === 0);
const ash = snap(ashEx);
check("foundry is active", ash[H.map] === 2, `${ash[H.map]}`);
check("foundry tower placed", ashEx.sim_place(8, 6, 3) === 0);
check("foundry keeps its tower", ashEx.sim_map_tower_count(2) === 1, `${ashEx.sim_map_tower_count(2)}`);

const waveEx = boot(7);
check("wave preview is eight drudges", waveEx.sim_preview_count(0) === 8, `${waveEx.sim_preview_count(0)}`);
check("wave called", waveEx.sim_call_wave() === 0);
for (let i = 0; i < 120; i++) waveEx.sim_step(33);
const live = snap(waveEx);
check("wave spawns enemies", live[H.enemies] > 0, `${live[H.enemies]}`);
check("wave goes live", live[H.phase] === 1, `${live[H.phase]}`);
check("a live wave pins the map", waveEx.sim_switch_map(1) === -2);

const cityEx = boot(11);
check("foundry built", cityEx.sim_city(0) === 0);
for (let i = 0; i < 100; i++) cityEx.sim_step(30);
const made = snap(cityEx);
check("foundry makes ingots", made[H.ingots] > 0.5, `${made[H.ingots].toFixed(3)}`);

// Determinism: same seed, same commands, same byte image.
const aEx = boot(9001);
const bEx = boot(9001);
for (const ex of [aEx, bEx]) {
  ex.sim_place(7, 4, 0);
  ex.sim_place(10, 8, 2);
  ex.sim_call_wave();
  for (let i = 0; i < 300; i++) ex.sim_step(33);
}
const aBytes = save(aEx);
const bBytes = save(bEx);
check("save length is stable", aBytes.length === bBytes.length, `${aBytes.length}/${bBytes.length}`);
check("same seed is deterministic", aBytes.equals(bBytes), `${aBytes.length} bytes`);

const restoredEx = boot(1);
const loadPtr = restoredEx.sim_snapshot_ptr();
new Uint8Array(restoredEx.memory.buffer).set(aBytes, loadPtr);
const loadCode = restoredEx.sim_load(loadPtr, aBytes.length);
const after = snap(restoredEx);
check("save loads", loadCode === 0, `${loadCode}`);
check("loaded towers match", after[H.towers] === snap(aEx)[H.towers], `${after[H.towers]}`);
check("loaded enemies match", after[H.enemies] === snap(aEx)[H.enemies], `${after[H.enemies]}`);
check("loaded route matches", after[H.pathSteps] === snap(aEx)[H.pathSteps], `${after[H.pathSteps]}`);

const raidSaveEx = boot(5);
raidSaveEx.sim_place(8, 6, 3);
raidSaveEx.sim_switch_map(1);
raidSaveEx.sim_place(8, 6, 3);
raidSaveEx.sim_switch_map(2);
raidSaveEx.sim_place(8, 6, 3);
const raidBytes = save(raidSaveEx);
const raidLoadEx = boot(1);
const raidPtr = raidLoadEx.sim_snapshot_ptr();
new Uint8Array(raidLoadEx.memory.buffer).set(raidBytes, raidPtr);
check("three-district save loads", raidLoadEx.sim_load(raidPtr, raidBytes.length) === 0);
const raidAfter = snap(raidLoadEx);
check("loaded map is the foundry", raidAfter[H.map] === 2, `${raidAfter[H.map]}`);
check("loaded raid matches", raidAfter[H.raid] === snap(raidSaveEx)[H.raid], `${raidAfter[H.raid]}`);
check("loaded flank keeps a tower", raidLoadEx.sim_map_tower_count(1) === 1, `${raidLoadEx.sim_map_tower_count(1)}`);

const ok = checks.every((c) => c.ok);
const receipt = {
  ok,
  kind: "headless-probe",
  at: new Date().toISOString(),
  sha256: createHash("sha256").update(wasm).digest("hex"),
  checks,
  bytes: wasm.length,
};
mkdirSync(resolve(root, "artifacts/receipts"), { recursive: true });
writeFileSync(resolve(root, "artifacts/receipts/probe.json"), JSON.stringify(receipt, null, 2) + "\n");
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` (${item.detail})` : ""}`);
console.log(`PROBE-${ok ? "PASS" : "FAIL"} ${checks.filter((c) => c.ok).length}/${checks.length}`);
process.exit(ok ? 0 : 1);
