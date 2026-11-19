# Changelog

All notable changes to Brass Meridian are recorded here.
The format follows Keep a Changelog, and versions use semantic numbering.

## [Unreleased]

### Added

- A 100-row reconciliation ledger with evidence and verdicts.
- A measured 6.0 inventory: 55 of 1,213 capabilities, or 4.5 percent.
- A format 6 save block that preserves the full 64-bit seed.
- A 6.0 roadmap for the planet, city cells, roster and living world.

### Changed

- The planet replaces the flat field, three districts and 120 authored waves.
- Tests now cover 25 Rust cases, 28 client cases, and 89 probes.

## [0.4.0] - 2026-11-19

### Added

- Three expedition contracts with a fee, three legs, a relic, and a boon.
- One Coldwater marsh with soil, water, cover, six species, and a visible cause.
- One shell line with a buffer, convoy, repair rule, fault log, and offline cap.
- Community survey maps with schema, budget, author, and connectivity checks.
- A survey example and one-step restore to authored Ashfall.
- Save format 5 with shells, expeditions, ecology, automation, and survey cells.
- A version 4 save fixture from the 0.3 wasm.
- Twenty-four Rust tests, twenty-seven client tests, and eighty-three probe checks.

### Changed

- The City sheet now shows the marsh and the shell line as inspectable cards.
- The Map sheet now shows contracts and the survey importer.
- Offline production resumes from the last save time, capped at four hours.
- A full-scope inventory now drives progress, and every open item names a next step.
- A pre-6.0 inventory recorded 5.5 percent of the old scope.

### Limits

- Expedition tracks are not seeded and loadouts are not limited yet.
- Survey maps have a cell budget, not a measured performance budget.
- Music and localization remain open, and no 60 fps phone receipt exists.

## [0.3.0] - 2026-11-19

### Added

- Ashfall, a third district at the far end of the line.
- Paid track hops between neighboring districts.
- A raid district that moves each wave and marks the map edge.
- A clear bonus for meeting the raid and a core leak for missing it.
- A version 3 save fixture from the 0.2 wasm.

### Changed

- The Map tab draws the track network, costs, and raid arrow.
- Save format 4 keeps three district builds, the raid, and its bonus.
- The HUD names the raid and reports its outcome.

### Limits

- The track graph is one chain, not a region zoom yet.
- Expeditions, ecology, and automation are still on the roadmap.

## [0.2.0] - 2026-11-19

### Added

- Coldwater, a second district with its own rubble, route, and tower set.
- A Map tab that travels between districts only between waves.
- Save format 3, which keeps both district builds and migrates version 2 saves.

### Changed

- The snapshot map field replaces the unused core-base header slot.
- The dock has four tabs; the mobile width was reduced for the new tab.

### Limits

- The frontier is two districts, not a graph of tracks and threat edges yet.
- Expeditions, ecology, and automation are still on the roadmap.

## [0.1.0] - 2026-11-19

### Added

- Playable vertical slice with ten authored waves and endless scaling after wave ten.
- Deterministic Rust simulation compiled to WebAssembly.
- Flow-field maze placement on a 17 by 13 grid with a 40 step route budget.
- Four towers with three levels, distinct roles, and a sell refund.
- Five enemies, including flying Motes and Cathedral bosses.
- City layer with Foundry, Kiln, Workshop, and Depot upgrades.
- Touch camera with drag, pinch zoom, and plot selection.
- Popit-style HUD with Build, City, and Intel panels.
- Save image in localStorage with autosave and resume.
- Procedural sound layer, off by default.
- Headless probe for route, wave, economy, determinism, and save recovery.
- Repository gate for prose, ledgers, tickets, progress, ABI, receipts, and secrets.
- GitHub Actions for tests, Pages, and tagged releases.

### Limits

- No frontier map graph, expeditions, ecology, or automation yet.
- No accounts, server, or multiplayer.
- Touch input was not checked on a physical phone in this version.
