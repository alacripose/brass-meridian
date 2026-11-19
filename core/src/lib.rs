//! Brass Meridian simulation core.
//!
//! The core owns the battlefield. The renderer only reads a snapshot and sends
//! commands. Determinism matters: the same seed and the same command order must
//! produce the same wave, so a save is a byte image rather than a replay guess.

use std::cell::RefCell;

pub const GW: usize = 17;
pub const GH: usize = 13;
const NCELL: usize = GW * GH;
const CELL: f32 = 2.0;
const CORE_X: usize = 0;
const CORE_Z: usize = 6;
const ENTRY_X: usize = 16;
const ENTRY_Z: usize = 6;
const MAX_PATH: i32 = 40;
const MAX_TOWERS: usize = 96;
const MAX_ENEMIES: usize = 320;
const MAX_PROJ: usize = 192;
const MAX_FX: usize = 128;
const MAX_PATH_PTS: usize = 64;

// Snapshot layout. Shared with src/sim.ts; a version bump means both change.
const H_VERSION: usize = 0;
const H_BRASS: usize = 1;
const H_INGOTS: usize = 2;
const H_CORE: usize = 3;
const H_CORE_MAX: usize = 4;
const H_WAVE: usize = 5;
const H_PHASE: usize = 6;
const H_ENEMIES_ALIVE: usize = 7;
const H_SPAWN_LEFT: usize = 8;
const H_COUNTDOWN: usize = 9;
const H_SIM_MS: usize = 10;
const H_SCORE: usize = 11;
const H_KILLS: usize = 12;
const H_TOWERS: usize = 13;
const H_ENEMIES: usize = 14;
const H_PROJECTILES: usize = 15;
const H_FX: usize = 16;
const H_FOUNDRY: usize = 17;
const H_KILN: usize = 18;
const H_WORKSHOP: usize = 19;
const H_DEPOT: usize = 20;
const H_BRASS_RATE: usize = 21;
const H_INGOT_RATE: usize = 22;
const H_WAVE_TOTAL: usize = 23;
const H_BOSS: usize = 24;
const H_PATH_STEPS: usize = 25;
const H_CAN_CALL: usize = 26;
const H_REPAIR_COST: usize = 27;
const H_CITY_MAX: usize = 28;
const H_CORE_BASE: usize = 29;
const H_THREAT: usize = 30;
const H_PATH_COUNT: usize = 31;

const TOWER_BASE: usize = 32;
const TOWER_STRIDE: usize = 16;
const ENEMY_BASE: usize = TOWER_BASE + MAX_TOWERS * TOWER_STRIDE;
const ENEMY_STRIDE: usize = 12;
const PROJ_BASE: usize = ENEMY_BASE + MAX_ENEMIES * ENEMY_STRIDE;
const PROJ_STRIDE: usize = 10;
const FX_BASE: usize = PROJ_BASE + MAX_PROJ * PROJ_STRIDE;
const FX_STRIDE: usize = 8;
const PATH_BASE: usize = FX_BASE + MAX_FX * FX_STRIDE;
const SNAP_LEN: usize = PATH_BASE + MAX_PATH_PTS * 2;

const DIRS: [(i32, i32); 4] = [(1, 0), (-1, 0), (0, 1), (0, -1)];

#[inline]
fn idx(gx: usize, gz: usize) -> usize {
    gz * GW + gx
}

#[inline]
fn wx(gx: usize) -> f32 {
    (gx as f32 - (GW as f32 - 1.0) * 0.5) * CELL
}

#[inline]
fn wz(gz: usize) -> f32 {
    (gz as f32 - (GH as f32 - 1.0) * 0.5) * CELL
}

#[inline]
fn cell_of(x: f32, z: f32) -> (usize, usize) {
    let gx = (x / CELL + (GW as f32 - 1.0) * 0.5)
        .round()
        .clamp(0.0, (GW - 1) as f32) as usize;
    let gz = (z / CELL + (GH as f32 - 1.0) * 0.5)
        .round()
        .clamp(0.0, (GH - 1) as f32) as usize;
    (gx, gz)
}

fn terrain(gx: usize, gz: usize) -> bool {
    matches!(
        (gx, gz),
        (4, 2) | (4, 3) | (5, 2) | (12, 10) | (13, 10) | (12, 9)
    )
}

fn tower_stats(kind: u8, level: u8) -> (f32, f32, f32, f32) {
    let l = level as f32;
    match kind {
        0 => (9.0 * (1.0 + 0.65 * l), 2.9 + 0.35 * l, 0.75 * (1.0 - 0.10 * l), 0.0),
        1 => (26.0 * (1.0 + 0.70 * l), 5.0 + 0.40 * l, 2.4 * (1.0 - 0.08 * l), 0.40),
        2 => (42.0 * (1.0 + 0.75 * l), 6.5 + 0.40 * l, 1.9 * (1.0 - 0.08 * l), 0.0),
        _ => (0.0, 3.2 + 0.40 * l, 0.0, 0.45 + 0.05 * l),
    }
}

fn tower_cost(kind: u8) -> f32 {
    match kind {
        0 => 45.0,
        1 => 70.0,
        2 => 90.0,
        3 => 35.0,
        _ => 0.0,
    }
}

fn upgrade_brass(level: u8) -> f32 {
    match level {
        0 => 70.0,
        1 => 140.0,
        _ => 0.0,
    }
}

fn upgrade_ingots(level: u8) -> f32 {
    if level == 1 {
        8.0
    } else {
        0.0
    }
}

fn repair_cost() -> f32 {
    45.0
}

fn city_brass(kind: u8, level: usize) -> f32 {
    match (kind, level) {
        (0, 0) => 80.0,
        (0, 1) => 140.0,
        (0, 2) => 220.0,
        (1, 0) => 60.0,
        (1, 1) => 110.0,
        (1, 2) => 180.0,
        (2, 0) => 90.0,
        (2, 1) => 160.0,
        (2, 2) => 250.0,
        (3, 0) => 80.0,
        (3, 1) => 140.0,
        (3, 2) => 220.0,
        _ => 0.0,
    }
}

fn city_ingots(kind: u8, level: usize) -> f32 {
    match (kind, level) {
        (0, 1) => 4.0,
        (0, 2) => 8.0,
        (2, 1) => 8.0,
        (2, 2) => 16.0,
        (3, 1) => 6.0,
        (3, 2) => 12.0,
        _ => 0.0,
    }
}

/// hp, speed (cells/s), bounty, armor, leak damage, flying
fn enemy_base(kind: u8) -> (f32, f32, f32, f32, u8, bool) {
    match kind {
        0 => (42.0, 1.55, 6.0, 0.0, 1, false),  // Drudge
        1 => (26.0, 2.90, 5.0, 0.0, 1, false),  // Hound
        2 => (170.0, 0.95, 16.0, 6.0, 2, false), // Bulwark
        3 => (48.0, 2.10, 8.0, 0.0, 1, true),   // Mote
        _ => (1100.0, 0.65, 140.0, 12.0, 6, false), // Cathedral
    }
}

