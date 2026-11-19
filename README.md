# Brass Meridian

**Hold the line. Grow the city.**

A top-down tower defense you can play with one hand. Build on an open grid, bend the enemy route, and feed the Switchyard from a small industrial city.

[![ci](https://github.com/alacripose/brass-meridian/actions/workflows/ci.yml/badge.svg)](https://github.com/alacripose/brass-meridian/actions/workflows/ci.yml)

## What it is

Brass Meridian is a mobile-first three.js game with a Rust simulation core compiled to WebAssembly.

The battlefield is a 17 by 13 grid. Towers occupy plots, so every placement changes the route. Enemies walk the cheapest open path toward the Switchyard core.

The city is not a separate menu. Each work changes the line.

- Foundry ingots unlock tier three.
- Kiln brass keeps the build queue moving.
- Workshop coils raise damage.
- Depot stores core spares.

This is version 0.3. The defensive slice is playable end to end.

Three districts share one core. Ashfall is the far foundry.

The Switchyard holds the tight approach. Coldwater opens a wider flank.

Tracks cost brass and build time. Travel is allowed between waves. Each district keeps its own towers.

One district is raided each wave. Meet the raid for a clear bonus, or lose core when it lands elsewhere.

## Play

Play at `https://alacripose.github.io/brass-meridian/`. The current release is `https://github.com/alacripose/brass-meridian/releases/tag/v0.3.0`.

Tap **Build**, choose a tower, then tap a plot. Tap a tower to upgrade or sell.

## Controls

| Action | Touch | Mouse |
| --- | --- | --- |
| Pan | Drag the field | Drag the field |
| Zoom | Pinch | Wheel |
| Select | Tap a plot or tower | Click |
| Build | Build tab, pick, tap | Same |
| Send wave | Send now | Same |
| Pause | Top bar | Top bar |
| Speed | Top bar, 1× to 3× | Same |

## The loop

1. Build during the 15 second opening and the 12 second gaps.
2. Call a wave early for bonus brass.
3. Keep the route open. A wall that seals the core is refused.
4. Spend wave income on towers and city works.
5. Hold ten waves, then face the endless frontier.
6. Pay a track hop between waves. Both builds stay.
7. Move to the raid district for a clear bonus.

### Towers

| Tower | Cost | Job |
| --- | ---: | --- |
| Arc Coil | 45 | Chains three targets. Hits air. |
| Mortar | 70 | Splash and slow. Ground only. |
| Rail Spike | 90 | Long shot. Pierces armor. Hits air. |
| Pylon | 35 | Wide slow field. No damage. |

### Enemies

| Enemy | Trait |
| --- | --- |
| Drudge | Slow line filler. |
| Hound | Fast and fragile. |
| Bulwark | Armored. Rail Spike cuts it. |
| Mote | Flies. Mortar cannot hit. |
| Cathedral | Boss. Breaks six core. |

## Run it

```bash
npm ci
npm run wasm
npm run dev
```

Open `http://127.0.0.1:5173`.

The wasm step needs a Rust toolchain with `wasm32-unknown-unknown`.
`npm run check` runs the whole proof chain.

## Proof

| Check | Evidence |
| --- | --- |
| 18 client tests | `artifacts/receipts/test.json` |
| 15 core tests | `artifacts/receipts/rust-test.json` |
| 46 headless probes | `artifacts/receipts/probe.json` |
| Production build | `artifacts/receipts/build.json` |
| Repository gate | `artifacts/receipts/gate.json` |
| Release v0.3.0 | `artifacts/receipts/release-0.3.0.json` |

The probe covers route legality, track costs, raid edges, wave spawns, city income, deterministic bytes, and save recovery.

`STATUS.md` is generated from weighted phases. It carries the project percentage and the open limits.

## Layout

```text
core/       Rust simulation, compiled to wasm
src/        three.js renderer, HUD, WASM bridge
tests/      client integration tests
tools/      gate, probe, ledgers, status, receipts
ledger/     append-only proof rows
tickets/    scoped work with evidence
docs/       design, architecture, roadmap, refusals
state/      weighted progress
```

## Design roots

The loop follows the owner's design analysis: Desktop Tower Defense maze pressure, readable Bloons-style counters, and a city layer that materially arms the defense.

The surface follows the Popit audit. Rounded panels, a page grammar, brass on dark teal, and short labels.

Sources live outside this repo:

- `C:/Users/ala/Documents/popit_base/references/POPIT-AUDIT.md`
- `C:/Users/ala/Documents/popit_base/references/OPENLOCK-CONFLUENT-DREAMS-INTERLINE-REV06.md`
- `persistent_city_builder_tower_defense_design_analysis_v9.md` (owner-supplied, 2026)

The name Brass Meridian is a working game name. It does not rename the OpenLock platform, Confluent Dreams, or any family project.

## Status and license

Read `STATUS.md` for the current percentage, receipts, and limits.
The code is MIT licensed. See `LICENSE`.
