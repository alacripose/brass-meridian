// Community survey maps are data, not code. The schema is checked before the
// core sees a byte, and the core checks connectivity again on its own grid.
// Refusals are named so the gate can require an explanation for each one.

import { GRID_H, GRID_W } from "./sim";

export const MAP_SCHEMA = "brass-meridian.map/1";
export const MAP_GENERATOR = 1;
export const MAP_BUDGET = 24;
export const MAP_MIN_CELLS = 4;
const KEY = "brass-meridian.map.v1";

export type CommunityMap = {
  schema: string;
  generator: number;
  name: string;
  author: string;
  license: string;
  seed?: number;
  rubble: Array<[number, number]>;
};

export type MapMeta = {
  name: string;
  author: string;
  generator: number;
  importedAt: string;
  count: number;
};

export type MapCheck = {
  ok: boolean;
  code: string;
  message: string;
  binary?: Uint8Array;
  map?: CommunityMap;
  count: number;
};

const refuse = (code: string, message: string, count = 0): MapCheck => ({
  ok: false,
  code,
  message,
  count,
});

function connected(rubble: Set<number>): boolean {
  const start = 6 * GRID_W + 16;
  const goal = 6 * GRID_W;
  const seen = new Uint8Array(GRID_W * GRID_H);
  const queue = [start];
  seen[start] = 1;
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head];
    const gx = at % GRID_W;
    const gz = Math.floor(at / GRID_W);
    const steps = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dz] of steps) {
      const nx = gx + dx;
      const nz = gz + dz;
      if (nx < 0 || nz < 0 || nx >= GRID_W || nz >= GRID_H) continue;
      const ni = nz * GRID_W + nx;
      if (seen[ni] || rubble.has(ni)) continue;
      seen[ni] = 1;
      queue.push(ni);
    }
  }
  return seen[goal] === 1;
}

export function validateMap(input: unknown): MapCheck {
  if (!input || typeof input !== "object") {
    return refuse("map-schema", "That is not a survey file.");
  }
  const value = input as Record<string, unknown>;
  if (value.schema !== MAP_SCHEMA) {
    return refuse("map-schema", "Unknown survey schema.");
  }
  if (value.generator !== MAP_GENERATOR) {
    return refuse("map-generator", "That generator version is not supported.");
  }
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const author = typeof value.author === "string" ? value.author.trim() : "";
  if (name.length < 1 || name.length > 40) {
    return refuse("map-name", "Name must be one to forty characters.");
  }
  if (author.length < 1 || author.length > 40) {
    return refuse("map-author", "Author must be one to forty characters.");
  }
  if (value.license !== "MIT") {
    return refuse("map-license", "Only MIT survey files are accepted.");
  }
  if (value.seed !== undefined && (!Number.isInteger(value.seed) || (value.seed as number) < 0)) {
    return refuse("map-seed", "Seed must be a whole number.");
  }
  if (!Array.isArray(value.rubble)) {
    return refuse("map-cells", "Rubble must be a list of plots.");
  }
  if (value.rubble.length < MAP_MIN_CELLS || value.rubble.length > MAP_BUDGET) {
    return refuse("map-budget", `Use ${MAP_MIN_CELLS} to ${MAP_BUDGET} rubble plots.`, value.rubble.length);
  }
  const rubble = new Set<number>();
  const cells: Array<[number, number]> = [];
  for (const cell of value.rubble) {
    if (!Array.isArray(cell) || cell.length !== 2) {
      return refuse("map-cells", "Each rubble plot needs two whole numbers.");
    }
    const [gx, gz] = cell;
    if (!Number.isInteger(gx) || !Number.isInteger(gz)) {
      return refuse("map-cells", "Each rubble plot needs two whole numbers.");
    }
    if (gx < 0 || gz < 0 || gx >= GRID_W || gz >= GRID_H) {
      return refuse("map-cells", "Rubble sits outside the field.");
    }
    if ((gx === 16 && gz === 6) || (gx === 0 && gz === 6)) {
      return refuse("map-cells", "The gate and core stay clear.");
    }
    const at = gz * GRID_W + gx;
    if (rubble.has(at)) {
      return refuse("map-cells", "Two rubble plots share a cell.");
    }
    rubble.add(at);
    cells.push([gx, gz]);
  }
  if (!connected(rubble)) {
    return refuse("map-sealed", "Rubble seals the route to the core.", cells.length);
  }
  const binary = new Uint8Array(7 + cells.length * 2);
  binary.set([0x42, 0x4d, 0x4d, 0x50, 1, MAP_GENERATOR, cells.length]);
  cells.forEach(([gx, gz], i) => {
    binary[7 + i * 2] = gx;
    binary[8 + i * 2] = gz;
  });
  return {
    ok: true,
    code: "map-ok",
    message: `${name} by ${author}: ${cells.length} plots.`,
    binary,
    map: {
      schema: MAP_SCHEMA,
      generator: MAP_GENERATOR,
      name,
      author,
      license: "MIT",
      seed: typeof value.seed === "number" ? value.seed : undefined,
      rubble: cells,
    },
    count: cells.length,
  };
}

export function parseMap(text: string): MapCheck {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return refuse("map-json", "That survey file is not valid JSON.");
  }
  return validateMap(value);
}

export function exampleMap(): string {
  return JSON.stringify(
    {
      schema: MAP_SCHEMA,
      generator: MAP_GENERATOR,
      name: "Lantern Cut",
      author: "Switchyard Survey",
      license: "MIT",
      seed: 14,
      rubble: [
        [5, 2],
        [5, 3],
        [6, 2],
        [11, 9],
        [12, 9],
        [11, 10],
      ],
    },
    null,
    2,
  );
}

export function saveMapMeta(map: CommunityMap): void {
  try {
    const meta: MapMeta = {
      name: map.name,
      author: map.author,
      generator: map.generator,
      importedAt: new Date().toISOString(),
      count: map.rubble.length,
    };
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    // A blocked storage area does not block play.
  }
}

export function loadMapMeta(): MapMeta | null {
  try {
    const text = localStorage.getItem(KEY);
    if (!text) return null;
    return JSON.parse(text) as MapMeta;
  } catch {
    return null;
  }
}

export function clearMapMeta(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
