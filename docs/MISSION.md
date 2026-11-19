# Mission

This file is the resume point after a Freebuff pause. Update it before a long break.

## State

Last update: 2026-11-19.

The vertical slice and both frontier cuts are built and tagged. The public repository is live and CI is green.

Pages serves the build at https://alacripose.github.io/brass-meridian/.

The `v0.3.0` release carries the built game and the changelog section at https://github.com/alacripose/brass-meridian/releases/tag/v0.3.0.

The 0.3 frontier cut is published. Three districts sit on a paid track chain, and each wave raids one district.

## What is proved

- 15 Rust tests pass.
- 18 client tests pass against the real wasm.
- The headless probe passes 46 checks.
- The production build succeeds.
- The gate checks prose, ledgers, tickets, progress, ABI, receipts, and secrets.
- CI passes both jobs. Pages returns 200 and the wasm is `application/wasm`.
- The release zip has 6 files, the page, and the wasm.
- The release wasm is 53,959 bytes and matches the live Pages wasm hash.
- The release asset was downloaded and its wasm returned snapshot 8,480, ABI 1, and track costs 14 and 22.
- The preview DOM showed three track nodes, costs 14 and 22, a raid arrow, and a live raid note.
- A travel click charged 14 brass and moved the active node to Coldwater.
- A wave click showed the raid HUD and the clear-bonus toast.

## Next 120 minutes

1. Start T-0009 expeditions.
2. Keep save migration and probe coverage with each cut.

## After that

- T-0009 expeditions.
- T-0010 ecology.
- T-0011 automation.
- T-0012 community map validation.

Order matters. Each phase needs save migration and a proof before the next one starts.

## Known limits

- No physical phone test.
- Canvas motion was not visually reviewed; the browser proof is DOM and state only.
- The track graph is one chain, not a region zoom yet.
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
