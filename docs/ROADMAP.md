# Roadmap

The vertical slice is complete. The wider game is ordered by dependency, not by spectacle.

## Done in 0.1

- [x] One core, one track, and one readable route.
- [x] Four towers with distinct counters.
- [x] Five enemies, including air and armor.
- [x] Ten authored waves and endless scaling.
- [x] Flow-field maze placement with route refusal.
- [x] Four city works with real battlefield effects.
- [x] Save, resume, autosave, and a byte image.
- [x] Touch HUD and Popit-style sheet.
- [x] Headless probe and repository gate.
- [x] CI, Pages, and tagged releases.

## Next: frontier graph

- [x] A world map with districts, tracks, and connections.
- [ ] A zoom from region to track without losing state.
- [x] Three connected maps with separate build state.
- [x] Threat direction visible on the map.
- [x] Save migration for district state.

The 0.3 cut ships a paid track chain, a raid edge, and all three builds. Region zoom is still open.

**Exit:** a player can pay a track hop and meet a marked raid.

## Then: city depth

- [ ] Power as a typed carrier.
- [ ] One local buffer and one transport limit.
- [ ] Machine faults: starved, blocked, unpowered, damaged.
- [ ] Repair crews with reserved brass.
- [ ] A compact fault log with cause and time.

**Exit:** a broken chain names its upstream cause without developer logs.

## Then: buildcraft

- [ ] Target priority per tower.
- [ ] Two modules per tower with tags.
- [ ] Damage types and resistances.
- [ ] One active ability with a cooldown.
- [ ] Blueprint save and compare.

**Exit:** two viable builds can be compared in the Intel panel.

## Then: expeditions

- [ ] Procedural track templates with a seed.
- [ ] Extraction with a limited loadout.
- [ ] Boons and relics with explicit stacking.
- [ ] Boss contract with a fixed modifier.
- [ ] Persistent discoveries.

**Exit:** an expedition pays the city without replacing it.

## Then: ecology

- [ ] One biome with soil, water, and vegetation state.
- [ ] Three prey, two predators, one scavenger.
- [ ] Habitat change that alters a resource or a route.
- [ ] A dormant-region model that keeps outcomes.
- [ ] A cause view for population change.

**Exit:** the player can explain why a species moved.

## Then: automation

- [ ] One conveyor with measured throughput.
- [ ] One mobile consignment with in-transit state.
- [ ] One rule with permissions and a log.
- [ ] Offline production with a cap.
- [ ] Save recovery for a blocked line.

**Exit:** automation is inspectable and stock is conserved.

## Then: community

- [ ] Map schema with generator version.
- [ ] Import validation and refusal reasons.
- [ ] Provenance and author fields.
- [ ] Rollback for a bad map.
- [ ] Performance budget per map.

**Exit:** a map can be validated, played, and removed without migration damage.

## Never

- A second renderer.
- A server without an owner decision.
- A paid service without keys in the user's secret store.
- A hidden cost in the UI.
