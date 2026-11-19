# Mission

This file is the resume point after a Freebuff pause. Update it before a long break.

## State

Last update: 2026-11-19.

The vertical slice is built, published, and tagged. The public repository is live and CI is green.

Pages serves the build at https://alacripose.github.io/brass-meridian/.

The `v0.1.0` release carries the built game and the changelog section.

The 0.2 frontier cut is published. Two districts keep separate tower sets and travel only between waves.

## What is proved

- 13 Rust tests pass.
- 14 client tests pass against the real wasm.
- The headless probe passes 32 checks.
- The production build succeeds.
- The gate checks prose, ledgers, tickets, progress, ABI, receipts, and secrets.
- CI passes both jobs. Pages returns 200 and the wasm is `application/wasm`.
- The release zip has 6 files, the page, and the wasm.

## Next 120 minutes

1. Start T-0014: tracks, threat edges, and a region zoom.
2. Then T-0009 expeditions.

## After that

- T-0014 frontier tracks and threat edges.
- T-0009 expeditions.
- T-0010 ecology.
- T-0011 automation.
- T-0012 community map validation.

Order matters. Each phase needs save migration and a proof before the next one starts.

## Known limits

- No physical phone test.
- The preview page was backgrounded, so no live wave was visually reviewed.
- The frontier is two districts, not a track graph with threat edges.
- No expeditions, ecology, or automation.
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