fn composition(wave: u32) -> Vec<u8> {
    let mut v = Vec::new();
    match wave {
        1 => v.extend([0u8; 8]),
        2 => {
            v.extend([0u8; 6]);
            v.extend([1u8; 6]);
        }
        3 => {
            v.extend([1u8; 8]);
            v.extend([0u8; 4]);
        }
        4 => {
            v.extend([2u8; 6]);
            v.extend([0u8; 6]);
        }
        5 => {
            v.extend([3u8; 4]);
            v.extend([1u8; 10]);
        }
        6 => {
            v.extend([2u8; 8]);
            v.extend([1u8; 8]);
        }
        7 => {
            v.extend([3u8; 10]);
            v.extend([2u8; 6]);
        }
        8 => {
            v.extend([0u8; 12]);
            v.extend([1u8; 8]);
            v.extend([2u8; 6]);
        }
        9 => {
            v.extend([3u8; 6]);
            v.extend([2u8; 6]);
            v.extend([1u8; 10]);
        }
        10 => {
            v.push(4);
            v.extend([1u8; 10]);
            v.extend([0u8; 8]);
        }
        _ => {
            let n = 12 + (wave as usize) * 2;
            for i in 0..n {
                let k = match (i as u32 + wave) % 7 {
                    0 | 3 => 1,
                    1 => 0,
                    2 => 2,
                    4 => 3,
                    _ => 0,
                };
                v.push(k);
            }
            if wave % 5 == 0 {
                v.push(4);
            }
        }
    }
    v
}

#[derive(Clone)]
struct Tower {
    kind: u8,
    level: u8,
    gx: usize,
    gz: usize,
    cd: f32,
    spent: f32,
    angle: f32,
    id: u32,
}

#[derive(Clone)]
struct Enemy {
    kind: u8,
    hp: f32,
    max_hp: f32,
    x: f32,
    z: f32,
    speed: f32,
    slow: f32,
    slow_t: f32,
    flying: bool,
    leaked: bool,
    bounty: f32,
    armor: f32,
    leak: u8,
    id: u32,
    angle: f32,
    progress: f32,
}

#[derive(Clone)]
struct Projectile {
    kind: u8,
    x: f32,
    z: f32,
    sx: f32,
    sz: f32,
    tx: f32,
    tz: f32,
    ttl: f32,
    total: f32,
    dmg: f32,
    slow: f32,
}

#[derive(Clone)]
struct Fx {
    kind: u8,
    x1: f32,
    z1: f32,
    x2: f32,
    z2: f32,
    ttl: f32,
    total: f32,
    width: f32,
}

struct Sim {
    seed: u32,
    rng: u32,
    brass: f32,
    ingots: f32,
    core: f32,
    core_max: f32,
    wave: u32,
    phase: u8,
    countdown: f32,
    sim_ms: f64,
    score: u32,
    kills: u32,
    city: [u8; 4],
    towers: Vec<Tower>,
    enemies: Vec<Enemy>,
    projectiles: Vec<Projectile>,
    fx: Vec<Fx>,
    dist: [i32; NCELL],
    flow: [u8; NCELL],
    path_len: i32,
    path_pts: Vec<(f32, f32)>,
    spawn_queue: Vec<u8>,
    spawn_index: usize,
    spawn_timer: f32,
    spawn_interval: f32,
    boss_wave: bool,
    next_id: u32,
    snap: Vec<f32>,
    save_buf: Vec<u8>,
}

impl Sim {
    fn new(seed: u32) -> Self {
        let mut sim = Sim {
            seed,
            rng: if seed == 0 { 0x9E37_79B9 } else { seed },
            brass: 150.0,
            ingots: 0.0,
            core: 20.0,
            core_max: 20.0,
            wave: 1,
            phase: 0,
            countdown: 15.0,
            sim_ms: 0.0,
            score: 0,
            kills: 0,
            city: [0; 4],
            towers: Vec::new(),
            enemies: Vec::new(),
            projectiles: Vec::new(),
            fx: Vec::new(),
            dist: [i32::MAX; NCELL],
            flow: [255; NCELL],
            path_len: -1,
            path_pts: Vec::new(),
            spawn_queue: Vec::new(),
            spawn_index: 0,
            spawn_timer: 0.0,
            spawn_interval: 0.62,
            boss_wave: false,
            next_id: 1,
            snap: vec![0.0; SNAP_LEN],
            save_buf: Vec::new(),
        };
        sim.recompute();
        sim.fill_snapshot();
        sim
    }

    fn blocked(&self, gx: usize, gz: usize) -> bool {
        terrain(gx, gz) || self.towers.iter().any(|t| t.gx == gx && t.gz == gz)
    }

    fn tower_index(&self, gx: usize, gz: usize) -> Option<usize> {
        self.towers.iter().position(|t| t.gx == gx && t.gz == gz)
    }

    fn recompute(&mut self) {
        let start = idx(CORE_X, CORE_Z);
        let mut dist = [i32::MAX; NCELL];
        let mut done = [false; NCELL];
        dist[start] = 0;
        for _ in 0..NCELL {
            let mut best = usize::MAX;
            let mut bd = i32::MAX;
            for i in 0..NCELL {
                if !done[i] && dist[i] < bd {
                    bd = dist[i];
                    best = i;
                }
            }
            if best == usize::MAX {
                break;
            }
            done[best] = true;
            let gx = best % GW;
            let gz = best / GW;
            for (dx, dz) in DIRS {
                let nx = gx as i32 + dx;
                let nz = gz as i32 + dz;
                if nx < 0 || nz < 0 || nx >= GW as i32 || nz >= GH as i32 {
                    continue;
                }
                let (nx, nz) = (nx as usize, nz as usize);
                let ni = idx(nx, nz);
                if !done[ni] && !self.blocked(nx, nz) && dist[ni] > bd + 1 {
                    dist[ni] = bd + 1;
                }
            }
        }
        self.dist = dist;
        self.flow = [255; NCELL];
        for gz in 0..GH {
            for gx in 0..GW {
                let i = idx(gx, gz);
                if i == start || self.dist[i] == i32::MAX {
                    continue;
                }
                let mut best = 255u8;
                let mut bd = self.dist[i];
                for (d, (dx, dz)) in DIRS.iter().enumerate() {
                    let nx = gx as i32 + dx;
                    let nz = gz as i32 + dz;
                    if nx < 0 || nz < 0 || nx >= GW as i32 || nz >= GH as i32 {
                        continue;
                    }
                    let ni = idx(nx as usize, nz as usize);
                    if self.dist[ni] < bd {
                        bd = self.dist[ni];
                        best = d as u8;
                    }
                }
                self.flow[i] = best;
            }
        }
        self.path_len = -1;
        self.path_pts.clear();
        let entry = idx(ENTRY_X, ENTRY_Z);
        if self.dist[entry] != i32::MAX {
            self.path_len = self.dist[entry];
            let mut gx = ENTRY_X;
            let mut gz = ENTRY_Z;
            for _ in 0..MAX_PATH_PTS {
                self.path_pts.push((wx(gx), wz(gz)));
                if gx == CORE_X && gz == CORE_Z {
                    break;
                }
                let d = self.flow[idx(gx, gz)];
                if d == 255 {
                    break;
                }
                let (dx, dz) = DIRS[d as usize];
                let nx = gx as i32 + dx;
                let nz = gz as i32 + dz;
                if nx < 0 || nz < 0 || nx >= GW as i32 || nz >= GH as i32 {
                    break;
                }
                gx = nx as usize;
                gz = nz as usize;
            }
        }
    }

