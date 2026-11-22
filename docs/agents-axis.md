# AGENTS.md on Axis

Source `AGENTS.md`, 5802 bytes and 11 sections.
The ladders are named, never scored: A measured, B receipted, C asserted, D intended.

| date | section | evidence | gate | origin | refusals | superseded by |
|---|---|---|---|---|---|---|
| standing | 1. Evidence before claims | A | current | read-back | none | current |
| standing | 2. Tickets, then code | C | current | diagnostic | none | current |
| standing | 3. Ledgers are append-only | C | current | diagnostic | none | current |
| standing | 4. Two-second prose | C | current | diagnostic | none | current |
| standing | 5. Refusals are part of the product | C | current | diagnostic | none | current |
| standing | 6. Game invariants | C | current | diagnostic | none | current |
| standing | 7. Paths | C | current | diagnostic | wasm32-unknown-unknown | current |
| standing | 8. Mission resume | C | current | diagnostic | none | current |
| standing | 9. When a check fails | C | current | diagnostic | none | current |
| 2026-11-20 | 2026-11-20 — agents files stay readable, and the judge reads the archive | A | refuted | owner | shorthand-compaction | current |
| 2026-11-20 | 2026-11-20 — evidence is superseded, and every gap is a ticket | A | current | owner | limit-stale | current |

Open limits: 6. Each one is a ticket with an id.

- `33e60ad3f5` The limit is 24 words per sentence, 3 sentences per paragraph, and 18 words per UI string.
- `6b54391d8c` - **A "Not checked" line is a ticket, not an apology.** It carries an id in
- `2644af20f3` `artifacts/agents-judge.json` under `open_limits`. It is closed by a later measured section that
- `1830cca8ca` - **A repeated gap is a refusal.** A limit that survives several turns without a closing attempt is
- `f9c61bfa24` `limit-stale`, and the work to close it is the ticket it already has.
- `f2e02fbccb` the judge export, which states what is current, what is superseded and what is still open.
