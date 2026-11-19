# Changelog

All notable changes to Brass Meridian are recorded here.
The format follows Keep a Changelog, and versions use semantic numbering.

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
