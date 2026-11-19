---
id: T-0018
title: Publish the public build and Pages
status: done
owner: buffy
created: 2026-11-20
evidence: tools/delivery-scan.mjs
---

# Publish the public build and Pages

The repo is public and MIT. The game ships through GitHub Pages.

## Checks

- [x] Scan the tree for env files, keys, tokens, and machine paths.
- [x] Refuse the push when the scan finds a hit.
- [x] Push the measured tree with real history.
- [x] Watch the default branch CI pass.
- [x] Watch the Pages deploy pass.
- [x] Fetch the Pages build and confirm the game loads.

## Exit

The public Pages URL serves the playable build.