    fn rng_next(&mut self) -> u32 {
        let mut x = self.rng;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.rng = if x == 0 { 1 } else { x };
        self.rng
    }

    fn place(&mut self, gx: usize, gz: usize, kind: u8) -> i32 {
        if kind > 3 {
            return -9;
        }
        if gx >= GW || gz >= GH {
            return -1;
        }
        if (gx == ENTRY_X && gz == ENTRY_Z) || (gx == CORE_X && gz == CORE_Z) {
            return -4;
        }
        if terrain(gx, gz) {
            return -3;
        }
        if self.tower_index(gx, gz).is_some() {
            return -2;
        }
        if self.towers.len() >= MAX_TOWERS {
            return -8;
        }
        let cost = tower_cost(kind);
        if self.brass < cost {
            return -7;
        }
        self.towers.push(Tower {
            kind,
            level: 0,
            gx,
            gz,
            cd: 0.0,
            spent: cost,
            angle: 0.0,
            id: 0,
        });
        self.recompute();
        let reachable = self.path_len >= 0;
        let within = self.path_len <= MAX_PATH;
        self.towers.pop();
        self.recompute();
        if !reachable {
            return -5;
        }
        if !within {
            return -6;
        }
        self.brass -= cost;
        let id = self.next_id;
        self.next_id += 1;
        self.towers.push(Tower {
            kind,
            level: 0,
            gx,
            gz,
            cd: 0.0,
            spent: cost,
            angle: 0.0,
            id,
        });
        self.recompute();
        self.fill_snapshot();
        0
    }

    fn can_place(&mut self, gx: usize, gz: usize, kind: u8) -> i32 {
        if kind > 3 {
            return -9;
        }
        if gx >= GW || gz >= GH {
            return -1;
        }
        if (gx == ENTRY_X && gz == ENTRY_Z) || (gx == CORE_X && gz == CORE_Z) {
            return -4;
        }
        if terrain(gx, gz) {
            return -3;
        }
        if self.tower_index(gx, gz).is_some() {
            return -2;
        }
        if self.towers.len() >= MAX_TOWERS {
            return -8;
        }
        if self.brass < tower_cost(kind) {
            return -7;
        }
        self.towers.push(Tower {
            kind,
            level: 0,
            gx,
            gz,
            cd: 0.0,
            spent: 0.0,
            angle: 0.0,
            id: 0,
        });
        self.recompute();
        let code = if self.path_len < 0 {
            -5
        } else if self.path_len > MAX_PATH {
            -6
        } else {
            0
        };
        self.towers.pop();
        self.recompute();
        code
    }

    fn upgrade(&mut self, index: usize) -> i32 {
        if index >= self.towers.len() {
            return -1;
        }
        let level = self.towers[index].level;
        if level >= 2 {
            return -2;
        }
        let brass = upgrade_brass(level);
        let ingots = upgrade_ingots(level);
        if self.brass < brass || self.ingots < ingots {
            return -3;
        }
        self.brass -= brass;
        self.ingots -= ingots;
        self.towers[index].level += 1;
        self.towers[index].spent += brass;
        self.fill_snapshot();
        0
    }

    fn sell(&mut self, index: usize) -> i32 {
        if index >= self.towers.len() {
            return -1;
        }
        let refund = (self.towers[index].spent * 0.6).round() as i32;
        self.brass += refund as f32;
        self.towers.swap_remove(index);
        self.recompute();
        self.fill_snapshot();
        refund
    }

    fn city_cost(&self, kind: u8, level: usize) -> (f32, f32) {
        (city_brass(kind, level), city_ingots(kind, level))
    }

    fn build_city(&mut self, kind: u8) -> i32 {
        if kind > 3 {
            return -1;
        }
        let level = self.city[kind as usize] as usize;
        if level >= 3 {
            return -2;
        }
        let (brass, ingots) = self.city_cost(kind, level);
        if self.brass < brass || self.ingots < ingots {
            return -3;
        }
        self.brass -= brass;
        self.ingots -= ingots;
        self.city[kind as usize] += 1;
        if kind == 3 {
            self.core_max = 20.0 + self.city[3] as f32 * 4.0;
            self.core = (self.core + 4.0).min(self.core_max);
        }
        self.fill_snapshot();
        0
    }

    fn repair(&mut self) -> i32 {
        if self.core >= self.core_max {
            return -2;
        }
        if self.brass < repair_cost() {
            return -3;
        }
        self.brass -= repair_cost();
        self.core = (self.core + 4.0).min(self.core_max);
        self.fill_snapshot();
        0
    }

    fn start_wave(&mut self) -> i32 {
        if self.phase != 0 {
            return -1;
        }
        let bonus = (self.countdown.max(0.0) * 2.0).round();
        self.brass += bonus;
        self.phase = 1;
        self.spawn_queue = composition(self.wave);
        self.spawn_index = 0;
        self.spawn_interval = (0.62 - self.wave as f32 * 0.012).max(0.20);
        self.spawn_timer = 0.15;
        self.boss_wave = self.spawn_queue.contains(&4);
        self.countdown = 0.0;
        self.fill_snapshot();
        0
    }

    fn spawn_next(&mut self) {
        if self.spawn_index >= self.spawn_queue.len() {
            return;
        }
        let kind = self.spawn_queue[self.spawn_index];
        self.spawn_index += 1;
        let (hp, speed, bounty, armor, leak, flying) = enemy_base(kind);
        let scale = 1.0 + 0.12 * self.wave.saturating_sub(1) as f32;
        let jitter = (self.rng_next() % 1000) as f32 / 1000.0 - 0.5;
        let id = self.next_id;
        self.next_id += 1;
        let speed_scale = (1.0 + 0.015 * self.wave.saturating_sub(1) as f32).min(1.3);
        self.enemies.push(Enemy {
            kind,
            hp: hp * scale,
            max_hp: hp * scale,
            x: wx(ENTRY_X) + 0.5,
            z: wz(ENTRY_Z) + jitter * 0.9,
            speed: speed * speed_scale,
            slow: 0.0,
            slow_t: 0.0,
            flying,
            leaked: false,
            bounty: bounty + (self.wave / 2) as f32,
            armor,
            leak,
            id,
            angle: std::f32::consts::PI,
            progress: 0.0,
        });
        if self.enemies.len() > MAX_ENEMIES {
            self.enemies.remove(0);
        }
    }

