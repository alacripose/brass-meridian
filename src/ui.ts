import {
  AUTO_LOGS,
  AUTO_STATES,
  CITY,
  CONTRACTS,
  COPY,
  DISTRICTS,
  ECO_ACTIONS,
  ECO_CAUSES,
  ENEMIES,
  PREDATORS,
  PREY,
  SCAVENGER,
  SEASONS,
  TOWERS,
} from "./copy";
import { exampleMap, loadMapMeta, MAP_BUDGET } from "./map";
import type { ClockView, Snapshot } from "./sim";

export type HudModel = {
  towerCost: (kind: number) => number;
  towerField: (index: number, field: number) => number;
  sellValue: (index: number) => number;
  cityCost: (kind: number, level: number, ingots: number) => number;
  previewCount: (kind: number) => number;
  repairCost: () => number;
  mapTowerCount: (map: number) => number;
  trackCost: (map: number) => number;
  expedition: (field: number) => number;
  expeditionContract: (contract: number, field: number) => number;
  eco: (field: number) => number;
  automation: (field: number) => number;
  custom: (field: number) => number;
  clock: () => ClockView;
};

export type HudActions = {
  onBegin: () => void;
  onContinue: () => void;
  onNewRun: () => void;
  onBuild: (kind: number) => void;
  onUpgrade: () => void;
  onSell: () => void;
  onCity: (kind: number) => void;
  onMap: (map: number) => void;
  onWorldStep: (dx: number, dz: number) => void;
  onRepair: () => void;
  onCall: () => void;
  onPause: () => void;
  onSpeed: () => void;
  onSound: () => void;
  onSave: () => void;
  onReset: () => void;
  onClose: () => void;
  onCancelBuild: () => void;
  onStartExpedition: (contract: number) => void;
  onEco: (kind: number) => void;
  onAutoToggle: (kind: number) => void;
  onConvoy: () => void;
  onImportMap: (text: string) => void;
  onRestoreMap: () => void;
};

type SheetKind = "build" | "tower" | "city" | "map" | "intel";

const money = (n: number) => Math.floor(Math.max(0, n)).toLocaleString("en-US");

export class Hud {
  private readonly root: HTMLElement;
  private readonly model: HudModel;
  private readonly actions: HudActions;
  private readonly sheet: HTMLElement;
  private readonly sheetTitle: HTMLElement;
  private readonly sheetBody: HTMLElement;
  private readonly curtain: HTMLElement;
  private readonly placement: HTMLElement;
  private readonly placementText: HTMLElement;
  private readonly toastEl: HTMLElement;
  private sheetKind: SheetKind | null = null;
  private selected = -1;
  private snap: Snapshot | null = null;
  private toastTimer = 0;
  private resetArmed = false;
  private resetTimer = 0;

  constructor(root: HTMLElement, model: HudModel, actions: HudActions) {
    this.root = root;
    this.model = model;
    this.actions = actions;
    root.innerHTML = this.template();
    this.sheet = this.find(".sheet");
    this.sheetTitle = this.find("[data-k=sheetTitle]");
    this.sheetBody = this.find("[data-k=sheetBody]");
    this.curtain = this.find(".curtain");
    this.placement = this.find(".placement");
    this.placementText = this.find("[data-k=placementText]");
    this.toastEl = this.find(".toast");
    root.addEventListener("click", (event) => this.onClick(event));
  }

  private find<T extends HTMLElement>(selector: string): T {
    const found = this.root.querySelector<T>(selector);
    if (!found) throw new Error(`HUD element missing: ${selector}`);
    return found;
  }

