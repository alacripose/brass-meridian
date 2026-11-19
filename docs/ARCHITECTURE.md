# Architecture

The Rust core owns the game. The browser draws it. That split is the main design rule.

## Why WASM

The battlefield is a deterministic simulation. Pathfinding, wave timing, damage, and economy run in one place.

The core has no dependencies and no browser access. It compiles to a wasm module of about 65 KB with `wasm32-unknown-unknown`.

A native test run exercises the same code with `cargo test`.

## Boundary

The core exposes a small C ABI.

| Export | Purpose |
| --- | --- |
| `sim_init(seed)`, `sim_init64(lo, hi)` | Start a run from a 32 or 64 bit seed. |
| `sim_seed_lo`, `sim_seed_hi` | Read the stored 64 bit seed. |
| `sim_sub_seed_lo`, `sim_sub_seed_hi` | Read one named stream seed. |
| `sim_clock` | Read world milliseconds, day, hour, or minute. |
| `sim_step(ms)` | Advance, with internal 33 ms substeps. |
| `sim_place`, `sim_upgrade`, `sim_sell` | Tower commands. |
| `sim_city`, `sim_repair`, `sim_call_wave` | City and wave commands. |
| `sim_switch_map`, `sim_map_tower_count`, `sim_track_cost` | Face travel and track facts. |
| `sim_world_travel`, `sim_world_step`, `sim_world_field` | Face seat, bounded step, and world facts. |
| `sim_world_region_count`, `sim_world_region` | Deterministic streamed region ids. |
| `sim_world_point`, `sim_world_km`, `sim_world_cell_km` | Unit cube-sphere point and real bound. |
| `sim_chunk_count`, `sim_chunk`, `sim_chunk_current` | Resident chunk facts and the seat chunk. |
| `sim_chunk_lod`, `sim_chunk_height`, `sim_chunk_id_lo`, `sim_chunk_id_hi` | LOD, height and stable chunk identity. |
| `sim_expedition`, `sim_expedition_start`, `sim_expedition_contract` | Contract state, launch, fee, pay, and relics. |
| `sim_eco`, `sim_eco_action` | Marsh state and one habitat action. |
| `sim_automation`, `sim_automation_toggle`, `sim_convoy`, `sim_offline` | Shell line, rule, convoy, and catch-up. |
| `sim_import_map`, `sim_clear_map`, `sim_custom` | Survey validation and rollback. |
| `sim_wave_curve` | Read the endless pressure curve. |
| `sim_snapshot_ptr`, `sim_snapshot_len` | Read the render snapshot. |
| `sim_save_ptr`, `sim_save_len`, `sim_load` | Byte image save and load. |
| `sim_tower_info`, `sim_enemy_info`, `sim_preview_count` | Read-only UI facts. |

Commands return an integer code. Placement codes are named in `src/sim.ts` and `src/refusals.ts`.

## Snapshot

The snapshot is a flat `f32` buffer. It is 8,494 floats, about 34 KB.

| Range | Content |
| ---: | --- |
| 0–45 | Header: resources, wave, phase, counts, route, world, season and chunks. |
| 46–1,581 | 96 towers, stride 16. |
| 1,582–5,421 | 320 enemies, stride 12. |
| 5,422–7,341 | 192 projectiles, stride 10. |
| 7,342–8,365 | 128 effects, stride 8. |
| 8,366–8,493 | Up to 64 route points. |

The header carries the tower, enemy, projectile, and effect counts. The renderer reads only those counts.

Header slot 29 holds the active face id. Header slot 30 holds the raid face id. Slots 32–40 hold the face seat, region, stream epoch, season and bound.

Slots 41–45 hold the current LOD, resident count, seat chunk and chunk epoch.

The raid is the face the next wave targets. The client counts live enemies from the enemy count and spawn-left header slots; it does not store a second count.

Travel uses `sim_switch_map`. A return of `-2` means a wave is live, `-3` means no track, and `-4` means not enough brass. Travel resets the seat to that face centre.

The track graph is a cube net. Neighbour edges cost 14 to 22 brass, and far hops have no edge (`sim_track_cost` returns `-1`).

The world has six 32 by 32 faces at 1:8 scale. The engine bound is 5,009.375 km against a 40,075 km real planet. A seat steps one cell at a time and crosses a face seam by projecting the point across the cube edge.

Regions are 4 by 4 cells. The stream is the 3 by 3 block around the seat plus seam-neighbour regions. Ids are deduped, sorted, and hashed into a stream epoch.

Chunks are 32 tiles on a side. A cell is four tiles, so a chunk is 8 by 8 cells and a face holds sixteen chunks. Chunk ids hash the terrain sub-seed with the face and chunk coordinate.