    fn pick_target(&self, x: f32, z: f32, range: f32, air: bool) -> Option<usize> {
        let core_x = wx(CORE_X);
        let core_z = wz(CORE_Z);
        let mut best: Option<(f32, usize)> = None;
        for (i, e) in self.enemies.iter().enumerate() {
            if e.hp <= 0.0 || e.leaked || (e.flying && !air) {
                continue;
            }
            let dx = e.x - x;
            let dz = e.z - z;
            if dx * dx + dz * dz > range * range {
                continue;
            }
            let dxc = e.x - core_x;
            let dzc = e.z - core_z;
            let score = dxc * dxc + dzc * dzc;
            if best.map(|(s, _)| score < s).unwrap_or(true) {
                best = Some((score, i));
            }
        }
        best.map(|(_, i)| i)
    }

    fn nearest_to(&self, x: f32, z: f32, range: f32, exclude: &[u32]) -> Option<usize> {
        let mut best: Option<(f32, usize)> = None;
        for (i, e) in self.enemies.iter().enumerate() {
            if e.hp <= 0.0 || e.leaked || exclude.contains(&e.id) {
                continue;
            }
            let dx = e.x - x;
            let dz = e.z - z;
            let d2 = dx * dx + dz * dz;
            if d2 <= range * range && best.map(|(b, _)| d2 < b).unwrap_or(true) {
                best = Some((d2, i));
            }
        }
        best.map(|(_, i)| i)
    }

    fn hit(&mut self, index: usize, raw: f32, pierce: f32) {
        if index >= self.enemies.len() {
            return;
        }
        let armor = self.enemies[index].armor;
        let dealt = (raw - (armor - pierce).max(0.0)).max(1.0);
        self.enemies[index].hp -= dealt;
    }

    fn apply_slow(&mut self, index: usize, slow: f32) {
        if index >= self.enemies.len() {
            return;
        }
        if slow > self.enemies[index].slow {
            self.enemies[index].slow = slow;
        }
        self.enemies[index].slow_t = self.enemies[index].slow_t.max(0.35);
    }

    fn beam(&mut self, x1: f32, z1: f32, x2: f32, z2: f32, kind: u8, width: f32) {
        if self.fx.len() >= MAX_FX {
            self.fx.remove(0);
        }
        self.fx.push(Fx {
            kind,
            x1,
            z1,
            x2,
            z2,
            ttl: 0.16,
            total: 0.16,
            width,
        });
    }

    fn tick_towers(&mut self, dt: f32) {
        let workshop = 1.0 + self.city[2] as f32 * 0.07;
        for i in 0..self.towers.len() {
            let kind = self.towers[i].kind;
            let level = self.towers[i].level;
            let gx = self.towers[i].gx;
            let gz = self.towers[i].gz;
            let (dmg, range, rate, slow) = tower_stats(kind, level);
            let tx = wx(gx);
            let tz = wz(gz);
            if kind == 3 {
                for j in 0..self.enemies.len() {
                    let dx = self.enemies[j].x - tx;
                    let dz = self.enemies[j].z - tz;
                    if dx * dx + dz * dz <= range * range {
                        self.apply_slow(j, slow);
                    }
                }
                continue;
            }
            self.towers[i].cd -= dt;
            if self.towers[i].cd > 0.0 {
                continue;
            }
            let air = kind == 0 || kind == 2;
            if let Some(target) = self.pick_target(tx, tz, range, air) {
                let ex = self.enemies[target].x;
                let ez = self.enemies[target].z;
                self.towers[i].angle = (ez - tz).atan2(ex - tx);
                self.towers[i].cd = rate;
                let power = dmg * workshop;
                match kind {
                    0 => {
                        let mut last = target;
                        let mut hit_ids = vec![self.enemies[target].id];
                        let mut here = power;
                        for hop in 0..3 {
                            let lx = self.enemies[last].x;
                            let lz = self.enemies[last].z;
                            self.hit(last, here, 0.0);
                            self.beam(tx, tz, lx, lz, 0, 0.45);
                            if hop == 2 {
                                break;
                            }
                            let next = self.nearest_to(lx, lz, 2.8, &hit_ids);
                            if let Some(n) = next {
                                last = n;
                                hit_ids.push(self.enemies[n].id);
                                here *= 0.65;
                            } else {
                                break;
                            }
                        }
                    }
                    1 => {
                        let dist = ((ex - tx).powi(2) + (ez - tz).powi(2)).sqrt();
                        let travel = (dist / 12.0).clamp(0.35, 1.2);
                        if self.projectiles.len() < MAX_PROJ {
                            self.projectiles.push(Projectile {
                                kind: 1,
                                x: tx,
                                z: tz,
                                sx: tx,
                                sz: tz,
                                tx: ex,
                                tz: ez,
                                ttl: travel,
                                total: travel,
                                dmg: power,
                                slow,
                            });
                        }
                    }
                    2 => {
                        self.hit(target, power, 8.0);
                        self.beam(tx, tz, ex, ez, 1, 0.32);
                    }
                    _ => {}
                }
            }
        }
    }

    fn tick_projectiles(&mut self, dt: f32) {
        for i in (0..self.projectiles.len()).rev() {
            self.projectiles[i].ttl -= dt;
            if self.projectiles[i].ttl > 0.0 {
                continue;
            }
            let p = self.projectiles[i].clone();
            for j in 0..self.enemies.len() {
                if self.enemies[j].flying || self.enemies[j].hp <= 0.0 {
                    continue;
                }
                let dx = self.enemies[j].x - p.tx;
                let dz = self.enemies[j].z - p.tz;
                if dx * dx + dz * dz <= 1.7 * 1.7 {
                    self.hit(j, p.dmg, 0.0);
                    self.apply_slow(j, p.slow);
                }
            }
            if self.fx.len() >= MAX_FX {
                self.fx.remove(0);
            }
            self.fx.push(Fx {
                kind: 2,
                x1: p.tx,
                z1: p.tz,
                x2: p.tx,
                z2: p.tz,
                ttl: 0.35,
                total: 0.35,
                width: 1.6,
            });
            self.projectiles.swap_remove(i);
        }
    }