  private template(): string {
    return `
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true"></span>
          <div>
            <b>${COPY.brand}</b>
            <small>${COPY.mode}</small>
          </div>
        </div>
        <div class="stats">
          <span class="stat brass"><i aria-hidden="true"></i><b data-k="brass">0</b></span>
          <span class="stat ingot"><i aria-hidden="true"></i><b data-k="ingots">0</b></span>
        </div>
        <div class="core">
          <span class="core-label">${COPY.core}</span>
          <div class="core-track"><i data-k="corebar"></i></div>
          <b data-k="core">20</b>
        </div>
        <div class="top-actions">
          <button type="button" class="icon" data-act="sound" aria-label="${COPY.sound}" data-k="sound">♪</button>
          <button type="button" class="icon" data-act="pause" aria-label="${COPY.paused}" data-k="pause">Ⅱ</button>
          <button type="button" class="speed" data-act="speed" data-k="speed">1×</button>
        </div>
      </header>

      <div class="wavebar">
        <div class="wave-meta">
          <span class="eyebrow">${COPY.wave} <b data-k="wave">1</b></span>
          <span class="wave-state" data-k="waveState">${COPY.buildPhase}</span>
          <span class="clock" data-k="clock">DAY 1 00:00</span>
        </div>
        <div class="wave-track"><i data-k="wavefill"></i></div>
        <button type="button" class="call" data-act="call" data-k="call">
          <span>${COPY.sendNow}</span><small data-k="bonus">+0</small>
        </button>
      </div>

      <div class="placement" hidden>
        <span data-k="placementText"></span>
        <button type="button" class="tiny" data-act="cancelBuild">${COPY.cancel}</button>
      </div>

      <div class="dock" role="tablist" aria-label="${COPY.build}">
        <button type="button" class="dock-btn" data-act="tab-build" aria-pressed="false">
          <i class="dock-mark build" aria-hidden="true"></i><span>${COPY.build}</span>
        </button>
        <button type="button" class="dock-btn" data-act="tab-city" aria-pressed="false">
          <i class="dock-mark city" aria-hidden="true"></i><span>${COPY.city}</span>
        </button>
        <button type="button" class="dock-btn" data-act="tab-map" aria-pressed="false">
          <i class="dock-mark map" aria-hidden="true"></i><span>${COPY.map}</span>
        </button>
        <button type="button" class="dock-btn" data-act="tab-intel" aria-pressed="false">
          <i class="dock-mark intel" aria-hidden="true"></i><span>${COPY.intel}</span>
        </button>
      </div>

      <section class="sheet" hidden aria-label="${COPY.build}">
        <div class="sheet-grip" aria-hidden="true"></div>
        <header class="sheet-head">
          <div>
            <span class="eyebrow">Popit</span>
            <h2 data-k="sheetTitle">${COPY.build}</h2>
          </div>
          <button type="button" class="icon close" data-act="close" aria-label="${COPY.close}">×</button>
        </header>
        <div class="sheet-body" data-k="sheetBody"></div>
      </section>

      <div class="toast" role="status" aria-live="polite"></div>
      <div class="curtain" role="dialog" aria-modal="true"></div>
    `;
  }

  showStart(hasSave: boolean): void {
    const actions = hasSave
      ? `<button type="button" class="primary" data-act="continue">${COPY.continue}</button>
         <button type="button" class="ghost" data-act="newrun">${COPY.newRun}</button>`
      : `<button type="button" class="primary" data-act="begin">${COPY.begin}</button>`;
    this.curtain.innerHTML = `
      <div class="curtain-card start">
        <span class="brand-mark large" aria-hidden="true"></span>
        <span class="eyebrow">${COPY.mode}</span>
        <h1>${COPY.brand}</h1>
        <p class="lead">${COPY.startLead}</p>
        <ol class="start-list">${COPY.startSteps.map((s) => `<li>${s}</li>`).join("")}</ol>
        <div class="curtain-actions">${actions}</div>
        <p class="foot">${COPY.startFoot}</p>
      </div>`;
    this.curtain.classList.add("show");
  }

  showDefeat(wave: number, score: number): void {
    this.curtain.innerHTML = `
      <div class="curtain-card">
        <span class="brand-mark large" aria-hidden="true"></span>
        <span class="eyebrow">${COPY.wave} ${wave} · ${COPY.score} ${money(score)}</span>
        <h1>${COPY.defeatTitle}</h1>
        <p class="lead">${COPY.defeatLead}</p>
        <div class="curtain-actions">
          <button type="button" class="primary" data-act="rebuild">${COPY.rebuild}</button>
          <button type="button" class="ghost" data-act="dismiss">${COPY.keepWatching}</button>
        </div>
      </div>`;
    this.curtain.classList.add("show");
  }

  hideCurtain(): void {
    this.curtain.classList.remove("show");
  }

