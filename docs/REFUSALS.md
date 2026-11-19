# Refusals

A refusal is a named stop. Each one exists because something failed once or could fail silently.

The registry is `src/refusals.ts`. The gate fails when an id is missing here.

## `place-sealed`

A tower placement would leave no route from gate to core.

The core refuses the placement, keeps the brass, and redraws the old route. Tested in the core suite and the probe.

## `place-budget`

A placement keeps a route but pushes it past 40 steps.

This stops one wall from turning a wave into a long walk. The player sees "That detour is too long."

## `place-occupied`

The plot already holds a tower, or is rubble, the gate, or the core.

The core returns a specific code. The UI translates it. Brass is not spent.

## `save-rejected`

A save image has a bad magic, version, count, or cell bound.

The loader returns a negative code and leaves the live run untouched. The probe checks the round trip.

## `ui-maxed`

A maxed upgrade or a full core must not become enabled again.

The affordance refresh reads `data-maxed` first. A maxed button stays disabled.

## `prose-overflow`

A doc sentence is over 24 words, a paragraph is over 3 sentences, or a UI string is over 18 words.

The gate names the line. Fix the line, not the limit.

## `secret-in-repo`

A token pattern, private key, or root `.env` appears in the tree.

The gate fails and names the file. Keys belong in the owner's secret store.

## `snapshot-drift`

The Rust snapshot and the TypeScript reader disagree.

The gate checks the wasm length and the stride values. The client test pins the total. A layout change must update both sides.

## `test-weakened`

A failing check was made green by deleting an assertion, skipping a test, or catching the error.

This is a review refusal, not a runtime one. The gate keeps the receipts, so a missing result is visible.

## How to add one

1. Name the failure in `ledger/failures/`.
2. Add the smallest stop in code or in the gate.
3. Add the id to `src/refusals.ts`.
4. Document it here.
5. Prove it with a test or a probe.
