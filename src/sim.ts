// Typed bridge to the Rust core. The core owns state; this file only reads
// snapshots and forwards commands. Keep the stride constants in step with
// core/src/lib.rs -- the probe test fails when they drift.

export const GRID_W = 17;
export const GRID_H = 13;
export const CELL = 2;
export const MAX_PATH = 40;

export const H = {
  version: 0,
  brass: 1,
  ingots: 2,
  core: 3,
  coreMax: 4,
  wave: 5,
  phase: 6,
  enemiesAlive: 7,
  spawnLeft: 8,
  countdown: 9,
  simMs: 10,
  score: 11,
  kills: 12,
  towers: 13,
  enemies: 14,
  projectiles: 15,
  fx: 16,
  foundry: 17,
  kiln: 18,
  workshop: 19,
  depot: 20,
  brassRate: 21,
  ingotRate: 22,
  waveTotal: 23,
  boss: 24,
  pathSteps: 25,
  canCall: 26,
  repairCost: 27,
  cityMax: 28,
  map: 29,
  raid: 30,
  pathCount: 31,
} as const;

export const TOWER_BASE = 32;
export const TOWER_STRIDE = 16;
export const ENEMY_BASE = TOWER_BASE + 96 * TOWER_STRIDE;
export const ENEMY_STRIDE = 12;
export const PROJ_BASE = ENEMY_BASE + 320 * ENEMY_STRIDE;
export const PROJ_STRIDE = 10;
export const FX_BASE = PROJ_BASE + 192 * PROJ_STRIDE;
export const FX_STRIDE = 8;
export const PATH_BASE = FX_BASE + 128 * FX_STRIDE;
export const SNAPSHOT_FLOATS = PATH_BASE + 64 * 2;

export const PLACE = {
  ok: 0,
  outside: -1,
  occupied: -2,
  terrain: -3,
  reserved: -4,
  sealed: -5,
  budget: -6,
  brass: -7,
  limit: -8,
  kind: -9,
} as const;

type Exports = {
  memory: WebAssembly.Memory;
  sim_version(): number;
  sim_init(seed: number): void;
  sim_init64(lo: number, hi: number): void;
  sim_seed_lo(): number;
  sim_seed_hi(): number;
  sim_step(ms: number): void;
  sim_place(gx: number, gz: number, kind: number): number;
  sim_can_place(gx: number, gz: number, kind: number): number;
  sim_upgrade(index: number): number;
  sim_sell(index: number): number;
  sim_city(kind: number): number;
  sim_repair(): number;
  sim_call_wave(): number;
  sim_switch_map(map: number): number;
  sim_map_tower_count(map: number): number;
  sim_track_cost(from: number, to: number): number;
  sim_snapshot_len(): number;
  sim_snapshot_ptr(): number;
  sim_cell_state(gx: number, gz: number): number;
  sim_tower_at(gx: number, gz: number): number;
  sim_tower_cost(kind: number): number;
  sim_tower_info(index: number, field: number): number;
  sim_sell_value(index: number): number;
  sim_city_cost(kind: number, level: number, ingots: number): number;
  sim_repair_cost_value(): number;
  sim_enemy_info(kind: number, field: number): number;
  sim_preview_count(kind: number): number;
  sim_save_len(): number;
  sim_save_ptr(): number;
  sim_load(ptr: number, len: number): number;
  sim_path_steps(): number;
  sim_expedition(field: number): number;
  sim_expedition_start(contract: number): number;
  sim_expedition_contract(contract: number, field: number): number;
  sim_eco(field: number): number;
  sim_eco_action(kind: number): number;
  sim_automation(field: number): number;
  sim_automation_toggle(kind: number): number;
  sim_convoy(): number;
  sim_offline(seconds: number): number;
  sim_import_map(ptr: number, len: number): number;
  sim_clear_map(): number;
  sim_custom(field: number): number;
  sim_wave_curve(wave: number, field: number): number;
};

export type TowerView = {
  index: number;
  x: number;
  z: number;
  kind: number;
  level: number;
  cooldown: number;
  range: number;
  damage: number;
  rate: number;
  angle: number;
  id: number;
  spent: number;
  gx: number;
  gz: number;
};

export type EnemyView = {
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  kind: number;
  flying: boolean;
  boss: boolean;
  slow: number;
  progress: number;
  angle: number;
  id: number;
};

export type ProjectileView = {
  x: number;
  z: number;
  sx: number;
  sz: number;
  tx: number;
  tz: number;
  ttl: number;
  total: number;
  kind: number;
};

export type FxView = {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  ttl: number;
  total: number;
  kind: number;
  width: number;
};

export type Snapshot = {
  version: number;
  brass: number;
  ingots: number;
  core: number;
  coreMax: number;
  wave: number;
  phase: number;
  enemiesAlive: number;
  spawnLeft: number;
  countdown: number;
  simMs: number;
  score: number;
  kills: number;
  towerCount: number;
  enemyCount: number;
  projectileCount: number;
  fxCount: number;
  city: [number, number, number, number];
  brassRate: number;
  ingotRate: number;
  waveTotal: number;
  boss: boolean;
  pathSteps: number;
  canCall: boolean;
  repairCost: number;
  cityMax: number;
  map: number;
  threatDistrict: number;
  path: Array<[number, number]>;
  towers: TowerView[];
  enemies: EnemyView[];
  projectiles: ProjectileView[];
  fx: FxView[];
};

