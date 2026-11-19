// The 6.0 interview record. One row is one owner decision.
// This file is the source; the JSONL and Markdown are generated from it.

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rows = [];

function row(round, phase, question, answer, evidence, ruling = "") {
  rows.push({ id: `Q-${String(rows.length + 1).padStart(3, "0")}`, round, phase, question, answer, evidence, ruling });
}

// Round 1: the product boundary.
row(1, "Product", "What counts as 6.0?", "A content-complete beta.", "docs/MISSION.md");
row(1, "Product", "How large is the tower roster?", "Twelve towers with three branches each.", "docs/DESIGN.md");
row(1, "Product", "How large is the enemy roster?", "Twelve roles and six boss modifiers.", "docs/DESIGN.md");
row(1, "Product", "What is the world content?", "A generated world with authored hubs.", "openlock design §3");
row(1, "Product", "What is the wave model?", "Unlimited seeded waves with downtime.", "docs/DESIGN.md");
row(1, "Product", "Which seed is exact?", "-9028097967753437981.", "shploingus LEDGER line 7067", "Evidence applied: format 6 stores the full 64-bit seed.");
row(1, "Product", "Which renderer stays?", "three.js with the family octree mesher.", "docs/ARCHITECTURE.md");
row(1, "Product", "What does the octree own?", "Terrain, collision and rendering.", "crates/voxel-mesh/src/octree.rs");
row(1, "Product", "Is the view distance capped?", "No; use LOD, fog and terrain occlusion.", "shploingus docs/lod-ladder.md");
row(1, "Product", "Is region zoom deferred?", "No; it is a 6.0 gate.", "tickets/T-0014-frontier-tracks.md");
row(1, "Product", "Which save format ships?", "Format 6 with seed, world and slots.", "docs/ARCHITECTURE.md");
row(1, "Product", "How do 0.4 saves load?", "One-way import into format 6.", "docs/ARCHITECTURE.md");
row(1, "Product", "Does T-0009 close in 6.0?", "Yes; seeded tracks and extraction loadouts.", "tickets/T-0009-expeditions.md");
row(1, "Product", "What does T-0012 measure?", "Draw calls and triangles at spawn.", "tickets/T-0012-community-maps.md");
row(1, "Product", "What is the frame target?", "60 fps on the owner's phone.", "docs/ARCHITECTURE.md");
row(1, "Product", "Is community networking in 6.0?", "No; deferred for security.", "docs/REFUSALS.md");
row(1, "Product", "How much buildcraft ships?", "All five buildcraft items.", "docs/ROADMAP.md");
row(1, "Product", "How much local meta ships?", "All local meta progression.", "docs/ROADMAP.md");
row(1, "Product", "What music ships?", "An original score.", "docs/ROADMAP.md");
row(1, "Product", "What localization ships?", "The pipeline and a second language.", "docs/ROADMAP.md");

// Round 2: the world model.
row(2, "World", "What is the scope source?", "state/scope.json is canonical.", "tools/scope.mjs");
row(2, "World", "Where do the answers live?", "docs/QUESTIONS-6.0.md and a JSONL record.", "state/questions-6.0.jsonl");
row(2, "World", "What is the release path?", "0.5 through 0.9, then 6.0.", "docs/ROADMAP.md");
row(2, "World", "What is the voxel role?", "Simulation behind the three.js diorama.", "docs/ARCHITECTURE.md");
row(2, "World", "What carving profile is used?", "profile32 with 32-cubed carving.", "shploingus docs/SHAPER-PROFILES.md");
row(2, "World", "What is the world scale?", "One eighth of real scale, time included.", "db-mc docs/ATMOSPHERE-LAWS.md");
row(2, "World", "Is performance bounded?", "No; read the family LOD docs.", "shploingus docs/lod-ladder.md");
row(2, "World", "What is the core tick?", "33 ms.", "docs/ARCHITECTURE.md");
row(2, "World", "How are seeds structured?", "One master seed with named sub-seeds.", "shploingus LEDGER line 7067", "Evidence applied: the tree now takes a 64-bit seed; named sub-seeds remain open.");
row(2, "World", "How are waves authored?", "Seeded templates with authored beats.", "docs/DESIGN.md");
row(2, "World", "Where does downtime design come from?", "The deeper family design docs.", "openlock design §10");
row(2, "World", "What persists?", "World, damage, economy and ecology.", "openlock design A5");
row(2, "World", "How many authored hubs?", "Twelve districts remain the hub set.", "docs/DESIGN.md");
row(2, "World", "What scale and UI?", "Planetary scale and a much better UI.", "openlock design §3.3");
row(2, "World", "What is the camera path?", "Walk continuously, first person to planetary.", "openlock design §3.3");
row(2, "World", "How does zoom work?", "Voxel LOD zoom.", "shploingus docs/lod-ladder.md");
row(2, "World", "How does streaming work?", "Use the family cubic chunk streaming.", "db-mc TICKET-0012");
row(2, "World", "Does terrain editing persist?", "Carve and build both persist.", "shploingus docs/SHAPER-PROFILES.md");
row(2, "World", "Was the phone check done?", "Yes; the owner saw it on a phone.", "owner answer, batch 1");
row(2, "World", "What repo boundary applies?", "MIT, public, and no secrets.", "README.md");

