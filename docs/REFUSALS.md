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

## `map-sealed`

A survey map leaves no route from the gate to the core.

The client says the route is sealed. The core repeats the check with no towers.

## `map-budget`

A survey has fewer than four or more than twenty-four rubble plots.

The budget keeps one file from turning the field into a wall.

## `map-author`

A survey is missing an author, a name, or an MIT license.

Provenance is part of the file. Anonymous files are refused.

## `map-generator`

A survey names a generator version this build does not support.

The version is checked before any cell is read.

## `map-json`

The pasted survey is not valid JSON.

The client refuses it and keeps the current field. No state changes.

## `contract-busy`

A contract is requested during a live wave or during another contract.

The button disables. The core returns a negative code if the UI is stale.

## `contract-fee`

The player cannot pay the contract fee.

The fee is charged before the first leg. A failed launch keeps the brass.

## `line-empty`

A convoy is requested with an empty buffer.

The line keeps state and logs nothing. The button stays disabled.

## `line-blocked`

The line buffer is full, the stock is empty, or a convoy is already out.

The line names the fault. It does not discard ingots or shells.

## `offline-capped`

Offline catch-up is requested for more than four hours.

Production stops at 1,200 cycles and at the stock on hand.

## `legacy-scope`

A status line quotes the retired inventory as 6.0 completion.

The figure measured the old field, three districts and 120 waves. The gate now requires the 6.0 label and a measured count.

## `save-f64-order`

A loader reads an f64 high word before the low word. Format 7 reads little-endian and the clock round-trip test refuses drift.

## `sub-seed-fnv`

A named sub-seed uses a mistyped FNV prime. The pinned vector test refuses the wrong stream.

## `signed-wasm-probe`

A probe compares a wasm u32 as a signed JS number. Mask with `>>> 0` before the compare.

## `delivery-scan`

A tracked file carries a secret, key, env file, or machine-local path.

`npm run scan` refuses the push and names the file, never the value. The same scan runs in CI before the gate.

## `seed-width`

A save or ABI path stores fewer than 64 bits of the master seed.

Format 6 and the wasm probe refuse it. The seed is the world identity, not a cosmetic number.

## `season-real-ms`

A season test treats world milliseconds as real milliseconds.

The clock runs at 1:8. Divide by eight before crossing a season edge.

## `stream-epoch-load`

A load recomputes a stream and bumps the saved epoch.

Restore the saved epoch after the stream settles. A reload is not a move.

## `idle-clock-stop`

A probe expects the clock to run while the core is defeated.

The clock stops on defeat. Patch world time in a fixture instead of idling.

## `release-unverified`

A tag is pushed without a green CI run on the same commit.

The tag waits. The release workflow reruns the full chain before it uploads an asset.

## How to add one

1. Name the failure in `ledger/failures/`.
2. Add the smallest stop in code or in the gate.
3. Add the id to `src/refusals.ts`.
4. Document it here.
5. Prove it with a test or a probe.
