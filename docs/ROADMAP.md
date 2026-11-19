# Roadmap

The foundations ship. The full game is much larger, so order follows dependency, not spectacle.

Progress is a scope estimate for the whole game. The vertical slice is not the finish line.

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

## Done in 0.4

- [x] Three paid contracts with a fee and three legs.
- [x] Relics and boons with explicit stacking.
- [x] One marsh with soil, water, cover, and six species.
- [x] A cause view for every population shift.
- [x] One shell line with a convoy and a repair rule.
- [x] Offline production with a four hour cap.
- [x] Survey schema, budget, provenance, and rollback.
- [x] Save format 5 and a version 4 fixture.

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
- [x] Boons and relics with explicit stacking.
- [x] Boss contract with a fixed modifier.
- [x] Persistent discoveries.

**Exit:** an expedition pays the city without replacing it. The first contract loop is live. Seed and loadout work remain.

## Then: ecology

- [x] One biome with soil, water, and vegetation state.
- [x] Three prey, two predators, one scavenger.
- [x] Habitat change that alters a resource or a route.
- [x] A dormant-region model that keeps outcomes.
- [x] A cause view for population change.

**Exit:** the player can explain why a species moved. Coldwater meets this.

## Then: automation

- [x] One conveyor with measured throughput.
- [x] One mobile consignment with in-transit state.
- [x] One rule with permissions and a log.
- [x] Offline production with a cap.
- [x] Save recovery for a blocked line.

**Exit:** automation is inspectable and stock is conserved. The shell line meets this.

## Then: community

- [x] Map schema with generator version.
- [x] Import validation and refusal reasons.
- [x] Provenance and author fields.
- [x] Rollback for a bad map.
- [ ] A measured performance budget per map.

**Exit:** a map can be validated, played, and removed without migration damage. A measured budget is still open.

## Then: roster and campaign

- [ ] Twelve towers with three upgrade branches.
- [ ] Damage types, resistances, and target priority.
- [ ] Twelve enemies with roles and six boss modifiers.
- [ ] A twelve-district authored campaign.
- [ ] First-run teaching without a wall of text.
- [ ] Meta progression and daily seeds.

**Exit:** a player can finish a campaign and name two viable builds.

## Then: surface and platform

- [ ] Original music with a quiet mix and a mute path.
- [ ] Reduced motion, color-blind palettes, and text scaling.
- [ ] Gamepad and keyboard parity.
- [ ] A localization pipeline and a second language.
- [ ] A physical-phone touch pass.

**Exit:** the game is playable with one hand and one input, and readable in two languages.

## Never

- A second renderer.
- A server without an owner decision.
- A paid service without keys in the user's secret store.
- A hidden cost in the UI.