  private onClick(event: MouseEvent): void {
    const el = (event.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!el) return;
    const act = el.dataset.act;
    const kind = Number(el.dataset.kind ?? "-1");
    switch (act) {
      case "begin":
        this.actions.onBegin();
        break;
      case "continue":
        this.actions.onContinue();
        break;
      case "newrun":
      case "rebuild":
        this.actions.onNewRun();
        break;
      case "dismiss":
        this.hideCurtain();
        break;
      case "close":
        this.closeSheet();
        break;
      case "tab-build":
        this.openSheet("build");
        break;
      case "tab-city":
        this.openSheet("city");
        break;
      case "tab-map":
        this.openSheet("map");
        break;
      case "tab-intel":
        this.openSheet("intel");
        break;
      case "build":
        this.actions.onBuild(kind);
        break;
      case "upgrade":
        this.actions.onUpgrade();
        break;
      case "sell":
        this.actions.onSell();
        break;
      case "city":
        this.actions.onCity(kind);
        break;
      case "travel":
        this.actions.onMap(kind);
        break;
      case "seat":
        this.actions.onWorldStep(
          Number(el.dataset.dx ?? 0),
          Number(el.dataset.dz ?? 0),
        );
        break;
      case "repair":
        this.actions.onRepair();
        break;
      case "call":
        this.actions.onCall();
        break;
      case "pause":
        this.actions.onPause();
        break;
      case "speed":
        this.actions.onSpeed();
        break;
      case "sound":
        this.actions.onSound();
        break;
      case "save":
        this.actions.onSave();
        break;
      case "reset":
        if (!this.resetArmed) {
          this.resetArmed = true;
          el.textContent = COPY.resetAsk;
          window.clearTimeout(this.resetTimer);
          this.resetTimer = window.setTimeout(() => {
            this.resetArmed = false;
            if (this.sheetKind === "intel") this.renderSheet();
          }, 2600);
        } else {
          this.resetArmed = false;
          this.actions.onReset();
        }
        break;
      case "cancelBuild":
        this.actions.onCancelBuild();
        break;
      case "startExpedition":
        this.actions.onStartExpedition(kind);
        break;
      case "eco":
        this.actions.onEco(kind);
        break;
      case "autoToggle":
        this.actions.onAutoToggle(kind);
        break;
      case "convoy":
        this.actions.onConvoy();
        break;
      case "surveyLoad": {
        const field = this.sheetBody.querySelector<HTMLTextAreaElement>(".survey-text");
        this.actions.onImportMap(field?.value ?? "");
        break;
      }
      case "surveyExample": {
        const field = this.sheetBody.querySelector<HTMLTextAreaElement>(".survey-text");
        if (field) field.value = exampleMap();
        break;
      }
      case "surveyRestore":
        this.actions.onRestoreMap();
        break;
      default:
        break;
    }
  }

  private setSheetTab(kind: SheetKind | null) {
    for (const [act, tab] of [
      ["tab-build", "build"],
      ["tab-city", "city"],
      ["tab-map", "map"],
      ["tab-intel", "intel"],
    ] as const) {
      const button = this.root.querySelector<HTMLElement>(`[data-act="${act}"]`);
      if (button) button.setAttribute("aria-pressed", String(kind === tab));
    }
  }

  openSheet(kind: SheetKind, selected = -1): void {
    this.sheetKind = kind;
    this.selected = selected;
    this.sheet.hidden = false;
    this.renderSheet();
    this.setSheetTab(kind);
    requestAnimationFrame(() => this.sheet.classList.add("open"));
  }

  openTower(index: number): void {
    this.openSheet("tower", index);
  }

  closeSheet(): void {
    this.sheet.classList.remove("open");
    this.sheetKind = null;
    this.setSheetTab(null);
    window.setTimeout(() => {
      if (!this.sheet.classList.contains("open")) this.sheet.hidden = true;
    }, 180);
    this.actions.onClose();
  }

  showPlacement(name: string, cost: number): void {
    this.placementText.textContent = `${COPY.placement}: ${name} · ${money(cost)}`;
    this.placement.hidden = false;
  }

  hidePlacement(): void {
    this.placement.hidden = true;
  }

