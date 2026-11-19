import "./styles.css";
import { GameAudio } from "./audio";
import { COPY, DISTRICTS, TOWERS } from "./copy";
import { clearMapMeta, parseMap, saveMapMeta } from "./map";
import { hasSave, clearSave, loadGame, saveGame, secondsSinceSave } from "./save";
import { Sim, placeError, type Snapshot } from "./sim";
import { Hud, type HudModel } from "./ui";
import { Battlefield, type Cell } from "./view";

const canvas = document.getElementById("scene") as HTMLCanvasElement;
const hudRoot = document.getElementById("hud") as HTMLElement;
const boot = document.getElementById("boot");

const state = {
  started: false,
  paused: false,
  speed: 1,
  selected: -1,
  buildKind: null as number | null,
  hover: null as Cell | null,
  hoverOk: true,
  lastSave: 0,
};

let sim: Sim;
let world: Battlefield;
let hud: Hud;
const audio = new GameAudio();

function newSeed(): bigint {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  const value = (BigInt(values[1]) << 32n) | BigInt(values[0]);
  return value || 1n;
}

const model: HudModel = {
  towerCost: (kind) => sim.towerCost(kind),
  towerField: (index, field) => sim.towerInfo(index, field),
  sellValue: (index) => sim.sellValue(index),
  cityCost: (kind, level, ingots) => sim.cityCost(kind, level, ingots),
  previewCount: (kind) => sim.previewCount(kind),
  repairCost: () => sim.repairCost(),
  mapTowerCount: (map) => sim.mapTowerCount(map),
  trackCost: (map) => sim.trackCost(sim.snapshot().map, map),
  expedition: (field) => sim.expedition(field),
  expeditionContract: (contract, field) => sim.expeditionContract(contract, field),
  eco: (field) => sim.eco(field),
  automation: (field) => sim.automation(field),
  custom: (field) => sim.custom(field),
  clock: () => sim.clock(),
};

function cancelBuild() {
  state.buildKind = null;
  hud.hidePlacement();
}

function startBuild(kind: number) {
  state.buildKind = kind;
  state.selected = -1;
  hud.closeSheet();
  hud.showPlacement(TOWERS[kind].name, sim.towerCost(kind));
  refreshHover();
}

function refreshHover() {
  if (state.hover && state.buildKind !== null) {
    state.hoverOk = sim.canPlace(state.hover.gx, state.hover.gz, state.buildKind) === 0;
  } else {
    state.hoverOk = true;
  }
}

function attemptPlace(cell: Cell) {
  if (state.buildKind === null) return;
  const kind = state.buildKind;
  const code = sim.place(cell.gx, cell.gz, kind);
  if (code === 0) {
    audio.build();
    hud.showToast(`${TOWERS[kind].name}: ${COPY.built.toLowerCase()}.`, "good");
    if (sim.snapshot().brass < sim.towerCost(kind)) cancelBuild();
  } else {
    hud.showToast(placeError(code), "bad");
  }
  refreshHover();
}

function onTap(cell: Cell) {
  if (!state.started) return;
  if (state.buildKind !== null) {
    attemptPlace(cell);
    return;
  }
  const index = sim.towerAt(cell.gx, cell.gz);
  if (index >= 0) {
    state.selected = index;
    hud.openTower(index);
    return;
  }
  state.selected = -1;
  if (cell.gx === 0 && cell.gz === 6) {
    hud.openSheet("intel");
    return;
  }
  if (sim.cellState(cell.gx, cell.gz) !== 1) hud.showToast(COPY.tapPlot);
}

function beginRun(label?: string) {
  state.started = true;
  state.paused = false;
  state.speed = 1;
  state.selected = -1;
  state.buildKind = null;
  hud.hideCurtain();
  hud.hidePlacement();
  hud.closeSheet();
  if (label) hud.showToast(label, "good");
}

function newRun() {
  sim.init(newSeed());
  clearSave();
  state.lastSave = 0;
  beginRun(COPY.fresh);
}