    fn move_enemies(&mut self, dt: f32) {
        let core_x = wx(CORE_X);
        let core_z = wz(CORE_Z);
        for i in 0..self.enemies.len() {
            let flying = self.enemies[i].flying;
            let slow = if self.enemies[i].slow_t > 0.0 {
                self.enemies[i].slow
            } else {
                0.0
            };
            let speed = self.enemies[i].speed * (1.0 - slow).max(0.15);
            let mut x = self.enemies[i].x;
            let mut z = self.enemies[i].z;
            let mut angle = self.enemies[i].angle;
            let mut leak = false;
            if flying {
                let dx = core_x - x;
                let dz = core_z - z;
                let d = (dx * dx + dz * dz).sqrt();
                if d < 0.9 {
                    leak = true;
                } else {
                    x += dx / d * speed * dt * CELL;
                    z += dz / d * speed * dt * CELL;
                    angle = dz.atan2(dx);
                }
            } else {
                let (gx, gz) = cell_of(x, z);
                if gx == CORE_X && gz == CORE_Z {
                    leak = true;
                } else {
                    let d = self.flow[idx(gx, gz)];
                    let (nx, nz) = if d == 255 {
                        (CORE_X, CORE_Z)
                    } else {
                        let (dx, dz) = DIRS[d as usize];
                        (
                            (gx as i32 + dx).clamp(0, GW as i32 - 1) as usize,
                            (gz as i32 + dz).clamp(0, GH as i32 - 1) as usize,
                        )
                    };
                    let target_x = wx(nx);
                    let target_z = wz(nz);
                    let dx = target_x - x;
                    let dz = target_z - z;
                    let dist = (dx * dx + dz * dz).sqrt();
                    let step = speed * dt * CELL;
                    if dist <= step {
                        x = target_x;
                        z = target_z;
                    } else if dist > 0.0001 {
                        x += dx / dist * step;
                        z += dz / dist * step;
                    }
                    angle = dz.atan2(dx);
                }
            }
            if self.enemies[i].slow_t > 0.0 {
                self.enemies[i].slow_t -= dt;
                if self.enemies[i].slow_t <= 0.0 {
                    self.enemies[i].slow = 0.0;
                }
            }
            self.enemies[i].x = x;
            self.enemies[i].z = z;
            self.enemies[i].angle = angle;
            self.enemies[i].leaked = leak;
            if leak {
                self.enemies[i].progress = 1.0;
            } else if flying {
                let dx = x - core_x;
                let dz = z - core_z;
                self.enemies[i].progress = (1.0 - (dx * dx + dz * dz).sqrt() / 40.0).clamp(0.0, 1.0);
            } else {
                let (gx, gz) = cell_of(x, z);
                let d = self.dist[idx(gx, gz)];
                if d == i32::MAX {
                    self.enemies[i].progress = 0.0;
                } else {
                    self.enemies[i].progress = (1.0 - d as f32 / 42.0).clamp(0.0, 1.0);
                }
            }
        }
    }

    fn tick_fx(&mut self, dt: f32) {
        for fx in self.fx.iter_mut() {
            fx.ttl -= dt;
        }
        self.fx.retain(|f| f.ttl > 0.0);
    }

    fn cleanup(&mut self) {
        let mut i = 0;
        while i < self.enemies.len() {
            if self.enemies[i].leaked {
                self.core -= self.enemies[i].leak as f32;
                self.enemies.swap_remove(i);
            } else if self.enemies[i].hp <= 0.0 {
                let bounty = self.enemies[i].bounty;
                self.brass += bounty;
                self.kills += 1;
                self.score += bounty.max(0.0) as u32;
                self.enemies.swap_remove(i);
            } else {
                i += 1;
            }
        }
        if self.core <= 0.0 {
            self.core = 0.0;
            self.phase = 2;
            self.spawn_queue.clear();
            self.spawn_index = 0;
            self.enemies.clear();
            self.projectiles.clear();
        }
    }

    fn tick(&mut self, dt: f32) {
        if self.phase == 2 {
            return;
        }
        self.sim_ms += (dt * 1000.0) as f64;
        self.brass += self.city[1] as f32 * 0.60 * dt;
        self.ingots += self.city[0] as f32 * 0.30 * dt;

        if self.phase == 0 {
            self.countdown -= dt;
            if self.countdown <= 0.0 {
                self.start_wave();
            }
        }
        if self.phase == 1 {
            if self.spawn_index < self.spawn_queue.len() {
                self.spawn_timer -= dt;
                if self.spawn_timer <= 0.0 {
                    self.spawn_next();
                    self.spawn_timer = self.spawn_interval;
                }
            }
        }
        self.tick_towers(dt);
        self.tick_projectiles(dt);
        self.move_enemies(dt);
        self.tick_fx(dt);
        self.cleanup();

        if self.phase == 1 && self.spawn_index >= self.spawn_queue.len() && self.enemies.is_empty() {
            self.brass += 18.0 + self.wave as f32 * 5.0;
            self.ingots += 2.0 + (self.wave / 3) as f32;
            self.score += 100 * self.wave;
            self.wave += 1;
            self.phase = 0;
            self.countdown = 12.0;
            self.spawn_queue.clear();
            self.spawn_index = 0;
            self.boss_wave = false;
        }
        self.fill_snapshot();
    }

    fn fill_snapshot(&mut self) {
        for f in self.snap.iter_mut() {
            *f = 0.0;
        }
        let s = &mut self.snap;
        s[H_VERSION] = 1.0;
        s[H_BRASS] = self.brass;
        s[H_INGOTS] = self.ingots;
        s[H_CORE] = self.core;
        s[H_CORE_MAX] = self.core_max;
        s[H_WAVE] = self.wave as f32;
        s[H_PHASE] = self.phase as f32;
        s[H_ENEMIES_ALIVE] = self.enemies.len() as f32;
        s[H_SPAWN_LEFT] = self.spawn_queue.len().saturating_sub(self.spawn_index) as f32;
        s[H_COUNTDOWN] = self.countdown;
        s[H_SIM_MS] = self.sim_ms as f32;
        s[H_SCORE] = self.score as f32;
        s[H_KILLS] = self.kills as f32;
        s[H_TOWERS] = self.towers.len() as f32;
        s[H_ENEMIES] = self.enemies.len() as f32;
        s[H_PROJECTILES] = self.projectiles.len() as f32;
        s[H_FX] = self.fx.len() as f32;
        s[H_FOUNDRY] = self.city[0] as f32;
        s[H_KILN] = self.city[1] as f32;
        s[H_WORKSHOP] = self.city[2] as f32;
        s[H_DEPOT] = self.city[3] as f32;
        s[H_BRASS_RATE] = self.city[1] as f32 * 36.0; // per minute
        s[H_INGOT_RATE] = self.city[0] as f32 * 18.0; // per minute
        s[H_WAVE_TOTAL] = self.spawn_queue.len() as f32;
        s[H_BOSS] = if self.boss_wave { 1.0 } else { 0.0 };
        s[H_PATH_STEPS] = self.path_len as f32;
        s[H_CAN_CALL] = if self.phase == 0 { 1.0 } else { 0.0 };
        s[H_REPAIR_COST] = repair_cost();
        s[H_CITY_MAX] = 3.0;
        s[H_CORE_BASE] = 20.0;
        s[H_THREAT] = (self.spawn_queue.len().saturating_sub(self.spawn_index) + self.enemies.len()) as f32;
        s[H_PATH_COUNT] = self.path_pts.len() as f32;

        for (i, t) in self.towers.iter().take(MAX_TOWERS).enumerate() {
            let b = TOWER_BASE + i * TOWER_STRIDE;
            let (dmg, range, rate, _) = tower_stats(t.kind, t.level);
            s[b] = wx(t.gx);
            s[b + 1] = wz(t.gz);
            s[b + 2] = t.kind as f32;
            s[b + 3] = t.level as f32;
            s[b + 4] = t.cd;
            s[b + 5] = range;
            s[b + 6] = dmg * (1.0 + self.city[2] as f32 * 0.07);
            s[b + 7] = rate;
            s[b + 8] = t.angle;
            s[b + 9] = t.id as f32;
            s[b + 10] = t.spent;
            s[b + 11] = t.gx as f32;
            s[b + 12] = t.gz as f32;
        }
        for (i, e) in self.enemies.iter().take(MAX_ENEMIES).enumerate() {
            let b = ENEMY_BASE + i * ENEMY_STRIDE;
            s[b] = e.x;
            s[b + 1] = e.z;
            s[b + 2] = e.hp.max(0.0);
            s[b + 3] = e.max_hp;
            s[b + 4] = e.kind as f32;
            s[b + 5] = (e.flying as u8 as f32) + if e.kind == 4 { 2.0 } else { 0.0 };
            s[b + 6] = e.slow;
            s[b + 7] = e.progress;
            s[b + 8] = e.angle;
            s[b + 9] = e.id as f32;
        }
        for (i, p) in self.projectiles.iter().take(MAX_PROJ).enumerate() {
            let b = PROJ_BASE + i * PROJ_STRIDE;
            s[b] = p.x;
            s[b + 1] = p.z;
            s[b + 2] = p.sx;
            s[b + 3] = p.sz;
            s[b + 4] = p.tx;
            s[b + 5] = p.tz;
            s[b + 6] = p.ttl;
            s[b + 7] = p.total;
            s[b + 8] = p.kind as f32;
        }
        for (i, f) in self.fx.iter().take(MAX_FX).enumerate() {
            let b = FX_BASE + i * FX_STRIDE;
            s[b] = f.x1;
            s[b + 1] = f.z1;
            s[b + 2] = f.x2;
            s[b + 3] = f.z2;
            s[b + 4] = f.ttl;
            s[b + 5] = f.total;
            s[b + 6] = f.kind as f32;
            s[b + 7] = f.width;
        }
        for (i, (x, z)) in self.path_pts.iter().take(MAX_PATH_PTS).enumerate() {
            s[PATH_BASE + i * 2] = *x;
            s[PATH_BASE + i * 2 + 1] = *z;
        }
    }