  showToast(text: string, tone: "good" | "bad" | "info" = "info"): void {
    this.toastEl.textContent = text;
    this.toastEl.dataset.tone = tone;
    this.toastEl.classList.add("show");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove("show"), 2100);
  }

  setSelected(index: number): void {
    this.selected = index;
    if (this.sheetKind === "tower") this.renderSheet();
  }

  update(snap: Snapshot, state: { started: boolean; sound: boolean; speed: number; paused: boolean }): void {
    this.snap = snap;
    const set = (key: string, value: string) => {
      const node = this.root.querySelector<HTMLElement>(`[data-k="${key}"]`);
      if (node) node.textContent = value;
    };
    set("brass", money(snap.brass));
    set("ingots", money(snap.ingots));
    set("core", `${Math.ceil(snap.core)}`);
    const bar = this.root.querySelector<HTMLElement>('[data-k="corebar"]');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, (snap.core / Math.max(1, snap.coreMax)) * 100))}%`;
    set("wave", `${snap.wave}`);
    const clock = this.model.clock();
    const season = SEASONS[Math.max(0, Math.min(SEASONS.length - 1, clock.season))];
    set(
      "clock",
      `DAY ${clock.day} ${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")} · ${season.name}`,
    );

    let stateText: string = COPY.buildPhase;
    if (snap.phase === 1) stateText = `${COPY.raid}: ${DISTRICTS[snap.threatDistrict].name}`;
    if (snap.phase === 2) stateText = COPY.broken;
    if (!state.started) stateText = COPY.mode;
    set("waveState", stateText);

    const call = this.root.querySelector<HTMLButtonElement>('[data-act="call"]');
    if (call) call.disabled = !snap.canCall || !state.started;
    set(
      "bonus",
      snap.canCall
        ? `+${Math.ceil(Math.max(0, snap.countdown) * 2)}`
        : `${snap.enemiesAlive + snap.spawnLeft} left`,
    );

    const fill = this.root.querySelector<HTMLElement>('[data-k="wavefill"]');
    if (fill) {
      const total = Math.max(1, snap.waveTotal);
      fill.style.width = `${Math.max(4, Math.min(100, ((total - snap.spawnLeft) / total) * 100))}%`;
    }

    const sound = this.root.querySelector<HTMLElement>('[data-k="sound"]');
    if (sound) sound.dataset.on = String(state.sound);
    const pause = this.root.querySelector<HTMLElement>('[data-k="pause"]');
    if (pause) pause.textContent = state.paused ? "▶" : "Ⅱ";
    set("speed", `${state.speed}×`);

    this.refreshButtons();
    if (this.sheetKind === "tower" && !state.started) this.closeSheet();
  }

  private refreshButtons(): void {
    const snap = this.snap;
    if (!snap) return;
    for (const button of this.root.querySelectorAll<HTMLButtonElement>("[data-need-brass]")) {
      if (button.dataset.maxed === "1") {
        button.disabled = true;
        continue;
      }
      const need = Number(button.dataset.needBrass ?? "0");
      button.disabled = snap.brass < need || snap.ingots < Number(button.dataset.needIngots ?? "0");
    }
  }

  private renderSheet(): void {
    const snap = this.snap;
    if (!snap || !this.sheetKind) return;
    if (this.sheetKind === "tower") {
      const tower = snap.towers[this.selected];
      if (!tower) {
        this.sheetKind = null;
        this.sheet.classList.remove("open");
        return;
      }
    }
    const sheetLabel =
      this.sheetKind === "build"
        ? COPY.build
        : this.sheetKind === "city"
          ? COPY.city
          : this.sheetKind === "map"
            ? COPY.frontier
          : this.sheetKind === "intel"
            ? COPY.intel
            : TOWERS[snap.towers[this.selected].kind].name;
    this.sheetTitle.textContent = sheetLabel;
    this.sheet.setAttribute("aria-label", sheetLabel);
    this.sheetBody.innerHTML =
      this.sheetKind === "build"
        ? this.buildSheet(snap)
        : this.sheetKind === "city"
          ? this.citySheet(snap)
          : this.sheetKind === "map"
            ? this.mapSheet(snap)
          : this.sheetKind === "intel"
            ? this.intelSheet(snap)
            : this.towerSheet(snap);
    this.refreshButtons();
  }

  private buildSheet(snap: Snapshot): string {
    return `<div class="cards">${TOWERS.map((tower, kind) => {
      const cost = Math.round(this.model.towerCost(kind));
      const disabled = snap.brass < cost ? "disabled" : "";
      return `<article class="card">
        <div class="card-top"><span class="tag">${tower.tag}</span><span class="cost">${money(cost)}<i class="brass-dot" aria-hidden="true"></i></span></div>
        <h3>${tower.name}</h3>
        <p>${tower.role}</p>
        <span class="hint">${tower.hint}</span>
        <button type="button" class="primary" data-act="build" data-kind="${kind}" data-need-brass="${cost}" ${disabled}>
          ${COPY.place} · ${money(cost)}
        </button>
      </article>`;
    }).join("")}</div>`;
  }

  private towerSheet(snap: Snapshot): string {
    const tower = snap.towers[this.selected];
    const copy = TOWERS[tower.kind];
    const maxed = tower.level >= 2;
    const upBrass = this.model.towerField(this.selected, 5);
    const upIngots = this.model.towerField(this.selected, 6);
    const sell = this.model.sellValue(this.selected);
    const disabled = maxed || snap.brass < upBrass || snap.ingots < upIngots ? "disabled" : "";
    const upgradeLabel = maxed
      ? COPY.maxed
      : `${COPY.upgrade} · ${money(upBrass)}${upIngots > 0 ? ` + ${money(upIngots)}i` : ""}`;
    const slow = this.model.towerField(this.selected, 3);
    return `
      <div class="tower-head">
        <div><span class="tag">${copy.tag}</span><h3>${copy.name}</h3><p>${copy.role}</p></div>
        <div class="level">${"◆".repeat(tower.level + 1)}${"◇".repeat(2 - tower.level)}</div>
      </div>
      <div class="stat-grid">
        <div><span>${COPY.damage}</span><b>${Math.round(tower.damage)}</b></div>
        <div><span>${COPY.range}</span><b>${tower.range.toFixed(1)}</b></div>
        <div><span>${COPY.rate}</span><b>${tower.rate.toFixed(2)}s</b></div>
        <div><span>Slow</span><b>${slow > 0 ? `${Math.round(slow * 100)}%` : "—"}</b></div>
      </div>
      <div class="row-actions">
        <button type="button" class="primary" data-act="upgrade" ${maxed ? 'data-maxed="1"' : `data-need-brass="${Math.round(upBrass)}" data-need-ingots="${Math.round(upIngots)}"`} ${disabled}>${upgradeLabel}</button>
        <button type="button" class="ghost" data-act="sell">${COPY.sell} +${money(sell)}</button>
      </div>
      <p class="foot">${COPY.tapPlot}</p>`;
  }

  private citySheet(snap: Snapshot): string {
    return `<div class="city-list">${CITY.map((building, kind) => {
      const level = snap.city[kind];
      const max = level >= snap.cityMax;
      const brass = this.model.cityCost(kind, level, 0);
      const ingots = this.model.cityCost(kind, level, 1);
      const effect =
        kind === 0
          ? `${Math.round(snap.ingotRate)} / min`
          : kind === 1
            ? `${Math.round(snap.brassRate)} / min`
            : kind === 2
              ? `+${Math.round(snap.city[2] * 7)}%`
              : `${Math.round(snap.coreMax)} ${COPY.core.toLowerCase()}`;
      const disabled = max || snap.brass < brass || snap.ingots < ingots ? "disabled" : "";
      return `<article class="city-row">
        <div class="city-main">
          <div class="city-title"><h3>${building.name}</h3><span class="pips">${[0, 1, 2].map((i) => `<i class="${i < level ? "full" : ""}"></i>`).join("")}</span></div>
          <p>${building.role}</p>
          <div class="city-facts"><span>${building.effect} <b>${effect}</b></span><span class="${level > 0 ? "ok" : ""}">${level > 0 ? COPY.running : COPY.notBuilt}</span></div>
        </div>
        <button type="button" class="primary compact" data-act="city" data-kind="${kind}" ${max ? 'data-maxed="1"' : `data-need-brass="${Math.round(brass)}" data-need-ingots="${Math.round(ingots)}"`} ${disabled}>
          ${max ? COPY.maxed : `${level === 0 ? COPY.build : COPY.upgrade} · ${money(brass)}${ingots > 0 ? ` + ${money(ingots)}i` : ""}`}
        </button>
      </article>`;
    }).join("")}</div>${this.lineCard(snap)}${this.marshCard(snap)}`;
  }

  private lineCard(_snap: Snapshot): string {
    const state = Math.round(this.model.automation(0));
    const buffer = this.model.automation(1);
    const shells = this.model.automation(2);
    const convoy = this.model.automation(3) > 0.5;
    const eta = this.model.automation(4);
    const on = this.model.automation(5) > 0.5;
    const rule = this.model.automation(6) > 0.5;
    const log = Math.round(this.model.automation(7));
    const stateText = convoy ? `Convoy ${eta.toFixed(1)}s` : AUTO_STATES[Math.max(0, Math.min(3, state))];
    const bufferPct = Math.min(100, (buffer / 6) * 100);
    const shellPct = Math.min(100, (shells / 40) * 100);
    return `<section class="subblock">
      <div class="subhead"><span class="micro">${COPY.line}</span><span class="tag ${state === 3 ? "danger" : state === 1 ? "good" : ""}">${stateText}</span></div>
      <div class="line-grid">
        <div><span>${COPY.lineBuffer}</span><b>${buffer.toFixed(0)} / 6</b><i class="meter"><em style="width:${bufferPct}%"></em></i></div>
        <div><span>${COPY.lineMagazine}</span><b>${shells.toFixed(0)}</b><i class="meter"><em style="width:${shellPct}%"></em></i></div>
      </div>
      <p class="micro">${COPY.lineShells} +${Math.min(40, Math.round(shells))}%</p>
      <div class="row-actions wrap">
        <button type="button" class="ghost compact" data-act="autoToggle" data-kind="0">${on ? COPY.lineOn : COPY.lineOff}</button>
        <button type="button" class="ghost compact" data-act="autoToggle" data-kind="1">${rule ? COPY.lineRuleOn : COPY.lineRuleOff}</button>
        <button type="button" class="primary compact" data-act="convoy" ${convoy || buffer < 1 ? "disabled" : ""}>${COPY.lineDispatch}</button>
      </div>
      <p class="micro">${COPY.lineRule}: ${COPY.lineRuleNote}</p>
      <p class="foot">${COPY.lineLog}: ${AUTO_LOGS[Math.max(0, Math.min(AUTO_LOGS.length - 1, log))]}</p>
    </section>`;
  }

  private marshCard(_snap: Snapshot): string {
    const soil = this.model.eco(0);
    const water = this.model.eco(1);
    const veg = this.model.eco(2);
    const prey = [this.model.eco(3), this.model.eco(4), this.model.eco(5)];
    const pred = [this.model.eco(6), this.model.eco(7)];
    const scav = this.model.eco(8);
    const cause = Math.round(this.model.eco(9));
    const row = (name: string, value: number, max: number) =>
      `<div class="eco-row"><span>${name}</span><i class="meter"><em style="width:${Math.min(100, (value / max) * 100)}%"></em></i><b>${Math.round(value)}</b></div>`;
    return `<section class="subblock">
      <div class="subhead"><span class="micro">${COPY.marsh}</span><span class="tag">${COPY.marshHabitat}</span></div>
      <div class="eco-grid">
        <div>${row("Soil", soil, 100)}${row("Water", water, 100)}${row("Cover", veg, 100)}</div>
        <div>${PREY.map((name, i) => row(name, prey[i], 120)).join("")}${PREDATORS.map((name, i) => row(name, pred[i], 60)).join("")}${row(SCAVENGER, scav, 40)}</div>
      </div>
      <p class="micro">${COPY.marshCause}: ${ECO_CAUSES[Math.max(0, Math.min(ECO_CAUSES.length - 1, cause))]} ${COPY.marshDormant}</p>
      <div class="row-actions wrap">
        ${ECO_ACTIONS.map((action, kind) => {
          const cost = kind === 0 ? 10 : kind === 1 ? 12 : 0;
          return `<button type="button" class="ghost compact" data-act="eco" data-kind="${kind}" ${cost > 0 ? `data-need-brass="${cost}"` : ""}>${action.name}</button>`;
        }).join("")}
      </div>
    </section>`;
  }

  private mapSheet(snap: Snapshot): string {
    const spots: Array<[number, number]> = [
      [160, 90],
      [300, 90],
      [160, 32],
      [160, 148],
      [230, 90],
      [90, 90],
    ];
    const threat = Math.max(0, Math.min(DISTRICTS.length - 1, Math.round(snap.threatDistrict)));
    const [tx, ty] = spots[threat];
    const lines = [
      [5, 0, 20],
      [0, 4, 20],
      [4, 1, 14],
      [2, 0, 16],
      [3, 0, 18],
    ]
      .map(([a, b, cost]) => {
        const [x1, y1] = spots[a];
        const [x2, y2] = spots[b];
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="track-line"/>
          <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" class="track-cost">${cost}</text>`;
      })
      .join("");
    const nodes = DISTRICTS.map((district, id) => {
      const [x, y] = spots[id];
      const cls = id === snap.map ? "here" : id === threat ? "raid" : "";
      return `<circle cx="${x}" cy="${y}" r="11" class="track-node ${cls}"/>
        <text x="${x}" y="${y + 24}" class="track-name">${district.name}</text>`;
    }).join("");
    const cards = DISTRICTS.map((district, id) => {
      const here = snap.map === id;
      const raid = threat === id;
      const towers = Math.round(this.model.mapTowerCount(id));
      const cost = Math.round(this.model.trackCost(id));
      const linked = cost >= 0;
      const disabled = here || snap.phase !== 0 || !linked || snap.brass < cost;
      const tag = here ? COPY.here : raid ? COPY.raid : COPY.open;
      const label = here ? COPY.here : linked ? `${COPY.travel} · ${money(cost)}` : COPY.noTrack;
      return `<article class="city-row${here ? " here" : ""}${raid ? " raid" : ""}">
        <div class="city-main">
          <div class="city-title"><h3>${district.name}</h3><span class="tag${raid ? " danger" : ""}">${tag}</span></div>
          <p>${district.role}</p>
          <div class="city-facts"><span>${COPY.worldFace} <b>${id + 1}</b></span><span>${COPY.towers} <b>${towers}</b></span><span>${COPY.track} <b>${linked ? money(cost) : "—"}</b></span></div>
        </div>
        <button type="button" class="primary compact" data-act="travel" data-kind="${id}" ${disabled ? "disabled" : ""}>
          ${label}
        </button>
      </article>`;
    }).join("");
    const face = Math.max(0, Math.min(DISTRICTS.length - 1, Math.round(snap.world.face)));
    const season = SEASONS[Math.max(0, Math.min(SEASONS.length - 1, Math.round(snap.world.season)))];
    const seasonChips = SEASONS.map((item, id) => `<span class="season-chip${id === snap.world.season ? " on" : ""}">${item.name}</span>`).join("");
    return `<section class="world-strip">
        <div><span>${COPY.worldFace}</span><b>${face + 1} · ${DISTRICTS[face].name}</b></div>
        <div><span>${COPY.worldSeat}</span><b>${Math.round(snap.world.x)}, ${Math.round(snap.world.z)}</b></div>
        <div><span>${COPY.worldRegions}</span><b>${Math.round(snap.world.regions)}</b></div>
        <div><span>${COPY.worldBound}</span><b>${Math.round(snap.world.km).toLocaleString("en-US")} km</b></div>
        <div><span>${COPY.season}</span><b>${season.name} ${Math.round(snap.world.seasonProgress * 100)}%</b></div>
      </section>
      <div class="season-wheel">${seasonChips}</div>
      <div class="seat-pad" aria-label="${COPY.worldSeat}">
        <button type="button" class="seat-btn up" data-act="seat" data-dx="0" data-dz="-1">↑</button>
        <button type="button" class="seat-btn left" data-act="seat" data-dx="-1" data-dz="0">←</button>
        <button type="button" class="seat-btn right" data-act="seat" data-dx="1" data-dz="0">→</button>
        <button type="button" class="seat-btn down" data-act="seat" data-dx="0" data-dz="1">↓</button>
      </div>
      <p class="micro">${COPY.worldSeam}</p>
      <div class="track-map" aria-hidden="true">
        <svg viewBox="0 0 340 180" class="track-svg">
          <defs><marker id="raid-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" class="raid-mark"/></marker></defs>
          <line x1="330" y1="12" x2="${tx}" y2="${ty}" class="threat-line" marker-end="url(#raid-arrow)"/>
          ${lines}${nodes}
          <text x="325" y="8" class="track-source">RAID</text>
        </svg>
      </div>
      <p class="raid-note">${COPY.raid}: <b>${DISTRICTS[threat].name}</b>. ${COPY.raidNote}</p>
      <p class="foot">${COPY.mapFoot}</p>
      <div class="city-list">${cards}</div>
      ${this.contractSection(snap)}${this.surveySection()}`;
  }

  private contractSection(snap: Snapshot): string {
    const active = this.model.expedition(0) > 0.5;
    const current = Math.round(this.model.expedition(1));
    const leg = Math.round(this.model.expedition(2));
    if (active) {
      const contract = CONTRACTS[Math.max(0, Math.min(CONTRACTS.length - 1, current))];
      return `<section class="subblock">
        <div class="subhead"><span class="micro">${COPY.contracts}</span><span class="tag good">${COPY.contractActive}</span></div>
        <p><b>${contract.name}</b> ${COPY.contractLeg} ${leg + 1} / 3</p>
        <p class="micro">${contract.boon} ${COPY.boonStack}</p>
      </section>`;
    }
    const cards = CONTRACTS.map((contract, id) => {
      const fee = Math.round(this.model.expeditionContract(id, 0));
      const pay = Math.round(this.model.expeditionContract(id, 1));
      const relic = Math.round(this.model.expeditionContract(id, 3));
      const done = this.model.expeditionContract(id, 4) > 0.5;
      const disabled = snap.phase !== 0 || snap.brass < fee;
      return `<article class="city-row">
        <div class="city-main">
          <div class="city-title"><h3>${contract.name}</h3><span class="tag ${done ? "good" : ""}">${done ? COPY.contractDone : COPY.contractNew}</span></div>
          <p>${contract.role}</p>
          <div class="city-facts"><span>${COPY.contractFee} <b>${money(fee)}</b></span><span>${COPY.contractPay} <b>${money(pay)}</b></span><span>${COPY.contractRelic} <b>${relic} / 3</b></span></div>
          <p class="micro">${contract.boon}</p>
        </div>
        <button type="button" class="primary compact" data-act="startExpedition" data-kind="${id}" ${disabled ? "disabled" : ""}>${COPY.contractStart}</button>
      </article>`;
    }).join("");
    return `<section class="subblock">
      <div class="subhead"><span class="micro">${COPY.contracts}</span><span class="tag">${COPY.contractRelic} 3</span></div>
      <p class="micro">${COPY.contractBusy} ${COPY.boonStack}</p>
      <div class="city-list">${cards}</div>
    </section>`;
  }

  private surveySection(): string {
    const custom = this.model.custom(0) > 0.5;
    const count = Math.round(this.model.custom(1));
    const meta = loadMapMeta();
    const lead = custom && meta ? `${meta.name} ${COPY.surveyBy} ${meta.author}.` : COPY.surveyNone;
    return `<section class="subblock">
      <div class="subhead"><span class="micro">${COPY.survey}</span><span class="tag ${custom ? "good" : ""}">${custom ? COPY.surveyCustom : COPY.surveyNone}</span></div>
      <p class="micro">${lead} ${COPY.surveyBudget}: ${count} / ${MAP_BUDGET}.</p>
      <p class="micro">${COPY.surveyLead}</p>
      <textarea class="survey-text" rows="4" spellcheck="false" placeholder="Paste a survey file"></textarea>
      <div class="row-actions wrap">
        <button type="button" class="primary compact" data-act="surveyLoad">${COPY.surveyLoad}</button>
        <button type="button" class="ghost compact" data-act="surveyExample">${COPY.surveyExample}</button>
        <button type="button" class="ghost compact" data-act="surveyRestore" ${custom ? "" : "disabled"}>${COPY.surveyRestore}</button>
      </div>
    </section>`;
  }

  private intelSheet(snap: Snapshot): string {
    const rows = ENEMIES.map((enemy, kind) => {
      const count = this.model.previewCount(kind);
      if (count === 0) return "";
      return `<li><span class="enemy-dot" data-kind="${kind}"></span><b>${enemy.name}</b> × ${count}<small>${enemy.note}</small></li>`;
    }).join("");
    const repair = Math.round(this.model.repairCost());
    const full = snap.core >= snap.coreMax;
    return `
      <div class="intel-grid">
        <section>
          <span class="eyebrow">${COPY.incoming}</span>
          <ul class="enemy-list">${rows || `<li><b>${COPY.waveReport}</b><small>${COPY.buildPhase}</small></li>`}</ul>
        </section>
        <section class="report">
          <div><span>${COPY.wave}</span><b>${snap.wave}</b></div>
          <div><span>${COPY.kills}</span><b>${snap.kills}</b></div>
          <div><span>${COPY.score}</span><b>${money(snap.score)}</b></div>
        </section>
      </div>
      <div class="tips">
        <p><b>${COPY.tip}</b> ${COPY.tipBody}</p>
        <p>${COPY.tipBody2}</p>
        <p>${COPY.tipBody3}</p>
      </div>
      <div class="row-actions wrap">
        <button type="button" class="primary" data-act="repair" ${full ? 'data-maxed="1"' : `data-need-brass="${repair}"`} ${full ? "disabled" : ""}>
          ${full ? COPY.repairFull : `${COPY.repair} · ${money(repair)}`}
        </button>
        <button type="button" class="ghost" data-act="save">${COPY.save}</button>
        <button type="button" class="ghost" data-act="sound">${COPY.sound}: ${this.root.querySelector<HTMLElement>('[data-k="sound"]')?.dataset.on === "true" ? "on" : "off"}</button>
        <button type="button" class="ghost danger" data-act="reset">${COPY.reset}</button>
      </div>`;
  }
}
