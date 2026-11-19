# Brass Meridian

**Hold the line. Grow the city.**

A top-down tower defense you can play with one hand. Build on an open grid, bend the enemy route, and feed the Switchyard from a small industrial city.

[![ci](https://github.com/alacripose/brass-meridian/actions/workflows/ci.yml/badge.svg)](https://github.com/alacripose/brass-meridian/actions/workflows/ci.yml)

[Play the public build](https://alacripose.github.io/brass-meridian/)

## What it is

Brass Meridian is a mobile-first three.js game with a Rust simulation core compiled to WebAssembly.

The battlefield is a 17 by 13 grid. Towers occupy plots, so every placement changes the route. Enemies walk the cheapest open path toward the Switchyard core.

The city is not a separate menu. Each work changes the line.

- Foundry ingots unlock tier three.
- Kiln brass keeps the build queue moving.
- Workshop coils raise damage.
- Depot stores core spares.

This is version 0.4. The defensive slice and the first frontier systems are playable end to end.

Three districts share one core. Ashfall is the far foundry.

The Switchyard holds the tight approach. Coldwater opens a wider flank.

Tracks cost brass and build time. Travel is allowed between waves. Each district keeps its own towers.

One district is raided each wave. Meet the raid for a clear bonus, or lose core when it lands elsewhere.

## Frontier systems

- Expeditions pay a fee for three short waves, a relic, and a permanent boon.
- The Coldwater marsh tracks soil, water, cover, and six species with a named cause.
- The shell line turns ingots into shells, convoys, a repair rule, and offline stock.
- Survey maps can replace Ashfall rubble after schema and route checks.

A contract win adds one relic, up to three. Expedition waves do not advance the normal count.

## Play

Play at `https://alacripose.github.io/brass-meridian/`. The current release is `https://github.com/alacripose/brass-meridian/releases/tag/v0.4.0`.

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
6. Pay a track hop between waves. All three builds stay.
7. Move to the raid district for a clear bonus.
8. Launch a contract from the Map sheet between waves.
9. Work the marsh or the shell line from the City sheet.
10. Import a survey map, or restore the authored Ashfall field.

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
| 28 client tests | `artifacts/receipts/test.json` |
| 25 core tests | `artifacts/receipts/rust-test.json` |
| 89 headless probes | `artifacts/receipts/probe.json` |
| Production build | `artifacts/receipts/build.json` |
| Repository gate | `artifacts/receipts/gate.json` |
| 6.0 interview | `docs/QUESTIONS-6.0.md` |

The probe covers route legality, contracts, the marsh, the shell line, survey maps, deterministic bytes, and save recovery.

`STATUS.md` shows the measured 6.0 inventory. The roadmap is `docs/ROADMAP.md`.

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

The Popit reference set lives outside this repo.

- `POPIT-AUDIT.md`
- `OPENLOCK-CONFLUENT-DREAMS-INTERLINE-REV06.md`
- `persistent_city_builder_tower_defense_design_analysis_v9.md` (owner-supplied, 2026)

The name Brass Meridian is a working game name. It does not rename the OpenLock platform, Confluent Dreams, or any family project.

## Status and license

Read `STATUS.md` for the current percentage, receipts, and limits.
The code is MIT licensed. See `LICENSE`.