// Round 3: planet, clock, save and UI.
row(3, "Planet", "What is the 6.0 extent?", "One planet with many regions.", "owner answer, batch 3");
row(3, "Planet", "What is the world bound?", "40,075 km.", "shploingus docs/lod-ladder.md", "Evidence applied: 40,075 km real equals 5,009 km at 1/8 engine scale.");
row(3, "Clock", "How does 1/8 scale affect time?", "One real second is eight world seconds.", "owner answer, batch 3");
row(3, "Camera", "Which camera stops ship?", "First person, tactical, city, region, planet.", "openlock design §3.3");
row(3, "Camera", "Is zoom continuous?", "Yes; continuous LOD zoom with no load screen.", "openlock design §3.3");
row(3, "Planet", "How many sites?", "Infinite generated sites.", "owner answer, batch 3", "Evidence applied: the planet is finite; sites generate in endless order until full.");
row(3, "Planet", "What happens at a map boundary?", "Walk across and stream the next map.", "openlock design §3.1");
row(3, "Terrain", "Can the player carve terrain?", "Yes; full carve and build.", "shploingus profile32");
row(3, "Platform", "What memory ceiling applies?", "Provide options instead of one cap.", "owner answer, batch 3");
row(3, "Waves", "Which director phases ship?", "Signal, preparation, engagement, resolution, recovery.", "openlock design §10");
row(3, "Waves", "What selects events?", "Seeded templates with explicit event budgets.", "openlock design §10");
row(3, "Save", "What offline policy applies?", "Pause on unload, with opt-in catch-up.", "openlock design A5.4", "Evidence applied: the design default replaces four-hour catch-up.");
row(3, "Save", "What save model ships?", "Snapshot, journal and checkpoint.", "openlock design A5.3");
row(3, "Save", "How many worlds?", "One world with three slots.", "openlock design A5.1");
row(3, "People", "How deep is the social layer?", "Full residents and factions.", "openlock design §4.5");
row(3, "City", "What is the city unit?", "Production cells per district.", "openlock design §15.1.1");
row(3, "City", "Which logistics modes ship?", "All three, including networked stock.", "openlock design §4.4");
row(3, "Ecology", "How are biomes chosen?", "From scientific references with evidence.", "shploingus biome catalog");
row(3, "UI", "Which UI views ship?", "Strategic, city, tactical and close interaction.", "openlock design §11");
row(3, "UI", "What observability ships?", "A dashboard and per-machine fault history.", "openlock design §11.5");

// Round 4: combat, economy and ecology.
row(4, "Ecology", "Which biome catalog ships?", "16 envelopes, 19 types and 3 overlays.", "shploingus docs/baselines/biomes.json");
row(4, "Ecology", "What about the deferred rows?", "Add all twelve, with their missing fields.", "crates/voxel-shapers/src/biome_library.rs", "Evidence applied: all 12 rows are new field work; the family defers them until those fields exist.");
row(4, "Ecology", "How deep is the creature model?", "Full modular needs, perception and behavior.", "openlock design §6.1");
row(4, "Ecology", "How many ecology tiers?", "All four fidelity tiers.", "openlock design §6.4");
row(4, "Ecology", "How deep is agriculture?", "The full field model with soil and pests.", "openlock design §6.5");
row(4, "People", "How many residents?", "24 named residents.", "owner answer, batch 4");
row(4, "People", "How many factions?", "No fixed count; creatures can become factions.", "owner answer, batch 4");
row(4, "People", "Which resident needs matter?", "The full RimWorld set.", "openlock design §4.5");
row(4, "Combat", "Do tower roles map to towers?", "Yes; 12 roles map 1:1 to 12 towers.", "openlock design §8.1");
row(4, "Combat", "Which enemies are wave-legal?", "All twelve roles.", "openlock design §8.2");
row(4, "Combat", "How are boss modifiers assigned?", "One per boss, with stacking.", "owner answer, batch 4", "Evidence applied: one base modifier plus a second at high threat, capped at two.");
row(4, "Loot", "How many loot classes?", "All nine classes.", "openlock design §8.3");
row(4, "Economy", "How many resource classes?", "Seven classes.", "openlock design §9.1");
row(4, "Combat", "Do towers consume supply?", "Yes; ammunition and power.", "openlock design §8.5");
row(4, "Logistics", "What is the network scope?", "All three modes depend on operational status.", "openlock design §4.4");
row(4, "Meta", "What prestige reset ships?", "An optional full reset.", "openlock design §9.4");
row(4, "Platform", "Which memory controls ship?", "Presets plus two controls.", "owner answer, batch 4");
row(4, "Waves", "What is the live-enemy cap?", "256 live enemies.", "owner answer, batch 4");
row(4, "Expedition", "What is the loadout budget?", "34 points, with axis stars for costly items.", "owner answer, batch 4", "Evidence applied: the six named Axis stars are the loadout tags.");
row(4, "Towers", "How many module sockets?", "Two, but scale with tower properties.", "owner answer, batch 4", "Evidence applied: sockets scale with tower properties; there is no fixed two.");

