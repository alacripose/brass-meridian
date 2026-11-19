---
id: T-0018
title: Publish the public build and Pages
status: active
owner: buffy
created: 2026-11-20
evidence: tools/delivery-scan.mjs
---

# Publish the public build and Pages

The repo is public and MIT. The game ships through GitHub Pages.

## Checks

- [x] Scan the tree for env files, keys, tokens, and machine paths.
- [x] Refuse the push when the scan finds a hit.
- [ ] Push the measured tree with real history.
- [ ] Watch the default branch CI pass.
- [ ] Watch the Pages deploy pass.
- [ ] Fetch the Pages build and confirm the game loads.

## Exit

The public Pages URL serves the playable build.
