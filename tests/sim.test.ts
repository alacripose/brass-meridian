import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
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
});