LOD levels are Near, Mid and Far, chosen by chunk ring. Ring 0 is Near, ring 1 is Mid, and ring 2 or more is Far. Every chunk carries four skirt bits, so a level change never opens an edge.

Expedition state lives in `sim_expedition`: active, contract, leg, result, three relic counts, discoveries, and spawn left.

Ecology uses `sim_eco` with soil, water, cover, six species, cause, cause age, and harvests.

Automation uses `sim_automation` with state, buffer, shells, convoy, rule, log, and produced.

Survey state uses `sim_custom`: ready flag and cell count. The core repeats the route check with no towers.

The TypeScript constants mirror the Rust constants. The gate confirms the wasm length and the stride values. The client test pins the total.

## Determinism

The core stores a 64 bit seed. Six named streams derive from it: terrain, sites, waves, ecology, expeditions and surveys.

The wave stream feeds combat threat and the xorshift source. The ecology stream varies the marsh start.

The same seed and the same command order produce the same save bytes. The probe checks this directly.

Time is passed in from the browser. The core clamps one call to one second and splits it into 33 ms ticks.

## Clock

One real second is eight world seconds. The clock stops on defeat and resumes from the save.

A world day is 24 hours. The HUD shows the day, minute, and season from the live clock.

Four seasons split the day into equal blocks. Each season shifts spawn composition, enemy stats, and ecology drift. The visible tint follows the same index.

## Save

The save starts with `BMG1` and format byte 8. It stores the 64 bit seed, economy, wave state, city levels, and six tower lists.

It also keeps the raid district, wave bonus, enemies, projectiles, effects, spawn queue, and the shell count.

Format 5 appends expedition state, the marsh, the shell line, and a 4 by 64 bit survey mask. Format 6 widens the seed from 32 to 64 bits. Format 7 appends the world clock as a little-endian f64.

Format 8 appends the face, seat, and stream epoch, and widens the tower lists to six. Format 9 appends the chunk epoch after the stream epoch.

Formats 2 through 7 still load. Older saves open at the Switchyard centre with an empty survey, a balanced marsh and a stopped line. Their raid derives from the seed and wave.

The probe loads `tests/fixtures/save-v4.bin`, a real image from the 0.3 wasm.

Loading validates the magic, version, counts, and cell bounds. A bad image returns a negative code and leaves the current run alone.

The browser stores the image as base64 in localStorage under `brass-meridian.save.v2`. A second key stores the last save time for offline catch-up.

Autosave runs every ten seconds and when the tab hides. The offline call caps at four hours and at the stock on hand.

## Renderer

`src/view.ts` builds a low-poly diorama with primitives. No model files are loaded.

Towers are rebuilt only when their id, kind, or level changes. Enemies use a pool that grows as needed. Effects share one line buffer.

The camera is orthographic. Drag pans in world space. Pinch and wheel change zoom.

A tap raycasts a ground plane and rounds to a cell.

## UI

`src/ui.ts` is plain DOM. It has no framework and no state of its own beyond the open sheet. The dock holds Build, City, Map, and Intel.

The City sheet holds works, the marsh card, and the shell line card. The Map sheet holds districts, contracts, and the survey importer.

`src/map.ts` validates survey JSON before the core sees a byte. It checks schema, generator, author, license, cell count, bounds, and route.

All player-facing text is in `src/copy.ts`. That makes the prose checker meaningful.

The HUD updates from a snapshot each frame. The sheet re-renders when a command changes the facts.

## Failure modes

- Snapshot drift: the gate and client test fail.
- Sealed route: placement returns `place-sealed`.
- Over-budget route: placement returns `place-budget`.
- Corrupt save: `save-rejected`, current run kept.
- Sealed survey: `map-sealed`, current field kept.
- Over-budget survey: `map-budget`, current field kept.
- Contract during a wave: `contract-busy`, fee not charged.
- Empty convoy: `line-empty`, shells kept.
- Full buffer or starved stock: `line-blocked`, state named.
- Offline past four hours: `offline-capped`, stock preserved.
- Maxed button: the refresh respects `data-maxed`.
- Prose drift: the gate fails with the line.
- Secret in the tree: the gate fails with the path.

## Performance notes

The scene keeps under 400 drawable objects in normal play. Tower meshes are cached. Enemy bodies are pooled.

The wasm step is cheap. The render loop is the cost. Shadows use one 1024 map and a tight camera.

The build is one JavaScript chunk of about 648 KB, or 167 KB gzipped. It is not split yet.

## Verification

- `cargo test` covers the core with 35 tests.
- `npm test` loads the real wasm and runs 33 bridge tests.
- `npm run probe` runs 123 checks for routes, waves, contracts, marsh, line, survey, seeds, clock, seasons, seam walking, chunks, LOD, determinism, and saves.
- `npm run gate` checks prose, ledgers, tickets, progress, ABI, receipts, and secrets.