    fn save_bytes(&mut self) -> &[u8] {
        let mut w = Vec::with_capacity(4096);
        w.extend_from_slice(b"BMG1");
        w.push(2); // save format
        w.extend_from_slice(&self.seed.to_le_bytes());
        w.extend_from_slice(&self.rng.to_le_bytes());
        for v in [self.brass, self.ingots, self.core, self.core_max] {
            w.extend_from_slice(&v.to_le_bytes());
        }
        w.extend_from_slice(&self.wave.to_le_bytes());
        w.push(self.phase);
        w.extend_from_slice(&self.countdown.to_le_bytes());
        w.extend_from_slice(&self.sim_ms.to_le_bytes());
        w.extend_from_slice(&self.score.to_le_bytes());
        w.extend_from_slice(&self.kills.to_le_bytes());
        w.extend_from_slice(&self.city);
        w.extend_from_slice(&self.next_id.to_le_bytes());
        w.extend_from_slice(&self.spawn_interval.to_le_bytes());
        w.extend_from_slice(&self.spawn_timer.to_le_bytes());
        w.extend_from_slice(&(self.spawn_index as u32).to_le_bytes());
        w.push(self.boss_wave as u8);
        w.extend_from_slice(&(self.spawn_queue.len() as u16).to_le_bytes());
        for k in &self.spawn_queue {
            w.push(*k);
        }
        w.extend_from_slice(&(self.towers.len() as u16).to_le_bytes());
        for t in &self.towers {
            w.push(t.kind);
            w.push(t.level);
            w.push(t.gx as u8);
            w.push(t.gz as u8);
            for v in [t.cd, t.spent, t.angle] {
                w.extend_from_slice(&v.to_le_bytes());
            }
            w.extend_from_slice(&t.id.to_le_bytes());
        }
        w.extend_from_slice(&(self.enemies.len() as u16).to_le_bytes());
        for e in &self.enemies {
            w.push(e.kind);
            w.push((e.flying as u8) | ((e.leaked as u8) << 1));
            for v in [
                e.hp, e.max_hp, e.x, e.z, e.speed, e.slow, e.slow_t, e.bounty, e.armor,
                e.angle, e.progress,
            ] {
                w.extend_from_slice(&v.to_le_bytes());
            }
            w.push(e.leak);
            w.extend_from_slice(&e.id.to_le_bytes());
        }
        w.extend_from_slice(&(self.projectiles.len() as u16).to_le_bytes());
        for p in &self.projectiles {
            w.push(p.kind);
            for v in [
                p.x, p.z, p.sx, p.sz, p.tx, p.tz, p.ttl, p.total, p.dmg, p.slow,
            ] {
                w.extend_from_slice(&v.to_le_bytes());
            }
        }
        w.extend_from_slice(&(self.fx.len() as u16).to_le_bytes());
        for f in &self.fx {
            w.push(f.kind);
            for v in [f.x1, f.z1, f.x2, f.z2, f.ttl, f.total, f.width] {
                w.extend_from_slice(&v.to_le_bytes());
            }
        }
        self.save_buf = w;
        &self.save_buf
    }

