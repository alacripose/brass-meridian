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
} as const;

export type RefusalId = (typeof REFUSALS)[keyof typeof REFUSALS];
