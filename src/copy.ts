// Every player-facing line lives here. Keep it short enough to read at a glance:
// one idea per line, no internal jargon, no numbers that the UI does not show.

export type TowerCopy = {
  name: string;
  tag: string;
  role: string;
  hint: string;
};

export const TOWERS: TowerCopy[] = [
  {
    name: "Arc Coil",
    tag: "Chain",
    role: "Lightning hops between three targets. Hits air.",
    hint: "Good against packs.",
  },
  {
    name: "Mortar",
    tag: "Siege",
    role: "Shells splash and slow. Ground only.",
    hint: "Good against crowds.",
  },
  {
    name: "Rail Spike",
    tag: "Pierce",
    role: "Long single shot. Ignores armor. Hits air.",
    hint: "Good against armor.",
  },
  {
    name: "Pylon",
    tag: "Control",
    role: "Wide slow field. Deals no damage.",
    hint: "Good beside damage.",
  },
];

export type CityCopy = {
  name: string;
  role: string;
  effect: string;
};

export const CITY: CityCopy[] = [
  { name: "Foundry", role: "Casts ingots.", effect: "Ingots per minute" },
  { name: "Kiln", role: "Burns brass scrap.", effect: "Brass per minute" },
  { name: "Workshop", role: "Hardens tower coils.", effect: "Tower damage" },
  { name: "Depot", role: "Stores core spares.", effect: "Core capacity" },
];

export type EnemyCopy = {
  name: string;
  note: string;
};

export const ENEMIES: EnemyCopy[] = [
  { name: "Drudge", note: "Slow line filler." },
  { name: "Hound", note: "Fast and fragile." },
  { name: "Bulwark", note: "Armored. Rail Spike cuts it." },
  { name: "Mote", note: "Flies. Mortar cannot hit." },
  { name: "Cathedral", note: "Boss. Breaks six core." },
];

export type ContractCopy = {
  name: string;
  role: string;
  boon: string;
};

export const CONTRACTS: ContractCopy[] = [
  { name: "Cinder Survey", role: "Hounds and armor in the ash.", boon: "Ash Grit: +6% tower damage a stack." },
  { name: "Drowned Line", role: "Air and hulls over wet ground.", boon: "Brine Coil: +8% bounty a stack." },
  { name: "Glass Vigil", role: "A far boss holds the line.", boon: "Glass Tithe: +1 core capacity a stack." },
];

export const PREY = ["Reed hare", "Mud fowl", "Glass eel"];
export const PREDATORS = ["Mire cat", "Bog owl"];
export const SCAVENGER = "Ash crow";

export const ECO_CAUSES = [
  "Balanced.",
  "Water is low.",
  "Vegetation is low.",
  "Predators outnumber prey.",
  "Reed harvest opened light.",
  "Sluice raised the water.",
  "Cover planting held the soil.",
];

export const ECO_ACTIONS = [
  { name: "Open sluice", note: "Water up, soil down." },
  { name: "Plant cover", note: "Vegetation up, water down." },
  { name: "Harvest reed", note: "Brass now, cover later." },
];

export const AUTO_STATES = ["Idle", "Running", "Starved", "Blocked"];
export const AUTO_LOGS = [
  "No event yet.",
  "Line cast four shells.",
  "No ingots in stock.",
  "Output buffer is full.",
  "Rule repaired the core.",
  "Convoy delivered shells.",
  "Offline catch-up finished.",
  "Convoy left the line.",
  "Rule permission changed.",
];

export const DISTRICTS = [
  { name: "Switchyard", role: "The home gate." },
  { name: "Coldwater", role: "A wider flank." },
  { name: "Ashfall", role: "The far foundry." },
] as const;

