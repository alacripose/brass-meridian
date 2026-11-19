---
id: T-0013
title: Extend pressure past wave ten
status: done
owner: buffy
created: 2026-11-19
evidence: artifacts/receipts/rust-test.json
---

# Extend pressure past wave ten

The simulation scales health, speed, composition, and bosses.

## Checks

- [x] Endless composition.
- [x] Boss every fifth wave.
- [x] Curve measured over 30 waves.
- [x] A no-build run fails before wave ten.

The 30-wave test pins monotonic health, a speed cap, and a bare-core loss.
