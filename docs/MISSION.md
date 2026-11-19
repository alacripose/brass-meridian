# Mission

This file is the resume point after a Freebuff pause. Update it before a long break.

## State

Last update: 2026-11-19.

The vertical slice is built. The core, client, tests, probe, gate, ledgers, and CI definitions exist.

The public repository and first release are the last step of this slice.

## What is proved

- 10 Rust tests pass.
- 12 client tests pass against the real wasm.
- The headless probe passes 24 checks.
- The production build succeeds.
- The gate checks prose, ledgers, tickets, progress, ABI, receipts, and secrets.

## Next 120 minutes

1. Create the public MIT repository and push `main`.
2. Watch CI. Fix the first real failure, not the symptom.
3. Enable Pages and confirm the live URL.
4. Tag `v0.1.0` and confirm the release asset.
5. Start ticket T-0008: the frontier map graph.

## After that

- T-0009 expeditions.
- T-0010 ecology.
- T-0011 automation.
- T-0012 community map validation.

Order matters. Each phase needs save migration and a proof before the next one starts.

## Known limits

- No physical phone test.
- No visual review on a real device.
- No frontier, expeditions, ecology, or automation.
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