export class Sim {
  private readonly ex: Exports;

  private constructor(ex: Exports) {
    this.ex = ex;
  }

  static async load(base = import.meta.env.BASE_URL): Promise<Sim> {
    const url = `${base}brass_core.wasm`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`WASM fetch failed: ${response.status} ${url}`);
    return Sim.fromBytes(await response.arrayBuffer());
  }

  static fromBytes(bytes: ArrayBuffer | Uint8Array): Sim {
    const buffer = bytes instanceof Uint8Array ? (bytes.slice().buffer as ArrayBuffer) : bytes;
    const module = new WebAssembly.Module(buffer);
    const instance = new WebAssembly.Instance(module, {});
    return new Sim(instance.exports as unknown as Exports);
  }

  init(seed: number | bigint): void {
    if (typeof seed === "bigint") {
      const value = BigInt.asUintN(64, seed);
      this.ex.sim_init64(Number(value & 0xffffffffn), Number(value >> 32n));
      return;
    }
    this.ex.sim_init(seed >>> 0);
  }

  seedLo(): number {
    return this.ex.sim_seed_lo() >>> 0;
  }

  seedHi(): number {
    return this.ex.sim_seed_hi() >>> 0;
  }

  step(ms: number): void {
    this.ex.sim_step(Math.max(0, Math.min(250, Math.round(ms))));
  }

  place(gx: number, gz: number, kind: number): number {
    return this.ex.sim_place(gx, gz, kind);
  }

  canPlace(gx: number, gz: number, kind: number): number {
    return this.ex.sim_can_place(gx, gz, kind);
  }

  upgrade(index: number): number {
    return this.ex.sim_upgrade(index);
  }

  sell(index: number): number {
    return this.ex.sim_sell(index);
  }

  buildCity(kind: number): number {
    return this.ex.sim_city(kind);
  }

  repair(): number {
    return this.ex.sim_repair();
  }

  callWave(): number {
    return this.ex.sim_call_wave();
  }

  switchMap(map: number): number {
    return this.ex.sim_switch_map(map);
  }

  mapTowerCount(map: number): number {
    return this.ex.sim_map_tower_count(map);
  }

  trackCost(from: number, to: number): number {
    return this.ex.sim_track_cost(from, to);
  }

  cellState(gx: number, gz: number): number {
    return this.ex.sim_cell_state(gx, gz);
  }

  towerAt(gx: number, gz: number): number {
    return this.ex.sim_tower_at(gx, gz);
  }

  towerCost(kind: number): number {
    return this.ex.sim_tower_cost(kind);
  }

  towerInfo(index: number, field: number): number {
    return this.ex.sim_tower_info(index, field);
  }

  sellValue(index: number): number {
    return this.ex.sim_sell_value(index);
  }

  cityCost(kind: number, level: number, ingots = 0): number {
    return this.ex.sim_city_cost(kind, level, ingots);
  }

  repairCost(): number {
    return this.ex.sim_repair_cost_value();
  }

  enemyInfo(kind: number, field: number): number {
    return this.ex.sim_enemy_info(kind, field);
  }

  previewCount(kind: number): number {
    return this.ex.sim_preview_count(kind);
  }

  pathSteps(): number {
    return this.ex.sim_path_steps();
  }

  expedition(field: number): number {
    return this.ex.sim_expedition(field);
  }

  startExpedition(contract: number): number {
    return this.ex.sim_expedition_start(contract);
  }

  expeditionContract(contract: number, field: number): number {
    return this.ex.sim_expedition_contract(contract, field);
  }

  eco(field: number): number {
    return this.ex.sim_eco(field);
  }

  ecoAction(kind: number): number {
    return this.ex.sim_eco_action(kind);
  }

  automation(field: number): number {
    return this.ex.sim_automation(field);
  }

  autoToggle(kind: number): number {
    return this.ex.sim_automation_toggle(kind);
  }

  convoy(): number {
    return this.ex.sim_convoy();
  }

  offline(seconds: number): number {
    return this.ex.sim_offline(Math.max(0, Math.min(14_400, Math.floor(seconds))));
  }

  importMap(bytes: Uint8Array): number {
    if (bytes.length > 1024) return -1;
    const ptr = this.ex.sim_snapshot_ptr();
    new Uint8Array(this.ex.memory.buffer).set(bytes, ptr);
    return this.ex.sim_import_map(ptr, bytes.length);
  }

  clearMap(): number {
    return this.ex.sim_clear_map();
  }

  custom(field: number): number {
    return this.ex.sim_custom(field);
  }

  waveCurve(wave: number, field: number): number {
    return this.ex.sim_wave_curve(wave, field);
  }

  snapshot(): Snapshot {
    const ptr = this.ex.sim_snapshot_ptr();
    const len = this.ex.sim_snapshot_len();
    if (len < SNAPSHOT_FLOATS) throw new Error("snapshot length drifted");
    const f = new Float32Array(this.ex.memory.buffer, ptr, len);
    const towerCount = f[H.towers];
    const enemyCount = f[H.enemies];
    const projectileCount = f[H.projectiles];
    const fxCount = f[H.fx];
    const pathCount = f[H.pathCount];

    const towers: TowerView[] = [];
    for (let i = 0; i < towerCount; i++) {
      const b = TOWER_BASE + i * TOWER_STRIDE;
      towers.push({
        index: i,
        x: f[b],
        z: f[b + 1],
        kind: f[b + 2],
        level: f[b + 3],
        cooldown: f[b + 4],
        range: f[b + 5],
        damage: f[b + 6],
        rate: f[b + 7],
        angle: f[b + 8],
        id: f[b + 9],
        spent: f[b + 10],
        gx: f[b + 11],
        gz: f[b + 12],
      });
    }
    const enemies: EnemyView[] = [];
    for (let i = 0; i < enemyCount; i++) {
      const b = ENEMY_BASE + i * ENEMY_STRIDE;
      const flags = f[b + 5];
      enemies.push({
        x: f[b],
        z: f[b + 1],
        hp: f[b + 2],
        maxHp: f[b + 3],
        kind: f[b + 4],
        flying: (flags & 1) !== 0,
        boss: (flags & 2) !== 0,
        slow: f[b + 6],
        progress: f[b + 7],
        angle: f[b + 8],
        id: f[b + 9],
      });
    }
    const projectiles: ProjectileView[] = [];
    for (let i = 0; i < projectileCount; i++) {
      const b = PROJ_BASE + i * PROJ_STRIDE;
      projectiles.push({
        x: f[b],
        z: f[b + 1],
        sx: f[b + 2],
        sz: f[b + 3],
        tx: f[b + 4],
        tz: f[b + 5],
        ttl: f[b + 6],
        total: f[b + 7],
        kind: f[b + 8],
      });
    }
    const fx: FxView[] = [];
    for (let i = 0; i < fxCount; i++) {
      const b = FX_BASE + i * FX_STRIDE;
      fx.push({
        x1: f[b],
        z1: f[b + 1],
        x2: f[b + 2],
        z2: f[b + 3],
        ttl: f[b + 4],
        total: f[b + 5],
        kind: f[b + 6],
        width: f[b + 7],
      });
    }
    const path: Array<[number, number]> = [];
    for (let i = 0; i < pathCount; i++) {
      const b = PATH_BASE + i * 2;
      path.push([f[b], f[b + 1]]);
    }
    return {
      version: f[H.version],
      brass: f[H.brass],
      ingots: f[H.ingots],
      core: f[H.core],
      coreMax: f[H.coreMax],
      wave: f[H.wave],
      phase: f[H.phase],
      enemiesAlive: f[H.enemiesAlive],
      spawnLeft: f[H.spawnLeft],
      countdown: f[H.countdown],
      simMs: f[H.simMs],
      score: f[H.score],
      kills: f[H.kills],
      towerCount,
      enemyCount,
      projectileCount,
      fxCount,
      city: [f[H.foundry], f[H.kiln], f[H.workshop], f[H.depot]],
      brassRate: f[H.brassRate],
      ingotRate: f[H.ingotRate],
      waveTotal: f[H.waveTotal],
      boss: f[H.boss] === 1,
      pathSteps: f[H.pathSteps],
      canCall: f[H.canCall] === 1,
      repairCost: f[H.repairCost],
      cityMax: f[H.cityMax],
      map: f[H.map],
      threatDistrict: f[H.raid],
      path,
      towers,
      enemies,
      projectiles,
      fx,
    };
  }

  saveBytes(): Uint8Array {
    const len = this.ex.sim_save_len();
    const ptr = this.ex.sim_save_ptr();
    return new Uint8Array(this.ex.memory.buffer, ptr, len).slice();
  }

  loadBytes(bytes: Uint8Array): number {
    if (bytes.length > SNAPSHOT_FLOATS * 4) return -3;
    const ptr = this.ex.sim_snapshot_ptr();
    const view = new Uint8Array(this.ex.memory.buffer);
    view.set(bytes, ptr);
    return this.ex.sim_load(ptr, bytes.length);
  }
}

export function placeError(code: number): string {
  switch (code) {
    case PLACE.occupied:
      return "That plot is taken.";
    case PLACE.terrain:
      return "Rubble blocks that plot.";
    case PLACE.reserved:
      return "The gate and core are fixed.";
    case PLACE.sealed:
      return "That would seal the route.";
    case PLACE.budget:
      return "That detour is too long.";
    case PLACE.brass:
      return "Not enough brass.";
    case PLACE.limit:
      return "Tower limit reached.";
    default:
      return "That plot is not buildable.";
  }
}
