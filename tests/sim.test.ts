import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseMap, validateMap } from "../src/map";
import { GRID_H, GRID_W, PLACE, SNAPSHOT_FLOATS, Sim } from "../src/sim";

const wasm = new Uint8Array(readFileSync(resolve(process.cwd(), "public/brass_core.wasm")));

function fresh(seed = 1234): Sim {
  const sim = Sim.fromBytes(wasm);
  sim.init(seed);
  return sim;
}

describe("snapshot bridge", () => {
  it("reads the documented header and a straight route", () => {
    const snap = fresh().snapshot();
    expect(snap.version).toBe(1);
    expect(snap.pathSteps).toBe(16);
    expect(snap.path.length).toBeGreaterThanOrEqual(17);
    expect(snap.core).toBe(20);
    expect(snap.wave).toBe(1);
    expect(snap.canCall).toBe(true);
    expect(snap.map).toBe(0);
    expect(snap.towerCount).toBe(0);
    expect(SNAPSHOT_FLOATS).toBe(8480);
  });

  it("keeps the grid dimensions the renderer draws", () => {
    expect(GRID_W).toBe(17);
    expect(GRID_H).toBe(13);
  });
});

describe("maze placement", () => {
  it("raises a tower, blocks the cell, and lengthens the route", () => {
    const sim = fresh();
    expect(sim.cellState(8, 6)).toBe(0);
    expect(sim.place(8, 6, 3)).toBe(PLACE.ok);
    expect(sim.cellState(8, 6)).toBe(4);
    const snap = sim.snapshot();
    expect(snap.towerCount).toBe(1);
    expect(snap.pathSteps).toBeGreaterThan(16);
    expect(snap.brass).toBe(115);
  });

  it("refuses a wall that would seal the core", () => {
    const sim = fresh();
    let refused = 0;
    for (let gz = 0; gz < GRID_H; gz++) {
      if (sim.place(8, gz, 0) !== 0) refused++;
    }
    expect(refused).toBeGreaterThan(0);
    expect(sim.snapshot().pathSteps).toBeGreaterThanOrEqual(0);
  });

  it("refuses a taken plot without charging", () => {
    const sim = fresh();
    sim.place(8, 6, 3);
    const brass = sim.snapshot().brass;
    expect(sim.place(8, 6, 0)).toBe(PLACE.occupied);
    expect(sim.snapshot().brass).toBe(brass);
  });

  it("upgrades and sells with a measured refund", () => {
    const sim = fresh();
    sim.place(8, 6, 0);
    expect(sim.snapshot().towers[0].level).toBe(0);
    expect(sim.upgrade(0)).toBe(0);
    expect(sim.snapshot().towers[0].level).toBe(1);
    const value = sim.sellValue(0);
    expect(value).toBeGreaterThan(0);
    expect(sim.sell(0)).toBe(value);
    expect(sim.snapshot().towerCount).toBe(0);
  });

  it("keeps a build on each district", () => {
    const sim = fresh();
    expect(sim.place(8, 6, 3)).toBe(PLACE.ok);
    expect(sim.switchMap(1)).toBe(0);
    expect(sim.snapshot().map).toBe(1);
    expect(sim.snapshot().towerCount).toBe(0);
    expect(sim.mapTowerCount(0)).toBe(1);
    expect(sim.place(8, 6, 0)).toBe(PLACE.ok);
    expect(sim.switchMap(0)).toBe(0);
    expect(sim.snapshot().towerCount).toBe(1);
    expect(sim.mapTowerCount(1)).toBe(1);
  });

  it("charges track brass and refuses a far hop", () => {
    const sim = fresh();
    expect(sim.trackCost(0, 1)).toBe(14);
    expect(sim.trackCost(1, 2)).toBe(22);
    expect(sim.trackCost(0, 2)).toBe(-1);
    expect(sim.switchMap(2)).toBe(-3);
    expect(sim.switchMap(1)).toBe(0);
    expect(sim.snapshot().brass).toBe(136);
    expect(sim.switchMap(2)).toBe(0);
    expect(sim.snapshot().brass).toBe(114);
  });
});

