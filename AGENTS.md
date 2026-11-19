# AGENTS.md — Brass Meridian

Rules for anyone working here. Read `STATUS.md` first. It is generated and carries the current percentage.

The family base is `C:/Users/ala/Documents/deadlock-model-forge/AGENTS.md`. This file adds the game contract. It does not weaken the family rules.

## 1. Evidence before claims

A behavior claim needs a receipt in `artifacts/receipts/`, a probe that can be rerun, or a file a reader can open.

"Works" without evidence is not a status. A failed check is reported as a failure.

The gate is the definition of done. `npm run check` must exit 0 before a ticket is called done.

## 2. Tickets, then code

Work starts as `tickets/T-XXXX-*.md` with front matter: `id`, `title`, `status`, `owner`, `created`, `evidence`.

`status: done` requires an evidence path that exists. The gate fails otherwise.

Do not narrow a ticket to match what was built. Split it instead.

## 3. Ledgers are append-only

Rows live in `ledger/<type>/phase-NN.jsonl`. The five types are failures, health, probes, tests, and improvements.

A row has `seq`, `at`, `ticket`, `claim`, `ev`, and `ok`. Never edit a row. Append a correction and name the old row.

Rotate by phase so old files stay small. Keep one claim per row.

`npm run ledger` verifies the shape and the evidence paths.

## 4. Two-second prose

Every player-facing line and every doc sentence must be readable at a glance.

The limit is 24 words per sentence, 3 sentences per paragraph, and 18 words per UI string.

`tools/prose.mjs` enforces this and bans filler words. Full rule: `docs/PROSE.md`.

## 5. Refusals are part of the product

Every shipped failure becomes a named refusal. The registry is `src/refusals.ts`. The explanation is `docs/REFUSALS.md`.

The gate fails when an id is missing from the doc. Do not add an exemption instead.

## 6. Game invariants

- The core is deterministic. Same seed and same commands must produce the same bytes.
- The renderer never owns gameplay state. It reads a snapshot and sends commands.
- The game must work with one hand on a narrow screen.
- The route must stay open. Placement that seals the core is refused.
- The snapshot layout is shared by Rust and TypeScript. A version bump changes both.
- No secret, key, token, `.env`, or private path enters the public repo.

## 7. Paths

This repo lives at `F:/Documents/brass-meridian`. `C:` is nearly full.

The source design docs stay outside the repo. Cite them by path in docs.

The wasm target is `wasm32-unknown-unknown`. The client is Vite plus three.js.

## 8. Mission resume

Freebuff pauses the mission every 120 minutes. The resume state is `docs/MISSION.md`.

Update it before a long pause: what shipped, what is next, and what is blocked.

Do not end halfway through a ticket. Leave the tree green or name the failure.

## 9. When a check fails

Fix the cause. Never weaken an assertion, skip a test, or turn a failure into a warning.

If a check is environmental, report it and keep it failing.

Receipts and failure records are not deleted because they are inconvenient.
