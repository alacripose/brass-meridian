# Roadmap

The 6.0 interview changes the world model, not only the content count. This page replaces the 0.4 plan.

The measured 6.0 inventory is 5.2%. It counts 63 existing capabilities against 1,213 required ones.

## Status

The 0.4 vertical slice is built and CI is green. The `v0.4.0` tag and release receipt are still owed.

The inventory is `state/scope.json`. The reconciliation is `docs/RECONCILIATION.md`.

## What changed

| Area | 0.4 plan | 6.0 decision | Impact |
| --- | --- | --- | --- |
| World | 17 by 13 field, three districts | Cube-sphere planet, 40,075 km, 1/8 scale | P2 and P6 reopen |
| Sites | Three authored districts | 12 hubs, infinite generated sites | P16 reopens |
| Camera | Tactical view and map sheet | Five stops, first person to planet | New platform work |
| Time | 15 and 12 second build phases | 1:8 clock, 24 hour day, four seasons | New clock work |
| Waves | 120 authored waves | Unlimited seeded waves, five phases | P16 reopens |
| City | Four works, three resources | Production cells, seven resources | P3 reopens |
| Logistics | One shell line | Local, scheduled and networked stock | P9 reopens |
| Towers | Four towers, three levels | 12 towers, three branches, dynamic sockets | P4 confirms |
| Enemies | Five enemies, one boss | 12 roles, six modifiers, all wave-legal | P5 confirms |
| Ecology | One marsh, six species | 16/19/3 catalog, 12 deferred rows, four tiers | P8 reopens |
| People | Decorative civilians | 24 residents, full needs, two faction layers | P13 reopens |
| Save | Byte image format 5 | Snapshot, journal, checkpoint, format 8 | P7 and P17 reopen |
| UI | Sheets and cards | Four views, dashboard and fault history | P15 reopens |
| Community | Local survey maps | Seed and map strings, no live network | P10 narrows |
| Progress | Legacy 205-item estimate | 63 of 1,213 capabilities, 5.2% | Measured by T-0016 |

## Ticket impact

| Ticket | State | 6.0 impact |
| --- | --- | --- |
| T-0009 expeditions | Active | Seeded tracks and 34-point loadout remain open |
| T-0010 ecology | Done | One marsh reopens as the 16/19/3 catalog |
| T-0011 automation | Done | One line reopens as production cells |
| T-0012 community maps | Active | Spawn draw-call and triangle budget still open |
| T-0013 endless pressure | Done | The 30-wave test is superseded by the director |
| T-0014 frontier tracks | Done | Region zoom reopens as a 6.0 gate |

## Phase 0.5: planet spine

- Six cube-sphere faces, each a 32-cubed octree.
- 40,075 km real bound, or 5,009 km at 1/8 engine scale.
- One master seed with named sub-seeds.
- Continuous stream across map boundaries.
- First person, tactical, city, region and planet camera stops.
- Voxel LOD zoom with fog and terrain occlusion.
- Full carve and build with persistent edits.
- Memory presets plus render-distance and resolution controls.

**Exit:** a player walks from a hub to a neighboring site without a load screen.

## Phase 0.6: city cells

- Seven resource classes with mass and energy conservation.
- One production cell per district, with local buffers.
- Power, range and permissions can cut networked stock.
- All three logistics modes share one status model.
- Faults name starved, blocked, unpowered and damaged states.
- Dashboard with per-machine history.
- 24 named residents with the full needs set.
- Species and settlement factions can both exist.

**Exit:** a blocked cell names its cause, and a power cut cuts the network.

## Phase 0.7: roster

- 12 towers map 1:1 to the 12 roles.
- Three upgrade branches per tower.
- Sockets scale with tower properties and upgrades.
- 12 enemy roles are wave-legal.
- Six boss modifiers, with a second at high threat.
- 256 live bodies, including splits and summons.
- Nine loot classes, seeded by encounter.
- 34-point loadouts with family axis stars.

**Exit:** two builds clear the same seeded wave with different counters.

## Phase 0.8: living world

- 16 climate envelopes, 19 classified types and 3 overlays.
- All 12 deferred rows, with regional fields sampled per column.
- Four ecology tiers from full local to dormant seed.
- Full modular creature needs, perception and behavior.
- Four global seasons on the 1:8 clock.
- Full field model with soil, water, nutrients and pests.
- Five-phase director with explicit event budgets.
- Pause on unload, with opt-in catch-up.

**Exit:** a population shift has a readable cause and survives a season.

## Phase 0.9: beta surface

- Snapshot, journal and checkpoint save in format 8.
- One world with three slots, plus one-way 0.4 import.
- Strategic, city, tactical and close-interaction views.
- Region zoom enters at the planet scale.
- Localization pipeline and one complete second language.
- Original score, accessibility settings and gamepad parity.
- Spawn budget measured in draw calls and triangles.
- 60 fps on the owner's phone.

**Exit:** a new player finishes the first hub and resumes after a crash.

## 6.0 gate

- Every 0.5 to 0.9 exit passes.
- The scope inventory reflects this roadmap.
- Public MIT repository, green CI, no secrets.
- Release receipt for 6.0 with a tagged asset.
- No open item claims a system the build does not prove.

## First three tickets

| Ticket | Scope | Why first |
| --- | --- | --- |
| T-0015 | Rebuild `state/scope.json` for 6.0 | Done: 4.8% measured baseline |
| T-0016 | Bounded world spine and save format 8 | Every other system sits on it |
| T-0017 | Production cells and seven resources | The city must feed the roster |

## Release debt

- `v0.4.0` is not tagged and has no release receipt.
- CI run `44613847263` passed on commit `2537a1e`.
- Tag after the scope note and roadmap are committed.
- Do not publish a release without a green run on the same commit.

## Open decisions

- Days per season on the 24 hour world clock.
- The 34 point item costs and Axis star tag weights.
- The socket formula for each tower class.
- Network bandwidth and storage limits.
- The default memory preset for a small phone.

## Refusals

- Do not restore a flat bounded field as the planet.
- Do not cap view distance to hide streaming cost.
- Do not fix the faction count before the world exists.
- Do not quote the retired estimate as 6.0 progress.