describe("waves and city", () => {
  it("previews the first wave before it is called", () => {
    const sim = fresh();
    expect(sim.previewCount(0)).toBe(8);
    expect(sim.previewCount(4)).toBe(0);
  });

  it("spawns the wave and reports live enemies", () => {
    const sim = fresh();
    expect(sim.callWave()).toBe(0);
    expect(sim.snapshot().canCall).toBe(false);
    sim.step(1400);
    const snap = sim.snapshot();
    expect(snap.phase).toBe(1);
    expect(snap.enemyCount).toBeGreaterThan(0);
    expect(snap.spawnLeft).toBeLessThan(8);
  });

  it("turns a foundry into ingots over time", () => {
    const sim = fresh();
    expect(sim.cityCost(0, 0, 0)).toBe(80);
    expect(sim.buildCity(0)).toBe(0);
    for (let i = 0; i < 100; i++) sim.step(30);
    expect(sim.snapshot().ingots).toBeGreaterThan(0.5);
  });

  it("repairs only when the core is hurt", () => {
    const sim = fresh();
    expect(sim.repair()).toBe(-2);
  });

  it("reports a raid district inside the frontier", () => {
    const snap = fresh().snapshot();
    expect(snap.threatDistrict).toBeGreaterThanOrEqual(0);
    expect(snap.threatDistrict).toBeLessThanOrEqual(2);
  });
});

describe("save image", () => {
  it("round-trips a live wave through a new wasm instance", () => {
    const sim = fresh(88);
    sim.place(8, 6, 3);
    sim.place(6, 4, 0);
    sim.callWave();
    for (let i = 0; i < 80; i++) sim.step(33);
    const before = sim.snapshot();
    const image = sim.saveBytes();
    expect(image.length).toBeGreaterThan(100);

    const restored = Sim.fromBytes(wasm);
    expect(restored.loadBytes(image)).toBe(0);
    const after = restored.snapshot();
    expect(after.towerCount).toBe(before.towerCount);
    expect(after.enemyCount).toBe(before.enemyCount);
    expect(after.wave).toBe(before.wave);
    expect(after.pathSteps).toBe(before.pathSteps);
    expect(Math.abs(after.brass - before.brass)).toBeLessThan(0.01);
  });

  it("rejects a corrupt image", () => {
    const sim = fresh();
    expect(sim.loadBytes(new Uint8Array([1, 2, 3, 4, 5, 6]))).not.toBe(0);
  });

  it("round-trips three districts and the raid edge", () => {
    const sim = fresh(77);
    sim.switchMap(1);
    expect(sim.place(8, 6, 3)).toBe(PLACE.ok);
    sim.switchMap(2);
    expect(sim.place(8, 6, 0)).toBe(PLACE.ok);
    const before = sim.snapshot();
    const restored = Sim.fromBytes(wasm);
    expect(restored.loadBytes(sim.saveBytes())).toBe(0);
    const after = restored.snapshot();
    expect(after.map).toBe(2);
    expect(after.threatDistrict).toBe(before.threatDistrict);
    expect(after.towers[0].kind).toBe(0);
    expect(restored.mapTowerCount(0)).toBe(0);
    expect(restored.mapTowerCount(1)).toBe(1);
    expect(restored.switchMap(1)).toBe(0);
    expect(restored.snapshot().towers[0].kind).toBe(3);
  });

  it("loads a version 2 save on the Switchyard", () => {
    const image = new Uint8Array(readFileSync(resolve(process.cwd(), "tests/fixtures/save-v2.bin")));
    const sim = Sim.fromBytes(wasm);
    expect(sim.loadBytes(image)).toBe(0);
    const snap = sim.snapshot();
    expect(snap.map).toBe(0);
    expect(snap.towerCount).toBe(1);
  });

  it("loads a version 4 save with the frontier cut", () => {
    const image = new Uint8Array(readFileSync(resolve(process.cwd(), "tests/fixtures/save-v4.bin")));
    const sim = Sim.fromBytes(wasm);
    expect(sim.loadBytes(image)).toBe(0);
    const snap = sim.snapshot();
    expect(snap.map).toBe(2);
    expect(sim.mapTowerCount(0)).toBe(1);
    expect(sim.mapTowerCount(1)).toBe(1);
    expect(sim.mapTowerCount(2)).toBe(1);
  });

  it("loads a version 3 save with both frontier districts", () => {
    const image = new Uint8Array(readFileSync(resolve(process.cwd(), "tests/fixtures/save-v3.bin")));
    const sim = Sim.fromBytes(wasm);
    expect(sim.loadBytes(image)).toBe(0);
    const snap = sim.snapshot();
    expect(snap.map).toBe(0);
    expect(snap.towerCount).toBe(1);
    expect(sim.mapTowerCount(1)).toBe(1);
    expect(sim.switchMap(1)).toBe(0);
    expect(sim.snapshot().towers[0].kind).toBe(1);
  });
});

