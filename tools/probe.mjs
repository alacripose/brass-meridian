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

function mapBytes(cells) {
  const bytes = new Uint8Array(7 + cells.length * 2);
  bytes.set([0x42, 0x4d, 0x4d, 0x50, 1, 1, cells.length]);
  cells.forEach(([gx, gz], i) => {
    bytes[7 + i * 2] = gx;
    bytes[8 + i * 2] = gz;
  });
  return bytes;
}

function importMap(ex, bytes) {
  const ptr = ex.sim_snapshot_ptr();
  new Uint8Array(ex.memory.buffer).set(bytes, ptr);
  return ex.sim_import_map(ptr, bytes.length);
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

// Expeditions: a paid, three-leg contract on the current district.
const expEx = boot(81);
check("contract fee is 30", expEx.sim_expedition_contract(0, 0) === 30, `${expEx.sim_expedition_contract(0, 0)}`);
check("contract pay is 55", expEx.sim_expedition_contract(0, 1) === 55, `${expEx.sim_expedition_contract(0, 1)}`);
check("contract starts", expEx.sim_expedition_start(0) === 0);
check("contract is live", expEx.sim_expedition(0) === 1, `${expEx.sim_expedition(0)}`);
check("contract paid the fee", Math.abs(snap(expEx)[H.brass] - 120) < 0.01, `${snap(expEx)[H.brass]}`);
check("second contract refuses", expEx.sim_expedition_start(1) === -1);
check("contract leg is zero", expEx.sim_expedition(2) === 0, `${expEx.sim_expedition(2)}`);

// The marsh moves with a cause, and a harvest pays.
const ecoEx = boot(82);
const water0 = ecoEx.sim_eco(1);
check("marsh starts balanced", ecoEx.sim_eco(9) === 0, `${ecoEx.sim_eco(9)}`);
check("sluice opens", ecoEx.sim_eco_action(0) === 0);
check("sluice raises water", ecoEx.sim_eco(1) > water0, `${ecoEx.sim_eco(1)}`);
check("sluice becomes the cause", ecoEx.sim_eco(9) === 5, `${ecoEx.sim_eco(9)}`);
const reedBrass = snap(ecoEx)[H.brass];
check("reed harvest pays", ecoEx.sim_eco_action(2) > 0);
check("reed harvest credits brass", snap(ecoEx)[H.brass] > reedBrass, `${snap(ecoEx)[H.brass]}`);

// One shell line: made, buffered, convoyed, capped offline.
const lineEx = boot(83);
check("line starts off", lineEx.sim_automation(5) === 0, `${lineEx.sim_automation(5)}`);
check("foundry stands", lineEx.sim_city(0) === 0);
for (let i = 0; i < 140; i++) lineEx.sim_step(33);
check("line starts", lineEx.sim_automation_toggle(0) === 0);
check("line is on", lineEx.sim_automation(5) === 1);
for (let i = 0; i < 140; i++) lineEx.sim_step(33);
check("line buffered shells", lineEx.sim_automation(1) >= 4, `${lineEx.sim_automation(1)}`);
check("convoy leaves", lineEx.sim_convoy() === 0);
for (let i = 0; i < 120; i++) lineEx.sim_step(33);
check("convoy delivers shells", lineEx.sim_automation(2) >= 4, `${lineEx.sim_automation(2)}`);
const offline = lineEx.sim_offline(3600);
check("offline gain is capped", offline <= 1200, `${offline}`);
check("rule toggles", lineEx.sim_automation_toggle(1) === 0 && lineEx.sim_automation(6) === 1);

// Survey maps: checked in the client, checked again in core.
const surveyEx = boot(84);
const survey = mapBytes([
  [5, 2],
  [5, 3],
  [6, 2],
  [11, 9],
  [12, 9],
  [11, 10],
]);
check("survey imports", importMap(surveyEx, survey) === 0);
check("survey is ready", surveyEx.sim_custom(0) === 1);
check("survey keeps six cells", surveyEx.sim_custom(1) === 6, `${surveyEx.sim_custom(1)}`);
check("survey cell turns to rubble", surveyEx.sim_cell_state(5, 2) === 1, `${surveyEx.sim_cell_state(5, 2)}`);
const surveySave = save(surveyEx);
const surveyLoad = boot(1);
const surveyPtr = surveyLoad.sim_snapshot_ptr();
new Uint8Array(surveyLoad.memory.buffer).set(surveySave, surveyPtr);
check("survey save loads", surveyLoad.sim_load(surveyPtr, surveySave.length) === 0);
check("survey survives a save", surveyLoad.sim_custom(0) === 1);
check("survey restores", surveyEx.sim_clear_map() === 0 && surveyEx.sim_custom(0) === 0);
const sealed = mapBytes(Array.from({ length: 13 }, (_, gz) => [8, gz]));
check("sealed survey refuses", importMap(surveyEx, sealed) === -5, `${importMap(surveyEx, sealed)}`);
check("survey refuses a built district", (() => {
  const ex = boot(85);
  ex.sim_switch_map(1);
  ex.sim_switch_map(2);
  ex.sim_place(9, 4, 3);
  return importMap(ex, survey) === -4;
})());

// Endless pressure is a curve, not a cliff.
const curveEx = boot(86);
check("wave 1 health is one", Math.abs(curveEx.sim_wave_curve(1, 0) - 1) < 0.001);
check("wave 30 health is capped", Math.abs(curveEx.sim_wave_curve(30, 1) - 1.3) < 0.001, `${curveEx.sim_wave_curve(30, 1)}`);
check("wave 10 holds a boss", curveEx.sim_wave_curve(10, 3) === 1);
check("wave 30 fields 73 enemies", curveEx.sim_wave_curve(30, 2) === 73, `${curveEx.sim_wave_curve(30, 2)}`);

// The pre-frontier fixture must still load.
const v4 = new Uint8Array(readFileSync(resolve(root, "tests/fixtures/save-v4.bin")));
const v4Ex = boot(1);
const v4Ptr = v4Ex.sim_snapshot_ptr();
new Uint8Array(v4Ex.memory.buffer).set(v4, v4Ptr);
check("v4 save loads", v4Ex.sim_load(v4Ptr, v4.length) === 0);
check("v4 save keeps three districts", v4Ex.sim_map_tower_count(0) === 1 && v4Ex.sim_map_tower_count(1) === 1 && v4Ex.sim_map_tower_count(2) === 1);

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
