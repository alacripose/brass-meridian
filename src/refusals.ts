// Named refusals. Each one came from a real failure or a real exploit.
// Adding an id here without documenting it in docs/REFUSALS.md fails the gate.

export const REFUSALS = {
  sealed: "place-sealed",
  budget: "place-budget",
  occupied: "place-occupied",
  save: "save-rejected",
  maxed: "ui-maxed",
  prose: "prose-overflow",
  secret: "secret-in-repo",
  snapshot: "snapshot-drift",
  weaken: "test-weakened",
  mapSealed: "map-sealed",
  mapBudget: "map-budget",
  mapAuthor: "map-author",
  mapGenerator: "map-generator",
  mapJson: "map-json",
  contractBusy: "contract-busy",
  contractFee: "contract-fee",
  lineEmpty: "line-empty",
  lineBlocked: "line-blocked",
  offlineCap: "offline-capped",
} as const;

export type RefusalId = (typeof REFUSALS)[keyof typeof REFUSALS];
