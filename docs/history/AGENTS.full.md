# AGENTS.md — Brass Meridian

Rules for anyone working here. Read `STATUS.md` first. It is generated and carries the current percentage.

The family base is the `deadlock-model-forge` agents file. This file adds the game contract. It does not weaken the family rules.

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

This repo lives on the F work drive. The system drive is nearly full.

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

## 2026-11-20 — agents files stay readable, and the judge reads the archive

**Owner instruction, verbatim:** *"agents in every project should be easy as the user says what they
want and 'read agents in full' and it gives about however many lines of text are in the agent file in
the repo, but all of this is bad: and the shorthand shit is awfull that that is an abhorrent affrontt
to language"*.

- **An agents file is read in full.** Its job is to be understood, so a rule keeps its reasoning, its
  measured numbers and its phrasing. A rule cut down to a bold lead and a pointer is refused by name,
  `shorthand-compaction`, and the refusal is recorded rather than argued.
- **The evidence is not deleted, it is classified.** `docs/history/agents.md.jsonl` keeps every dated
  section with its digest. `artifacts/agents-judge.json` carries the same rows on the Axis ladders,
  so the Debian governance stack grades the record without a model re-reading the prose.
- **The ladders are named, never scored.** `evidence_grade` is A measured, B receipted, C asserted,
  D intended. `gate_status` is current or refuted. `evidence_origin` is owner, read-back or
  diagnostic. No percentage, no average.
- **The archive never replaces the file.** Reading `AGENTS.md` end to end stays the first step of
  every session, and the archive is what a judge reads after that.
- **A refusal about prose is a refusal about the harness.** A file that needs a decoder has already
  failed the reader it was written for.

## 2026-11-20 — evidence is superseded, and every gap is a ticket

**Owner instruction, verbatim:** *"Agents bloated with prior evidence work despite multiple turns
outlining the security system allowing for supersession"*.

- **A later verdict replaces an earlier one.** When a section names a refusal code that an earlier
  section also named, the earlier verdict is superseded. The archive carries `superseded_by`, and
  the judge reads the current row instead of the oldest claim it can find.
- **Nothing is deleted to achieve that.** The file keeps its prose and the archive keeps every row.
  Currency is computed, never achieved by cutting the record.
- **A "Not checked" line is a ticket, not an apology.** It carries an id in
  `artifacts/agents-judge.json` under `open_limits`. It is closed by a later measured section that
  names the id, and it is never closed by silence.
- **A repeated gap is a refusal.** A limit that survives several turns without a closing attempt is
  `limit-stale`, and the work to close it is the ticket it already has.
- **Reading the file is not reading the evidence.** The first read is the rules. The second read is
  the judge export, which states what is current, what is superseded and what is still open.