    fn load_bytes(&mut self, bytes: &[u8]) -> i32 {
        if bytes.len() < 6 || &bytes[0..4] != b"BMG1" || bytes[4] != 2 {
            return -1;
        }
        struct R<'a> {
            b: &'a [u8],
            p: usize,
            ok: bool,
        }
        impl<'a> R<'a> {
            fn take(&mut self, n: usize) -> &'a [u8] {
                if self.p + n > self.b.len() {
                    self.ok = false;
                    return &[];
                }
                let out = &self.b[self.p..self.p + n];
                self.p += n;
                out
            }
            fn u8(&mut self) -> u8 {
                self.take(1).first().copied().unwrap_or(0)
            }
            fn u16(&mut self) -> u16 {
                let b = self.take(2);
                if b.len() == 2 {
                    u16::from_le_bytes([b[0], b[1]])
                } else {
                    0
                }
            }
            fn u32(&mut self) -> u32 {
                let b = self.take(4);
                if b.len() == 4 {
                    u32::from_le_bytes([b[0], b[1], b[2], b[3]])
                } else {
                    0
                }
            }
            fn f32(&mut self) -> f32 {
                f32::from_bits(self.u32())
            }
            fn f64(&mut self) -> f64 {
                let hi = self.u32() as u64;
                let lo = self.u32() as u64;
                f64::from_bits((hi << 32) | lo)
            }
        }
        let mut r = R { b: bytes, p: 5, ok: true };
        let seed = r.u32();
        let mut fresh = Sim::new(seed);
        fresh.rng = r.u32();
        fresh.brass = r.f32();
        fresh.ingots = r.f32();
        fresh.core = r.f32();
        fresh.core_max = r.f32();
        fresh.wave = r.u32().max(1);
        fresh.phase = r.u8().min(2);
        fresh.countdown = r.f32();
        fresh.sim_ms = r.f64();
        fresh.score = r.u32();
        fresh.kills = r.u32();
        for i in 0..4 {
            fresh.city[i] = r.u8().min(3);
        }
        fresh.next_id = r.u32().max(1);
        fresh.spawn_interval = r.f32();
        fresh.spawn_timer = r.f32();
        let spawn_index = r.u32() as usize;
        fresh.boss_wave = r.u8() != 0;

        let queue_len = r.u16() as usize;
        if queue_len > 128 {
            return -2;
        }
        for _ in 0..queue_len {
            fresh.spawn_queue.push(r.u8());
        }
        fresh.spawn_index = spawn_index.min(fresh.spawn_queue.len());

        let tower_count = r.u16() as usize;
        if tower_count > MAX_TOWERS {
            return -2;
        }
        for _ in 0..tower_count {
            let kind = r.u8();
            let level = r.u8().min(2);
            let gx = r.u8() as usize;
            let gz = r.u8() as usize;
            let cd = r.f32();
            let spent = r.f32();
            let angle = r.f32();
            let id = r.u32();
            if gx >= GW || gz >= GH {
                return -2;
            }
            fresh.towers.push(Tower {
                kind,
                level,
                gx,
                gz,
                cd,
                spent,
                angle,
                id,
            });
        }
        let enemy_count = r.u16() as usize;
        if enemy_count > MAX_ENEMIES {
            return -2;
        }
        for _ in 0..enemy_count {
            let kind = r.u8();
            let flags = r.u8();
            let hp = r.f32();
            let max_hp = r.f32();
            let x = r.f32();
            let z = r.f32();
            let speed = r.f32();
            let slow = r.f32();
            let slow_t = r.f32();
            let bounty = r.f32();
            let armor = r.f32();
            let angle = r.f32();
            let progress = r.f32();
            let leak = r.u8();
            let id = r.u32();
            fresh.enemies.push(Enemy {
                kind,
                hp,
                max_hp,
                x,
                z,
                speed,
                slow,
                slow_t,
                flying: flags & 1 != 0,
                leaked: flags & 2 != 0,
                bounty,
                armor,
                leak,
                id,
                angle,
                progress,
            });
        }
        let proj_count = r.u16() as usize;
        if proj_count > MAX_PROJ {
            return -2;
        }
        for _ in 0..proj_count {
            let kind = r.u8();
            let x = r.f32();
            let z = r.f32();
            let sx = r.f32();
            let sz = r.f32();
            let tx = r.f32();
            let tz = r.f32();
            let ttl = r.f32();
            let total = r.f32();
            let dmg = r.f32();
            let slow = r.f32();
            fresh.projectiles.push(Projectile {
                kind,
                x,
                z,
                sx,
                sz,
                tx,
                tz,
                ttl,
                total,
                dmg,
                slow,
            });
        }
        let fx_count = r.u16() as usize;
        if fx_count > MAX_FX {
            return -2;
        }
        for _ in 0..fx_count {
            let kind = r.u8();
            let x1 = r.f32();
            let z1 = r.f32();
            let x2 = r.f32();
            let z2 = r.f32();
            let ttl = r.f32();
            let total = r.f32();
            let width = r.f32();
            fresh.fx.push(Fx {
                kind,
                x1,
                z1,
                x2,
                z2,
                ttl,
                total,
                width,
            });
        }
        if !r.ok {
            return -2;
        }
        fresh.recompute();
        fresh.fill_snapshot();
        *self = fresh;
        0
    }

    fn preview_count(&self, kind: u8) -> u32 {
        composition(self.wave).iter().filter(|k| **k == kind).count() as u32
    }
}

thread_local! {
    static SIM: RefCell<Sim> = RefCell::new(Sim::new(0x5EED_1234));
}

fn with_sim<T>(f: impl FnOnce(&mut Sim) -> T) -> T {
    SIM.with(|cell| {
        let mut sim = cell.borrow_mut();
        f(&mut sim)
    })
}

#[no_mangle]
pub extern "C" fn sim_version() -> u32 {
    1
}

#[no_mangle]
pub extern "C" fn sim_init(seed: u32) {
    with_sim(|s| {
        *s = Sim::new(seed);
    });
}

#[no_mangle]
pub extern "C" fn sim_step(ms: u32) {
    with_sim(|s| {
        let total = (ms.min(1000) as f32) / 1000.0;
        let mut left = total;
        while left > 0.0001 {
            let dt = left.min(0.033);
            s.tick(dt);
            left -= dt;
        }
    });
}

#[no_mangle]
pub extern "C" fn sim_place(gx: u32, gz: u32, kind: u32) -> i32 {
    with_sim(|s| s.place(gx as usize, gz as usize, kind as u8))
}

#[no_mangle]
pub extern "C" fn sim_can_place(gx: u32, gz: u32, kind: u32) -> i32 {
    with_sim(|s| s.can_place(gx as usize, gz as usize, kind as u8))
}

#[no_mangle]
pub extern "C" fn sim_upgrade(index: u32) -> i32 {
    with_sim(|s| s.upgrade(index as usize))
}

#[no_mangle]
pub extern "C" fn sim_sell(index: u32) -> i32 {
    with_sim(|s| s.sell(index as usize))
}

#[no_mangle]
pub extern "C" fn sim_city(kind: u32) -> i32 {
    with_sim(|s| s.build_city(kind as u8))
}

#[no_mangle]
pub extern "C" fn sim_repair() -> i32 {
    with_sim(|s| s.repair())
}

#[no_mangle]
pub extern "C" fn sim_call_wave() -> i32 {
    with_sim(|s| s.start_wave())
}

#[no_mangle]
pub extern "C" fn sim_snapshot_len() -> u32 {
    SNAP_LEN as u32
}

#[no_mangle]
pub extern "C" fn sim_snapshot_ptr() -> *const f32 {
    with_sim(|s| {
        s.fill_snapshot();
        s.snap.as_ptr()
    })
}

#[no_mangle]
pub extern "C" fn sim_cell_state(gx: u32, gz: u32) -> i32 {
    with_sim(|s| {
        let (gx, gz) = (gx as usize, gz as usize);
        if gx >= GW || gz >= GH {
            return 5;
        }
        if gx == ENTRY_X && gz == ENTRY_Z {
            return 2;
        }
        if gx == CORE_X && gz == CORE_Z {
            return 3;
        }
        if terrain(gx, gz) {
            return 1;
        }
        if s.tower_index(gx, gz).is_some() {
            return 4;
        }
        0
    })
}

#[no_mangle]
pub extern "C" fn sim_tower_at(gx: u32, gz: u32) -> i32 {
    with_sim(|s| match s.tower_index(gx as usize, gz as usize) {
        Some(i) => i as i32,
        None => -1,
    })
}

#[no_mangle]
pub extern "C" fn sim_tower_cost(kind: u32) -> f32 {
    tower_cost(kind as u8)
}

