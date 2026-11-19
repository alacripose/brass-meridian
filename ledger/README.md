# Ledger

Append-only proof rows. One claim per line.

Types: failures, health, probes, tests, improvements.

Files rotate by phase: `phase-01.jsonl` covers the vertical slice.

Each row has `seq`, `at`, `ticket`, `claim`, `ev`, and `ok`. Evidence paths must exist.

Never edit a row. To correct one, append a new row and name the old one in `fixes`.

```bash
npm run ledger
```

The verifier checks sequence, keys, dates, booleans, and evidence paths.