// Round 5: integration and clarification.
row(5, "Planet", "What planet geometry?", "A cube-sphere with six faces.", "shploingus octree CHUNK_SIDE");
row(5, "Planet", "How do infinite sites fit?", "Finite surface, endless generation order.", "openlock design §3.2");
row(5, "Clock", "How long is a day?", "24 world hours, or 3 real hours.", "owner answer, batch 5");
row(5, "Ecology", "Are seasons global?", "Yes; four global seasons.", "owner answer, batch 5");
row(5, "Ecology", "Where are deferred fields computed?", "A regional cache, sampled per column.", "biome_library.rs");
row(5, "Logistics", "What gates the network?", "Power, range and permissions.", "openlock design §4.4");
row(5, "People", "What is a faction?", "Both species relationships and settlement politics.", "openlock design §4.5");
row(5, "People", "What happens when a resident falls?", "Downed, then recoverable or permanent.", "openlock design §4.5");
row(5, "People", "How do residents simulate off-screen?", "Aggregate off-screen, full when present.", "openlock design §6.4");
row(5, "Meta", "What survives prestige?", "Codex, blueprints and settings.", "openlock design §9.4");
row(5, "Combat", "When is a second boss modifier added?", "At high threat; two or more are allowed.", "owner answer, batch 5", "Evidence applied: a second modifier at high threat, capped at two.");
row(5, "Expedition", "Which axes price a loadout?", "The family axis.", "owner answer, batch 5", "Evidence applied: use presence, craft, evidence, standing, conduct and continuity; costs stay tuning.");
row(5, "Towers", "Are sockets fixed at two?", "No; they scale with tower properties and upgrades.", "owner answer, batch 5");
row(5, "Loot", "Is loot deterministic?", "Encounter-seeded.", "docs/ARCHITECTURE.md");
row(5, "Economy", "Do resource conversions conserve?", "Mass and energy conservation.", "shploingus GAIA mass ledger");
row(5, "Save", "When is the snapshot written?", "After every wave and on unload.", "openlock design A5.3");
row(5, "Platform", "What happens under memory pressure?", "Evict distant LOD first.", "owner answer, batch 5");
row(5, "Waves", "Does the cap include summons?", "Yes; all live bodies count.", "openlock design §8.2");
row(5, "Community", "What sharing is allowed?", "Seed and map strings only.", "docs/REFUSALS.md");
row(5, "Ecology", "At what scale is a biome classified?", "Per 32 m cell.", "shploingus docs/baselines/biomes.json");

if (rows.length !== 100) {
  console.error(`QUESTION-FAIL expected 100 rows, got ${rows.length}`);
  process.exit(1);
}
for (const entry of rows) {
  if (!entry.question || !entry.answer || !entry.evidence) {
    console.error(`QUESTION-FAIL incomplete row ${entry.id}`);
    process.exit(1);
  }
}

const jsonl = rows.map((entry) => JSON.stringify(entry)).join("\n") + "\n";
writeFileSync(resolve(root, "state/questions-6.0.jsonl"), jsonl);

const rounds = [...new Set(rows.map((entry) => entry.round))];
const md = [];
md.push("<!-- generated by tools/questions-6.mjs -->");
md.push("# 6.0 interview");
md.push("");
md.push("The owner answered 100 questions. Each row names one decision and its evidence.");
md.push("");
md.push("The JSONL record mirrors this table. Regenerate both with `node tools/questions-6.mjs`.");
md.push("");
for (const round of rounds) {
  const group = rows.filter((entry) => entry.round === round);
  md.push(`## Round ${round}`);
  md.push("");
  md.push("| ID | Question | Answer | Evidence | Ruling |");
  md.push("| --- | --- | --- | --- | --- |");
  for (const entry of group) md.push(`| ${entry.id} | ${entry.question} | ${entry.answer} | ${entry.evidence} | ${entry.ruling || "—"} |`);
  md.push("");
}
writeFileSync(resolve(root, "docs/QUESTIONS-6.0.md"), md.join("\n"));

console.log(`QUESTION-PASS rows=${rows.length} rounds=${rounds.length}`);
