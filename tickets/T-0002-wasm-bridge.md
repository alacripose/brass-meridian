---
id: T-0002
title: Bind the wasm core to the client
status: done
owner: buffy
created: 2026-11-19
evidence: artifacts/receipts/probe.json
---

# Bind the wasm core to the client

The Rust core exposes one snapshot buffer and a small command ABI.

The client reads 8,480 floats and never owns gameplay state.

## Checks

- [x] Snapshot length is stable.
- [x] Header values are read.
- [x] Commands return named codes.
- [x] Save bytes load in a new instance.
- [x] Same seed produces the same bytes.