function buildHud(hasSaved: boolean) {
  hud = new Hud(hudRoot, model, {
    onBegin: () => beginRun(),
    onContinue: () => beginRun(COPY.loaded),
    onNewRun: newRun,
    onBuild: (kind) => startBuild(kind),
    onUpgrade: () => {
      if (state.selected < 0) return;
      const code = sim.upgrade(state.selected);
      if (code === 0) {
        audio.upgrade();
        hud.showToast(COPY.upgraded, "good");
        hud.setSelected(state.selected);
      } else {
        hud.showToast(code === -2 ? COPY.maxLevel : COPY.noBrass, "bad");
      }
    },
    onSell: () => {
      if (state.selected < 0) return;
      const refund = sim.sell(state.selected);
      if (refund >= 0) {
        audio.build();
        hud.showToast(`${COPY.sold} +${refund}`, "good");
        state.selected = -1;
        hud.closeSheet();
      }
    },
    onCity: (kind) => {
      const code = sim.buildCity(kind);
      if (code === 0) {
        audio.upgrade();
        hud.showToast(COPY.cityBuilt, "good");
        hud.openSheet("city");
      } else {
        hud.showToast(code === -2 ? COPY.maxLevel : code === -3 ? COPY.noBrass : COPY.noIngots, "bad");
      }
    },
    onMap: (map) => {
      const code = sim.switchMap(map);
      if (code === 0) {
        state.selected = -1;
        state.buildKind = null;
        state.hover = null;
        hud.hidePlacement();
        hud.closeSheet();
        hud.showToast(`${COPY.traveled} ${DISTRICTS[map].name}.`, "good");
        refreshHover();
      } else if (code === -2) {
        hud.showToast(COPY.mapLocked, "bad");
      } else if (code === -3) {
        hud.showToast(COPY.trackMissing, "bad");
      } else if (code === -4) {
        hud.showToast(COPY.noBrass, "bad");
      }
    },
    onWorldStep: (dx, dz) => {
      const code = sim.worldStep(dx, dz);
      hud.showToast(code === 0 ? COPY.worldMoved : COPY.worldEdge, code === 0 ? "good" : "bad");
      hud.openSheet("map");
      refreshHover();
    },
    onRepair: () => {
      const code = sim.repair();
      if (code === 0) {
        audio.upgrade();
        hud.showToast(COPY.repaired, "good");
        hud.openSheet("intel");
      } else {
        hud.showToast(code === -2 ? COPY.coreWhole : COPY.noBrass, "bad");
      }
    },
    onCall: () => {
      const snap = sim.snapshot();
      if (!snap.canCall) return;
      const bonus = Math.ceil(Math.max(0, snap.countdown) * 2);
      if (sim.callWave() === 0) {
        audio.wave();
        hud.showToast(`${COPY.waveSent} +${bonus}`, "good");
      }
    },
    onPause: () => {
      if (!state.started) return;
      state.paused = !state.paused;
      hud.showToast(state.paused ? COPY.pausedToast : COPY.resumedToast);
    },
    onSpeed: () => {
      state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
      hud.showToast(`${COPY.speedToast} ${state.speed}×`);
    },
    onSound: () => {
      const on = audio.toggle();
      hud.showToast(on ? COPY.soundOn : COPY.soundOff);
    },
    onSave: () => {
      const ok = saveGame(sim);
      hud.showToast(ok ? COPY.saved : COPY.saveFailed, ok ? "good" : "bad");
    },
    onReset: () => newRun(),
    onClose: () => {
      state.selected = -1;
    },
    onCancelBuild: cancelBuild,
    onStartExpedition: (contract) => {
      const code = sim.startExpedition(contract);
      if (code === 0) {
        audio.wave();
        hud.showToast(COPY.contractRun, "good");
        hud.openSheet("map");
      } else {
        hud.showToast(code === -4 ? COPY.contractNeed : COPY.contractBusy, "bad");
      }
    },
    onEco: (kind) => {
      const code = sim.ecoAction(kind);
      if (code >= 0) {
        if (kind === 2) hud.showToast(`${COPY.marshPay} +${code}`, "good");
        else hud.showToast(COPY.marshDone, "good");
      } else if (code === -5) {
        hud.showToast(COPY.marshDry, "bad");
      } else {
        hud.showToast(COPY.marshNeed, "bad");
      }
      hud.openSheet("city");
    },
    onAutoToggle: (kind) => {
      sim.autoToggle(kind);
      hud.showToast(kind === 0 ? COPY.line : COPY.lineRule, "good");
      hud.openSheet("city");
    },
    onConvoy: () => {
      const code = sim.convoy();
      if (code === 0) hud.showToast(COPY.lineSent, "good");
      else hud.showToast(code === -3 ? COPY.lineMoving : COPY.lineEmpty, "bad");
      hud.openSheet("city");
    },
    onImportMap: (text) => {
      const check = parseMap(text);
      if (!check.ok || !check.binary || !check.map) {
        hud.showToast(`${COPY.surveyBad}: ${check.message}`, "bad");
        return;
      }
      const code = sim.importMap(check.binary);
      if (code === 0) {
        saveMapMeta(check.map);
        hud.showToast(check.message, "good");
        hud.openSheet("map");
      } else if (code === -4) {
        hud.showToast(COPY.surveyNeedEmpty, "bad");
      } else {
        hud.showToast(`${COPY.surveyBad}: ${code}`, "bad");
      }
    },
    onRestoreMap: () => {
      const code = sim.clearMap();
      if (code === 0) {
        clearMapMeta();
        hud.showToast(COPY.surveyRestored, "good");
      }
      hud.openSheet("map");
    },
  });
  hud.showStart(hasSaved);
}

