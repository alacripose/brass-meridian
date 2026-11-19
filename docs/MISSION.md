# Mission

This file is the resume point after a Freebuff pause. Update it before a long break.

## State

Last update: 2026-11-19.

The vertical slice and the 0.3 frontier cut are built and tagged. The 0.4 frontier systems are built and waiting for the release pass.

Pages serves the build at https://alacripose.github.io/brass-meridian/.

The `v0.3.0` release carries the built game and the changelog section at https://github.com/alacripose/brass-meridian/releases/tag/v0.3.0.

Version 0.4 adds expeditions, the Coldwater marsh, the shell line, and survey maps. It also adds save format 5 and a version 4 fixture.

## What is proved

- 23 Rust tests pass.
- 27 client tests pass against the real wasm.
- The headless probe passes 83 checks.
- The production build succeeds.
- Survey validation refuses a sealed, over-budget, or anonymous file.
- A version 4 save from the 0.3 wasm still loads.
- The gate checks prose, ledgers, tickets, progress, ABI, receipts, and secrets.
- CI passed on 0.3. The 0.4 CI run is pending.

## Next 120 minutes

1. Run `npm run check` and clear every failure.
2. Show the City and Map sheets in the browser and inspect the new cards.
3. Commit, push, wait for CI, tag `v0.4.0`, and verify the release asset.
4. Then start T-0015, the tower roster.

## After that

- T-0015 tower roster and upgrade branches.
- T-0016 enemy roles and boss modifiers.
- T-0017 authored campaign and teaching.
- T-0018 meta progression and daily seeds.
- T-0019 music and mix.
- T-0020 accessibility and input rebinding.
- T-0021 localization.
- T-0022 more districts, biomes, and waves.
- T-0023 gamepad and keyboard parity.

Order matters. Each phase needs save migration and a proof before the next one starts.

## Known limits

- Progress is 5.2% of the full game scope, not the vertical slice.
- No physical phone test.
- Canvas motion was not visually reviewed.
- The track graph is one chain, not a region zoom yet.
- Expedition tracks are not seeded and loadouts are not limited.
- Survey maps have a cell budget, not a measured performance budget.
- No music, localization, or gamepad parity.
- The renderer is one bundle and not code-split.

## Commands

```bash
cd /f/Documents/brass-meridian
npm run check
npm run dev
npm run status
```

If a check fails, read the receipt and fix the cause.

## Naming boundary

Brass Meridian is a working game name. Do not fold it into Confluent Dreams or the platform family without an owner decision.