export const COPY = {
  brand: "Brass Meridian",
  mode: "Open Frontier",
  boot: "Waking the line.",
  bootFail: "Could not start. Reload.",
  startLead: "The Switchyard is the last gate. Keep it standing.",
  startSteps: [
    "Build on any open plot.",
    "Towers reshape the enemy route.",
    "The city feeds the line.",
  ],
  startFoot: "One hand. Saves on this device.",
  begin: "Begin the watch",
  continue: "Continue",
  newRun: "New run",
  defeatTitle: "The line broke.",
  defeatLead: "Rebuild the Switchyard. The frontier keeps coming.",
  rebuild: "Rebuild",
  keepWatching: "Keep watching",
  build: "Build",
  city: "City",
  intel: "Intel",
  map: "Map",
  frontier: "Frontier",
  contracts: "Expeditions",
  contractFee: "Fee",
  contractPay: "Pays",
  contractRelic: "Relics",
  contractStart: "Launch",
  contractActive: "Run live",
  contractLeg: "Leg",
  contractDone: "Surveyed",
  contractNew: "New ground",
  contractNeed: "Need brass for the fee.",
  contractBusy: "Finish the wave first.",
  contractRun: "Expedition launched.",
  contractWon: "Expedition paid out.",
  contractLost: "Expedition lost. No pay.",
  boonStack: "Stacks to three.",
  marsh: "Coldwater marsh",
  marshHabitat: "Habitat",
  marshLife: "Life",
  marshCause: "Cause",
  marshDormant: "Dormant regions change at a quarter rate.",
  marshPay: "Reed sold.",
  marshDry: "Reed cover is too thin.",
  marshDone: "Marsh changed.",
  marshNeed: "Need brass for that work.",
  line: "Shell line",
  lineState: "Line",
  lineBuffer: "Buffer",
  lineMagazine: "Magazine",
  lineRule: "Core rule",
  lineRuleNote: "Repairs below 8 core. Keeps 100 brass.",
  lineDispatch: "Send convoy",
  lineOn: "Line on",
  lineOff: "Line off",
  lineRuleOn: "Rule on",
  lineRuleOff: "Rule off",
  lineSent: "Convoy left the line.",
  lineEmpty: "The buffer is empty.",
  lineMoving: "A convoy is already moving.",
  lineShells: "Shells add tower damage.",
  lineLog: "Last event",
  survey: "Survey map",
  surveyLead: "Paste a survey file. It is checked before play.",
  surveyLoad: "Validate and load",
  surveyExample: "Load example",
  surveyRestore: "Restore Ashfall",
  surveyNone: "Authored Ashfall.",
  surveyCustom: "Survey loaded",
  surveyRestored: "Ashfall restored.",
  surveyBad: "Survey refused",
  surveyNeedEmpty: "Clear Ashfall towers first.",
  surveyBudget: "Rubble budget",
  surveyBy: "By",
  here: "Here",
  travel: "Travel",
  mapFoot: "Tracks cost brass and build time. Meet the raid for a clear bonus.",
  mapLocked: "Finish the wave first.",
  trackMissing: "No track to that district.",
  noTrack: "No track",
  raid: "Raid",
  raidHeld: "Raid met. Clear bonus.",
  raidHit: "Raid leaked at",
  raidNote: "Meet the raid: +50% clear.",
  track: "Track",
  traveled: "Arrived at",
  close: "Close",
  brass: "Brass",
  ingots: "Ingots",
  core: "Core",
  wave: "Wave",
  buildPhase: "Build phase",
  waveLive: "Wave live",
  broken: "Broken",
  sendNow: "Send now",
  nextWave: "Next wave",
  threat: "Threat",
  online: "Online",
  paused: "Paused",
  resume: "Resume",
  speed: "Speed",
  sound: "Sound",
  soundOn: "Sound on.",
  soundOff: "Sound off.",
  save: "Save now",
  saved: "Saved.",
  reset: "Start over",
  resetAsk: "Start over?",
  placement: "Tap a plot to place",
  cancel: "Cancel",
  range: "Range",
  damage: "Damage",
  rate: "Shot",
  level: "Level",
  upgrade: "Upgrade",
  sell: "Sell",
  maxed: "Maxed",
  locked: "Locked",
  place: "Place",
  needBrass: "Need brass",
  repair: "Repair core",
  repairFull: "Core is whole.",
  route: "Route",
  steps: "steps",
  notBuilt: "Not built.",
  running: "Running.",
  cityFault: "City feeds the line.",
  towers: "Towers",
  kills: "Kills",
  score: "Score",
  waveReport: "Wave report",
  incoming: "Incoming",
  air: "Air",
  boss: "Boss",
  armor: "Armor",
  leak: "Leak",
  tip: "Tip",
  tipBody: "Towers block the route. Keep a way open.",
  tipBody2: "Mortar cannot hit air. Keep a Rail Spike.",
  tipBody3: "Ingots unlock tier three and city works.",
  open: "Open",
  noTower: "No tower selected.",
  noSave: "No save yet.",
  savedAt: "Autosave on.",
  tapPlot: "Tap a plot to raise a tower.",
  selectTower: "Tap a tower to inspect it.",
  coreTapped: "Switchyard core",
  waveSent: "Wave called early.",
  repaired: "Core repaired.",
  coreWhole: "Core is already whole.",
  built: "Raised",
  sold: "Tower sold.",
  upgraded: "Tower upgraded.",
  cityBuilt: "City works upgraded.",
  maxLevel: "Already maxed.",
  noBrass: "Not enough brass.",
  noIngots: "Not enough ingots.",
  saveFailed: "Save failed.",
  loadFailed: "That save could not be read.",
  loaded: "Save loaded.",
  fresh: "Fresh frontier.",
  pausedToast: "Paused.",
  resumedToast: "Running.",
  speedToast: "Speed",
} as const;