function installWorld() {
  world = new Battlefield(canvas);
  world.onTap = onTap;
  world.onHover = (cell) => {
    state.hover = cell;
    refreshHover();
  };
}

function frame(now: number) {
  const previous = lastSnapshot;
  const elapsed = lastTime ? Math.min(120, now - lastTime) : 16;
  lastTime = now;
  if (state.started && !state.paused && previous.phase !== 2) {
    sim.step(elapsed * state.speed);
  }
  const snap = sim.snapshot();
  lastSnapshot = snap;
  if (state.selected >= snap.towers.length) state.selected = -1;

  if (snap.core < previous.core - 0.001) audio.leak();
  if (previous.phase === 0 && snap.phase === 1) audio.wave();
  if (snap.phase === 1 && previous.phase !== 1 && snap.wave !== lastRaidWave) {
    lastRaidWave = snap.wave;
    if (snap.map === snap.threatDistrict) hud.showToast(COPY.raidHeld, "good");
    else hud.showToast(`${COPY.raidHit} ${DISTRICTS[snap.threatDistrict].name}.`, "bad");
  }
  if (previous.phase === 1 && snap.phase === 0) {
    audio.clear();
    hud.showToast(`${COPY.wave} ${previous.wave} held.`, "good");
  }
  const expeditionLive = sim.expedition(0) > 0.5;
  if (lastExpedition && !expeditionLive) {
    hud.showToast(sim.expedition(3) === 1 ? COPY.contractWon : COPY.contractLost, sim.expedition(3) === 1 ? "good" : "bad");
  }
  lastExpedition = expeditionLive;
  if (snap.phase === 2 && previous.phase !== 2) {
    audio.defeat();
    cancelBuild();
    state.selected = -1;
    hud.hidePlacement();
    hud.closeSheet();
    hud.showDefeat(snap.wave, snap.score);
  }
  if (state.started && snap.phase !== 2 && now - state.lastSave > 10_000) {
    state.lastSave = now;
    saveGame(sim);
  }

  hud.update(snap, {
    started: state.started,
    sound: audio.on,
    speed: state.speed,
    paused: state.paused,
  });
  world.update({
    snapshot: snap,
    selectedTower: state.selected >= 0 ? state.selected : null,
    buildKind: state.buildKind,
    hover: state.hover,
    hoverOk: state.hoverOk,
    paused: state.paused,
  });
  requestAnimationFrame(frame);
}

let lastSnapshot: Snapshot;
let lastTime = 0;
let lastRaidWave = 0;
let lastExpedition = false;

async function main() {
  try {
    sim = await Sim.load();
  } catch (error) {
    console.error(error);
    if (boot) {
      boot.innerHTML = `<div class="boot-mark" aria-hidden="true"></div><p class="boot-title">${COPY.brand}</p><p class="boot-line">${COPY.bootFail}</p>`;
    }
    return;
  }

  const offered = hasSave();
  const resumed = offered && loadGame(sim);
  let offlineGain = 0;
  if (resumed) offlineGain = sim.offline(secondsSinceSave());
  if (!resumed) {
    sim.init(newSeed());
    if (offered) clearSave();
  }
  installWorld();
  buildHud(offered && resumed);
  if (offlineGain > 0) hud.showToast(`${COPY.lineLog}: +${Math.round(offlineGain)} shells.`, "good");
  lastSnapshot = sim.snapshot();
  hud.update(lastSnapshot, { started: false, sound: false, speed: 1, paused: false });

  if (boot) {
    boot.classList.add("gone");
    window.setTimeout(() => boot.remove(), 700);
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (state.buildKind !== null) cancelBuild();
      else hud.closeSheet();
    }
    if (event.key === "p" || event.key === "P") {
      if (state.started) {
        state.paused = !state.paused;
        hud.showToast(state.paused ? COPY.pausedToast : COPY.resumedToast);
      }
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.started && lastSnapshot.phase !== 2) saveGame(sim);
  });

  requestAnimationFrame(frame);
}

void main();
