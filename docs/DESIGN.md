# Design

Brass Meridian is a defensive settlement on an industrial frontier. The Switchyard is the last gate. The city exists to keep it standing.

## The three layers

**Conflict.** A readable track, ten authored waves, and endless pressure after that. Towers block movement, so the player shapes the route.

**Production.** Four city works convert time and brass into battlefield capacity. The city is small on purpose. Every building has one job.

**Information.** The HUD shows the route, the next wave, the core, and every fault reason. A player should never guess why a button is disabled.

## Battlefield

The field is 17 by 13 plots. Each plot is 2 world units. The gate enters at the east edge.

The core sits at the west centre.

Enemies follow a flow field toward the core. Towers block cells. A placement is refused when no route remains or the route exceeds 40 steps.

Six rubble cells are unbuildable. The gate and core cells are reserved. The route is redrawn after every build or sale.

## Towers

| Tower | Cost | Base damage | Range | Shot | Air | Special |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| Arc Coil | 45 | 9 | 2.9 | 0.75s | yes | 3 hops, 65% falloff |
| Mortar | 70 | 26 | 5.0 | 2.4s | no | 1.7 splash, 40% slow |
| Rail Spike | 90 | 42 | 6.5 | 1.9s | yes | 8 armor pierce |
| Pylon | 35 | 0 | 3.2 | aura | yes | 45% slow |

Each tower has three levels. Level two costs 70 brass. Level three costs 140 brass and 8 ingots.

Damage scales with level and with Workshop level. Workshop adds 7% damage per level.

Selling returns 60% of the brass spent. The refund is rounded and shown before the sale.

## Enemies

| Enemy | Health | Speed | Armor | Bounty | Core damage |
| --- | ---: | ---: | ---: | ---: | ---: |
| Drudge | 42 | 1.55 | 0 | 6 | 1 |
| Hound | 26 | 2.90 | 0 | 5 | 1 |
| Bulwark | 170 | 0.95 | 6 | 16 | 2 |
| Mote | 48 | 2.10 | 0 | 8 | 1 |
| Cathedral | 1100 | 0.65 | 12 | 140 | 6 |

Health grows 12% per wave. Speed grows 1.5% per wave, capped at 1.3×. Bounty grows by half the wave number.

Flying enemies ignore the maze and fly straight at the core. Mortar cannot target them.

## Waves

Waves one to ten are authored. Wave ten adds the first Cathedral. Later waves mix all types and add a boss every fifth wave.

A build phase lasts 15 seconds at the start and 12 seconds after a clear. Calling early pays two brass per remaining second.

A clear pays 18 brass plus 5 per wave, and 2 ingots plus one per three waves.

## City

| Work | Cost | Effect |
| --- | --- | --- |
| Foundry | 80 brass | 18 ingots per minute per level |
| Kiln | 60 brass | 36 brass per minute per level |
| Workshop | 90 brass | 7% tower damage per level |
| Depot | 80 brass | 4 core capacity per level |

Upgrades cost more and some need ingots. The City panel names the rate and the state.

The city does not simulate workers, power, or transport yet. Those belong to the logistics phase.

## Economy

Brass is the build currency. Ingots are the tier-three currency. Both are visible at all times.

The opening purse is 150 brass. The core starts at 20 health.

Repair costs 45 brass and restores 4 health. The button refuses at full health.

## Surface

The palette follows the Popit audit: brass, dark teal, warm ivory, and a small lime accent.

Panels are rounded and translucent. Rules are dashed. Labels are short.

The dock uses three tabs, not a nested menu.

The surface is a game HUD, not a desktop window manager. It does not claim Dreams-style canvas pinning.

The camera is top-down at a fixed angle. Drag pans, pinch zooms, and a tap selects. The layout adapts to narrow screens with a bottom sheet.

## Information rules

- A disabled button states what is missing.
- A tower card names its target class and its weak case.
- The Intel panel lists the current or next composition.
- The core bar shows exact health.
- The route studs update after every placement.

## What is not here

- A connected frontier map.
- Expeditions, boons, or relics.
- Ecology, habitats, or weather.
- Conveyors, power, or logistics.
- Accounts, cloud saves, or multiplayer.
- Community maps.

These are scoped in `ROADMAP.md`.

## Naming boundary

Brass Meridian is a working game name. It is not a rename of OpenLock, Confluent Dreams, the Meridian Survey, or the Interline.

The design borrows grammar from the family documents. The game remains a separate product.