describe("expeditions", () => {
  it("charges the fee and blocks a second contract", () => {
    const sim = fresh(31);
    expect(sim.expeditionContract(0, 0)).toBe(30);
    expect(sim.expeditionContract(1, 0)).toBe(45);
    expect(sim.expeditionContract(2, 0)).toBe(60);
    expect(sim.startExpedition(0)).toBe(0);
    expect(sim.expedition(0)).toBe(1);
    expect(sim.snapshot().brass).toBe(120);
    expect(sim.startExpedition(1)).toBe(-1);
  });

  it("refuses a contract during a live wave", () => {
    const sim = fresh(32);
    expect(sim.callWave()).toBe(0);
    expect(sim.startExpedition(0)).toBe(-1);
  });

  it("reports the permanent boon and discovery slots", () => {
    const sim = fresh(33);
    expect(sim.expeditionContract(0, 3)).toBe(0);
    expect(sim.expeditionContract(0, 4)).toBe(0);
    expect(sim.expedition(7)).toBe(0);
  });
});

describe("marsh and line", () => {
  it("moves habitat and pays for reeds", () => {
    const sim = fresh(41);
    const water = sim.eco(1);
    expect(sim.ecoAction(0)).toBe(0);
    expect(sim.eco(1)).toBeGreaterThan(water);
    expect(sim.eco(9)).toBe(5);
    const brass = sim.snapshot().brass;
    expect(sim.ecoAction(2)).toBeGreaterThan(0);
    expect(sim.snapshot().brass).toBeGreaterThan(brass);
    expect(sim.eco(9)).toBe(4);
  });

  it("runs the line, sends a convoy, and caps offline gain", () => {
    const sim = fresh(42);
    expect(sim.buildCity(0)).toBe(0);
    for (let i = 0; i < 140; i++) sim.step(33);
    expect(sim.autoToggle(0)).toBe(0);
    expect(sim.automation(5)).toBe(1);
    for (let i = 0; i < 140; i++) sim.step(33);
    expect(sim.automation(1)).toBeGreaterThanOrEqual(4);
    expect(sim.convoy()).toBe(0);
    for (let i = 0; i < 120; i++) sim.step(33);
    expect(sim.automation(2)).toBeGreaterThanOrEqual(4);
  });

  it("caps offline production at the stock on hand", () => {
    const sim = fresh(43);
    sim.autoToggle(0);
    expect(sim.offline(3600)).toBe(0);
  });
});

describe("community survey maps", () => {
  const sample = {
    schema: "brass-meridian.map/1",
    generator: 1,
    name: "Lantern Cut",
    author: "Switchyard Survey",
    license: "MIT",
    rubble: [
      [5, 2],
      [5, 3],
      [6, 2],
      [11, 9],
      [12, 9],
      [11, 10],
    ],
  };

  it("validates, imports, and restores a survey", () => {
    const check = validateMap(sample);
    expect(check.ok).toBe(true);
    expect(check.count).toBe(6);
    expect(check.binary?.length).toBe(19);
    const sim = fresh(51);
    expect(sim.importMap(check.binary!)).toBe(0);
    expect(sim.custom(0)).toBe(1);
    expect(sim.custom(1)).toBe(6);
    expect(sim.switchMap(1)).toBe(0);
    expect(sim.switchMap(2)).toBe(0);
    expect(sim.cellState(5, 2)).toBe(1);
    expect(sim.clearMap()).toBe(0);
    expect(sim.custom(0)).toBe(0);
  });

  it("refuses a sealed or malformed survey", () => {
    const sealed = validateMap({
      ...sample,
      rubble: Array.from({ length: 13 }, (_, gz) => [8, gz]),
    });
    expect(sealed.ok).toBe(false);
    expect(sealed.code).toBe("map-sealed");
    expect(parseMap("nope").code).toBe("map-json");
    expect(validateMap({ ...sample, generator: 2 }).code).toBe("map-generator");
    expect(validateMap({ ...sample, author: "" }).code).toBe("map-author");
  });
});
