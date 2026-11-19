import { CITY, COPY, DISTRICTS, ENEMIES, TOWERS } from "./copy";
import type { Snapshot } from "./sim";

export type HudModel = {
  towerCost: (kind: number) => number;
  towerField: (index: number, field: number) => number;
  sellValue: (index: number) => number;
  cityCost: (kind: number, level: number, ingots: number) => number;
  previewCount: (kind: number) => number;
  repairCost: () => number;
  mapTowerCount: (map: number) => number;
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
  onRepair: () => void;
  onCall: () => void;
  onPause: () => void;
  onSpeed: () => void;
  onSound: () => void;
  onSave: () => void;
  onReset: () => void;
  onClose: () => void;
  onCancelBuild: () => void;
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

    let stateText: string = COPY.buildPhase;
    if (snap.phase === 1) stateText = `${COPY.waveLive} · ${snap.threat}`;
    if (snap.phase === 2) stateText = COPY.broken;
    if (!state.started) stateText = COPY.mode;
    set("waveState", stateText);

    const call = this.root.querySelector<HTMLButtonElement>('[data-act="call"]');
    if (call) call.disabled = !snap.canCall || !state.started;
    set("bonus", snap.canCall ? `+${Math.ceil(Math.max(0, snap.countdown) * 2)}` : `${snap.threat} left`);

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
    this.sheetTitle.textContent =
      this.sheetKind === "build"
        ? COPY.build
        : this.sheetKind === "city"
          ? COPY.city
          : this.sheetKind === "map"
            ? COPY.frontier
          : this.sheetKind === "intel"
            ? COPY.intel
            : TOWERS[snap.towers[this.selected].kind].name;
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
    }).join("")}</div>`;
  }

  private mapSheet(snap: Snapshot): string {
    const cards = DISTRICTS.map((district, id) => {
      const here = snap.map === id;
      const towers = Math.round(this.model.mapTowerCount(id));
      const disabled = here || snap.phase !== 0 ? "disabled" : "";
      return `<article class="city-row${here ? " here" : ""}">
        <div class="city-main">
          <div class="city-title"><h3>${district.name}</h3><span class="tag">${here ? COPY.here : COPY.open}</span></div>
          <p>${district.role}</p>
          <div class="city-facts"><span>${COPY.towers} <b>${towers}</b></span><span>${COPY.route} <b>${here ? snap.pathSteps : "—"}</b></span></div>
        </div>
        <button type="button" class="primary compact" data-act="travel" data-kind="${id}" ${disabled}>
          ${here ? COPY.here : COPY.travel}
        </button>
      </article>`;
    }).join("");
    return `<p class="foot">${COPY.mapFoot}</p><div class="city-list">${cards}</div>`;
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