#[no_mangle]
pub extern "C" fn sim_tower_info(index: u32, field: u32) -> f32 {
    with_sim(|s| {
        let i = index as usize;
        if i >= s.towers.len() {
            return -1.0;
        }
        let t = &s.towers[i];
        let (dmg, range, rate, slow) = tower_stats(t.kind, t.level);
        match field {
            0 => dmg,
            1 => range,
            2 => rate,
            3 => slow,
            4 => t.spent,
            5 => upgrade_brass(t.level),
            6 => upgrade_ingots(t.level),
            7 => t.level as f32,
            8 => t.kind as f32,
            9 => t.cd,
            _ => -1.0,
        }
    })
}

#[no_mangle]
pub extern "C" fn sim_sell_value(index: u32) -> f32 {
    with_sim(|s| {
        let i = index as usize;
        if i >= s.towers.len() {
            return 0.0;
        }
        (s.towers[i].spent * 0.6).round()
    })
}

#[no_mangle]
pub extern "C" fn sim_city_cost(kind: u32, level: u32, ingots: u32) -> f32 {
    with_sim(|s| {
        let (b, i) = s.city_cost(kind as u8, level as usize);
        if ingots == 1 {
            i
        } else {
            b
        }
    })
}

#[no_mangle]
pub extern "C" fn sim_repair_cost_value() -> f32 {
    repair_cost()
}

#[no_mangle]
pub extern "C" fn sim_enemy_info(kind: u32, field: u32) -> f32 {
    let (hp, speed, bounty, armor, leak, flying) = enemy_base(kind as u8);
    match field {
        0 => hp,
        1 => speed,
        2 => bounty,
        3 => armor,
        4 => leak as f32,
        5 => flying as u8 as f32,
        _ => 0.0,
    }
}

#[no_mangle]
pub extern "C" fn sim_preview_count(kind: u32) -> u32 {
    with_sim(|s| s.preview_count(kind as u8))
}

#[no_mangle]
pub extern "C" fn sim_save_len() -> u32 {
    with_sim(|s| s.save_bytes().len() as u32)
}

#[no_mangle]
pub extern "C" fn sim_save_ptr() -> *const u8 {
    with_sim(|s| {
        s.save_bytes();
        s.save_buf.as_ptr()
    })
}

#[no_mangle]
pub extern "C" fn sim_load(ptr: *const u8, len: u32) -> i32 {
    if ptr.is_null() || len == 0 || len > 1_000_000 {
        return -1;
    }
    let bytes = unsafe { std::slice::from_raw_parts(ptr, len as usize) };
    with_sim(|s| s.load_bytes(bytes))
}

#[no_mangle]
pub extern "C" fn sim_path_steps() -> i32 {
    with_sim(|s| s.path_len)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fresh() -> Sim {
        Sim::new(7)
    }

    #[test]
    fn straight_path_is_sixteen_steps() {
        let s = fresh();
        assert_eq!(s.path_len, 16);
        assert!(s.path_pts.len() >= 17);
    }

    #[test]
    fn a_tower_detours_the_route() {
        let mut s = fresh();
        s.brass = 1000.0;
        assert_eq!(s.place(8, 6, 3), 0);
        assert!(s.path_len > 16, "path {}", s.path_len);
    }

    #[test]
    fn sealing_the_core_is_refused() {
        let mut s = fresh();
        s.brass = 99_999.0;
        let mut refusals = 0;
        for gz in 0..GH {
            let code = s.place(8, gz, 0);
            if code != 0 {
                refusals += 1;
            }
        }
        assert!(refusals > 0, "a full wall must be refused");
        assert!(s.path_len >= 0, "a route must remain");
    }

    #[test]
    fn accepted_walls_never_leave_an_over_budget_route() {
        let mut s = fresh();
        s.brass = 99_999.0;
        let mut refused = 0;
        for gz in 0..GH {
            for gx in 0..GW {
                if s.place(gx, gz, 3) != 0 {
                    refused += 1;
                }
            }
        }
        assert!(refused > 0, "a sealed field must refuse placements");
        assert!(s.path_len >= 0 && s.path_len <= MAX_PATH, "path {}", s.path_len);
    }

    #[test]
    fn wave_spawns_ground_and_air() {
        let mut s = fresh();
        assert_eq!(s.start_wave(), 0);
        for _ in 0..120 {
            s.tick(0.033);
        }
        assert!(!s.enemies.is_empty());
        s.wave = 5;
        s.phase = 0;
        s.countdown = 0.0;
        assert_eq!(s.start_wave(), 0);
        for _ in 0..120 {
            s.tick(0.033);
        }
        assert!(s.enemies.iter().any(|e| e.flying));
    }

    #[test]
    fn armor_reduces_a_hit_but_not_to_zero() {
        let mut s = fresh();
        s.enemies.push(Enemy {
            kind: 2,
            hp: 100.0,
            max_hp: 100.0,
            x: 0.0,
            z: 0.0,
            speed: 1.0,
            slow: 0.0,
            slow_t: 0.0,
            flying: false,
            leaked: false,
            bounty: 1.0,
            armor: 6.0,
            leak: 1,
            id: 1,
            angle: 0.0,
            progress: 0.0,
        });
        s.hit(0, 9.0, 0.0);
        assert!((s.enemies[0].hp - 97.0).abs() < 0.01);
        s.hit(0, 9.0, 8.0);
        assert!((s.enemies[0].hp - 88.0).abs() < 0.01);
    }

    #[test]
    fn city_production_feeds_the_wallet() {
        let mut s = fresh();
        s.city[1] = 1;
        s.city[0] = 1;
        let brass = s.brass;
        let ingots = s.ingots;
        s.tick(1.0);
        assert!(s.brass > brass + 0.5);
        assert!(s.ingots > ingots + 0.2);
    }

    #[test]
    fn save_round_trip_keeps_the_battle() {
        let mut a = fresh();
        a.brass = 500.0;
        assert_eq!(a.place(6, 4, 1), 0);
        assert_eq!(a.start_wave(), 0);
        for _ in 0..60 {
            a.tick(0.033);
        }
        let bytes = a.save_bytes().to_vec();
        let mut b = Sim::new(1);
        assert_eq!(b.load_bytes(&bytes), 0);
        assert_eq!(a.path_len, b.path_len);
        assert_eq!(a.towers.len(), b.towers.len());
        assert_eq!(a.wave, b.wave);
        assert_eq!(a.enemies.len(), b.enemies.len());
        assert!((a.brass - b.brass).abs() < 0.001);
    }

    #[test]
    fn repair_refuses_at_full_health() {
        let mut s = fresh();
        assert_eq!(s.repair(), -2);
        s.core = 10.0;
        s.brass = 100.0;
        assert_eq!(s.repair(), 0);
        assert!(s.core > 10.0);
    }

    #[test]
    fn endless_waves_have_a_boss_rhythm() {
        let w10 = composition(10);
        assert!(w10.contains(&4));
        let w15 = composition(15);
        assert!(w15.contains(&4));
        let w16 = composition(16);
        assert!(!w16.is_empty());
    }
}
