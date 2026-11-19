# Ledgers

The ledgers are append-only proof. They answer a narrow question: what was claimed, what file proves it, and did it pass?

## Types

| Type | Use |
| --- | --- |
| `failures` | A real defect or a wrong assumption. |
| `health` | Build, test, and gate state. |
| `probes` | Headless behavioral checks. |
| `tests` | Unit and integration results. |
| `improvements` | A refusal or guard added after a failure. |

## Row shape

```json
{"seq":1,"at":"2026-11-19T08:00:00Z","ticket":"T-0001","claim":"short claim","ev":"artifacts/receipts/test.json","ok":true}
```

The keys are intentionally short. Each row is one line. One row makes one claim.

`ev` must exist on disk. The gate checks this.

## Rotation

Files are named `ledger/<type>/phase-NN.jsonl`. Phase one covers the vertical slice. A new phase starts a new file.

Rotation keeps the oldest rows readable without loading a large file. It also lets a reader stop at a phase boundary.

## Append only

Never edit or delete a row. To correct one, append a new row and name the old sequence in `fixes`.

A failure row stays after the fix. The improvement row points at it.

## Commands

```bash
npm run ledger
node tools/ledger.mjs add tests T-0001 "claim" artifacts/receipts/test.json true
```

The verifier checks the sequence, required keys, dates, boolean state, and evidence paths.

## What lives outside

Receipts hold machine output. Tickets hold scope. `STATUS.md` holds the generated summary.

The ledger does not replace any of them. It links them.
