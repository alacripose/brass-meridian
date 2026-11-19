# Architecture

The Rust core owns the game. The browser draws it. That split is the main design rule.

## Why WASM

The battlefield is a deterministic simulation. Pathfinding, wave timing, damage, and economy run in one place.

The core has no dependencies and no browser access. It compiles to a 50 KB wasm module with `wasm32-unknown-unknown`.

A native test run exercises the same code with `cargo test`.

## Boundary

The core exposes a small C ABI.

| Export | Purpose |
| --- | --- |
| `sim_init(seed)` | Start a run. |
| `sim_step(ms)` | Advance, with internal 33 ms substeps. |
| `sim_place`, `sim_upgrade`, `sim_sell` | Tower commands. |
| `sim_city`, `sim_repair`, `sim_call_wave` | City and wave commands. |
| `sim_snapshot_ptr`, `sim_snapshot_len` | Read the render snapshot. |
| `sim_save_ptr`, `sim_save_len`, `sim_load` | Byte image save and load. |
| `sim_tower_info`, `sim_enemy_info`, `sim_preview_count` | Read-only UI facts. |

Commands return an integer code. Placement codes are named in `src/sim.ts` and `src/refusals.ts`.

## Snapshot

The snapshot is a flat `f32` buffer. It is 8,480 floats, about 34 KB.

| Range | Content |
| ---: | --- |
| 0–31 | Header: resources, wave, phase, counts, rates, route. |
| 32–1,567 | 96 towers, stride 16. |
| 1,568–5,407 | 320 enemies, stride 12. |
| 5,408–7,327 | 192 projectiles, stride 10. |
| 7,328–8,351 | 128 effects, stride 8. |
| 8,352–8,479 | Up to 64 route points. |

The header carries the tower, enemy, projectile, and effect counts. The renderer reads only those counts.

The TypeScript constants mirror the Rust constants. The gate confirms the wasm length and the stride values. The client test pins the total.

## Determinism

The core uses a 32 bit xorshift random source. The seed is part of the save.

The same seed and the same command order produce the same save bytes. The probe checks this directly.

Time is passed in from the browser. The core clamps one call to one second and splits it into 33 ms ticks.

## Save

The save starts with `BMG1` and a format byte. It stores the seed, economy, wave state, city levels, towers, enemies, projectiles, effects, and the spawn queue.

Loading validates the magic, version, counts, and cell bounds. A bad image returns a negative code and leaves the current run alone.

The browser stores the image as base64 in localStorage under `brass-meridian.save.v2`. Autosave runs every ten seconds and when the tab hides.

## Renderer

`src/view.ts` builds a low-poly diorama with primitives. No model files are loaded.

Towers are rebuilt only when their id, kind, or level changes. Enemies use a pool that grows as needed. Effects share one line buffer.

The camera is orthographic. Drag pans in world space. Pinch and wheel change zoom.

A tap raycasts a ground plane and rounds to a cell.

## UI

`src/ui.ts` is plain DOM. It has no framework and no state of its own beyond the open sheet.

All player-facing text is in `src/copy.ts`. That makes the prose checker meaningful.

The HUD updates from a snapshot each frame. The sheet re-renders when a command changes the facts.

## Failure modes

- Snapshot drift: the gate and client test fail.
- Sealed route: placement returns `place-sealed`.
- Over-budget route: placement returns `place-budget`.
- Corrupt save: `save-rejected`, current run kept.
- Maxed button: the refresh respects `data-maxed`.
- Prose drift: the gate fails with the line.
- Secret in the tree: the gate fails with the path.

## Performance notes

The scene keeps under 400 drawable objects in normal play. Tower meshes are cached. Enemy bodies are pooled.

The wasm step is cheap. The render loop is the cost. Shadows use one 1024 map and a tight camera.

The build is one JavaScript chunk of about 630 KB, or 162 KB gzipped. It is not split yet.

## Verification

- `cargo test` covers the core.
- `npm test` loads the real wasm and checks the bridge.
- `npm run probe` checks routes, waves, income, determinism, and saves.
- `npm run gate` checks prose, ledgers, tickets, progress, ABI, receipts, and secrets.
