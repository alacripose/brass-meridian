# Contributing

Keep changes small and proved.

1. Open a ticket in `tickets/` with the required front matter.
2. Add the refusal if the change prevents a repeat failure.
3. Run `npm run check`.
4. Add one ledger row per claim.
5. Keep prose short. Read `docs/PROSE.md`.

Do not commit secrets, `.env` files, build output, or `node_modules`.
Do not weaken a test to make the gate green.

The simulation is the source of truth. The UI never edits state directly.

Use `npm run status` after changing `state/progress.json`.
