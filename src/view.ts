import * as THREE from "three";
import { CELL, GRID_H, GRID_W, type Snapshot } from "./sim";

export type Cell = { gx: number; gz: number };

export type ViewOptions = {
  snapshot: Snapshot;
  selectedTower: number | null;
  buildKind: number | null;
  hover: Cell | null;
  hoverOk: boolean;
  paused: boolean;
};

const COL = {
  floor: 0x142326,
  floorEdge: 0x0c181a,
  brass: 0xd9a85f,
  brassHot: 0xf4cd87,
  teal: 0x53d6c7,
  ink: 0x071113,
  rust: 0xb6533b,
  lime: 0xbfe36b,
  danger: 0xe2664f,
  ivory: 0xf1e6cf,
};

function worldX(gx: number): number {
  return (gx - (GRID_W - 1) / 2) * CELL;
}

function worldZ(gz: number): number {
  return (gz - (GRID_H - 1) / 2) * CELL;
}

function roundedRect(shape: THREE.Shape, x: number, y: number, w: number, h: number, r: number) {
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
}

type EnemySlot = {
  group: THREE.Group;
  body: THREE.Group;
  kind: number;
  bar: THREE.Group;
  fill: THREE.Mesh;
  slow: THREE.Mesh;
  phase: number;
};

export class Battlefield {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.7);
  private readonly target = new THREE.Vector3(0, 0, -1.5);
  private baseW = 40;
  private baseH = 32;
  private zoom = 1;
  private pointers = new Map<number, { x: number; y: number }>();
  private dragging = false;
  private moved = 0;
  private downAt = 0;
  private pinchDist = 0;
  private readonly towerGroup = new THREE.Group();
  private readonly enemyGroup = new THREE.Group();
  private readonly fxGroup = new THREE.Group();
  private readonly pathMesh: THREE.InstancedMesh;
  private readonly pathDummy = new THREE.Object3D();
  private readonly towerCache = new Map<number, THREE.Group>();
  private readonly towerSig = { value: "" };
  private readonly enemies: EnemySlot[] = [];
  private readonly projectiles: THREE.Mesh[] = [];
  private readonly beams: THREE.LineSegments;
  private readonly beamPos: Float32Array;
  private readonly beamCol: Float32Array;
  private readonly blasts: THREE.Mesh[] = [];
  private readonly selectionRing: THREE.Mesh;
  private readonly rangeRing: THREE.Mesh;
  private readonly hoverPlane: THREE.Mesh;
  private coreCrystal!: THREE.Mesh;
  private coreRing!: THREE.Mesh;
  private coreGlow!: THREE.PointLight;
  private readonly city: Array<{ group: THREE.Group; lamp: THREE.MeshStandardMaterial }> = [];
  private readonly rubbleGroups: THREE.Group[] = [];
  private readonly dust: THREE.Points;
  private pathSig = "";
  private lastTime = 0;
  private hovered: Cell | null = null;

  onTap: (cell: Cell) => void = () => {};
  onHover: (cell: Cell | null) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearAlpha(0);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x081214, 0.012);
    this.camera = new THREE.OrthographicCamera(-20, 20, 16, -16, 0.1, 180);
    this.camera.position.set(0, 40, 27);
    this.camera.lookAt(this.target.x, 0, this.target.z - 1);

    this.buildLights();
    this.buildGround();
    this.pathMesh = this.buildPath();
    this.buildGateAndCore();

    this.beamPos = new Float32Array(128 * 2 * 3);
    this.beamCol = new Float32Array(128 * 2 * 3);
    const beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute("position", new THREE.BufferAttribute(this.beamPos, 3));
    beamGeo.setAttribute("color", new THREE.BufferAttribute(this.beamCol, 3));
    beamGeo.setDrawRange(0, 0);
    this.beams = new THREE.LineSegments(
      beamGeo,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.beams.frustumCulled = false;
    this.fxGroup.add(this.beams);

    const ringGeo = new THREE.RingGeometry(0.72, 0.95, 40);
    const ringMat = new THREE.MeshBasicMaterial({
      color: COL.brassHot,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 24; i++) {
      const ring = new THREE.Mesh(ringGeo, ringMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      this.blasts.push(ring);
      this.fxGroup.add(ring);
    }

    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1.04, 8),
      new THREE.MeshBasicMaterial({
        color: COL.brassHot,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.position.y = 0.09;
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);

    this.rangeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.985, 1, 72),
      new THREE.MeshBasicMaterial({
        color: COL.teal,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.rangeRing.rotation.x = -Math.PI / 2;
    this.rangeRing.position.y = 0.075;
    this.rangeRing.visible = false;
    this.scene.add(this.rangeRing);

    this.hoverPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(CELL * 0.94, CELL * 0.94),
      new THREE.MeshBasicMaterial({
        color: COL.teal,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.hoverPlane.rotation.x = -Math.PI / 2;
    this.hoverPlane.position.y = 0.065;
    this.hoverPlane.visible = false;
    this.scene.add(this.hoverPlane);

    this.scene.add(this.towerGroup, this.enemyGroup);
    this.fxGroup.renderOrder = 4;
    this.scene.add(this.fxGroup);

    this.dust = this.buildDust();
    this.scene.add(this.dust);

    this.bindInput();
    this.resize();
    window.addEventListener("resize", this.resize);
    this.applyCamera();
  }

  private buildLights() {
    const hemi = new THREE.HemisphereLight(0x9be4dc, 0x160f0a, 1.15);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffe1ad, 2.5);
    key.position.set(10, 28, 16);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -24;
    key.shadow.camera.right = 24;
    key.shadow.camera.top = 22;
    key.shadow.camera.bottom = -22;
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 70;
    key.shadow.bias = -0.0006;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x4ecfc3, 1.2);
    rim.position.set(-18, 12, -12);
    this.scene.add(rim);
    this.coreGlow = new THREE.PointLight(0xffb35c, 22, 16, 2);
    this.coreGlow.position.set(worldX(0), 2.4, worldZ(6));
    this.scene.add(this.coreGlow);
  }

  private buildGround() {
    const shape = new THREE.Shape();
    roundedRect(shape, -20.5, -19.5, 41, 35, 2.6);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 1.2,
      bevelEnabled: true,
      bevelSize: 0.22,
      bevelThickness: 0.22,
      bevelSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    const slab = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: COL.floor, roughness: 0.86, metalness: 0.22 }),
    );
    slab.position.y = -1.2;
    slab.receiveShadow = true;
    this.scene.add(slab);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo, 24),
      new THREE.LineBasicMaterial({ color: COL.brass, transparent: true, opacity: 0.28 }),
    );
    outline.position.y = -1.2;
    this.scene.add(outline);

    const positions: number[] = [];
    for (let gx = 0; gx <= GRID_W; gx++) {
      const x = -16 - CELL / 2 + gx * CELL;
      positions.push(x, 0.02, -13, x, 0.02, 13);
    }
    for (let gz = 0; gz <= GRID_H; gz++) {
      const z = -12 - CELL / 2 + gz * CELL;
      positions.push(-17, 0.02, z, 17, 0.02, z);
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    this.scene.add(
      new THREE.LineSegments(
        gridGeo,
        new THREE.LineBasicMaterial({ color: 0x6e988f, transparent: true, opacity: 0.2 }),
      ),
    );

    const trimGeo = new THREE.BoxGeometry(41.4, 0.08, 0.12);
    const trimMat = new THREE.MeshBasicMaterial({ color: COL.brass, transparent: true, opacity: 0.5 });
    for (const z of [-19.3, 15.3]) {
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.set(0, -0.02, z);
      this.scene.add(trim);
    }

    // Keep these cells in step with terrain() in the core.
    this.buildRubble(0, [[4, 2], [4, 3], [5, 2], [12, 10], [13, 10], [12, 9]]);
    this.buildRubble(1, [[7, 3], [7, 4], [8, 3], [8, 9], [9, 9], [9, 8]]);

    this.buildCity();
  }

  private buildRubble(map: number, cells: Array<[number, number]>) {
    const group = new THREE.Group();
    group.visible = map === 0;
    const rockGeo = new THREE.DodecahedronGeometry(0.78, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x2b3b3c, roughness: 0.95 });
    for (const [gx, gz] of cells) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(worldX(gx), 0.38, worldZ(gz));
      rock.rotation.set(gx * 0.4, gz * 0.7, 0.2);
      rock.scale.set(1.15, 0.65, 0.95);
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);
      const shard = new THREE.Mesh(rockGeo, rockMat);
      shard.position.set(worldX(gx) + 0.65, 0.18, worldZ(gz) - 0.5);
      shard.scale.setScalar(0.4);
      shard.castShadow = true;
      group.add(shard);
    }
    this.rubbleGroups.push(group);
    this.scene.add(group);
  }

  private buildCity() {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(27, 0.7, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x1a2c2e, roughness: 0.8, metalness: 0.2 }),
    );
    base.position.set(0, -0.1, -17.2);
    base.receiveShadow = true;
    this.scene.add(base);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(27, 0.06, 0.12),
      new THREE.MeshBasicMaterial({ color: COL.brass, transparent: true, opacity: 0.5 }),
    );
    strip.position.set(0, 0.26, -15.45);
    this.scene.add(strip);

    const xs = [-9.6, -3.2, 3.2, 9.6];
    const builders: Array<() => { group: THREE.Group; lamp: THREE.MeshStandardMaterial }> = [
      () => this.cityFoundry(),
      () => this.cityKiln(),
      () => this.cityWorkshop(),
      () => this.cityDepot(),
    ];
    for (let i = 0; i < 4; i++) {
      const built = builders[i]();
      built.group.position.set(xs[i], 0.25, -17.2);
      this.scene.add(built.group);
      this.city.push(built);
    }
  }

  private cityFoundry() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.1, 1.7),
      new THREE.MeshStandardMaterial({ color: 0x314244, roughness: 0.8 }),
    );
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);
    const chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.32, 2.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x3e5052, roughness: 0.85 }),
    );
    chimney.position.set(0.55, 1.9, -0.35);
    chimney.castShadow = true;
    group.add(chimney);
    const lamp = new THREE.MeshStandardMaterial({
      color: 0x5b3a17,
      emissive: 0xffa54d,
      emissiveIntensity: 0.1,
      roughness: 0.4,
    });
    const vent = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.1), lamp);
    vent.position.set(0, 0.5, 0.87);
    group.add(vent);
    return { group, lamp };
  }

  private cityKiln() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.2, 0.5, 12),
      new THREE.MeshStandardMaterial({ color: 0x3a3a32, roughness: 0.9 }),
    );
    base.position.y = 0.25;
    base.castShadow = true;
    group.add(base);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x55503f, roughness: 0.85 }),
    );
    dome.position.y = 0.5;
    dome.castShadow = true;
    group.add(dome);
    const lamp = new THREE.MeshStandardMaterial({
      color: 0x43260c,
      emissive: 0xff8c3a,
      emissiveIntensity: 0.1,
      roughness: 0.5,
    });
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.1), lamp);
    mouth.position.set(0, 0.62, 1.0);
    group.add(mouth);
    return { group, lamp };
  }

  private cityWorkshop() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.9, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x2e4144, roughness: 0.8 }),
    );
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 2.3, 6),
      new THREE.MeshStandardMaterial({ color: COL.brass, metalness: 0.7, roughness: 0.4 }),
    );
    mast.position.set(-0.6, 1.65, 0);
    group.add(mast);
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.1, 0.1),
      new THREE.MeshStandardMaterial({ color: COL.brass, metalness: 0.7, roughness: 0.4 }),
    );
    arm.position.set(0.1, 2.7, 0);
    group.add(arm);
    const lamp = new THREE.MeshStandardMaterial({
      color: 0x2d4a3a,
      emissive: 0x8fffc4,
      emissiveIntensity: 0.1,
      roughness: 0.5,
    });
    const workLight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lamp);
    workLight.position.set(0.85, 2.7, 0);
    group.add(workLight);
    return { group, lamp };
  }

  private cityDepot() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2.0, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x26383a, roughness: 0.85 }),
    );
    body.position.y = 1.0;
    body.castShadow = true;
    group.add(body);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 0.6, 4),
      new THREE.MeshStandardMaterial({ color: 0x3a4a4b, roughness: 0.8 }),
    );
    cap.position.y = 2.2;
    cap.rotation.y = Math.PI / 4;
    group.add(cap);
    const lamp = new THREE.MeshStandardMaterial({
      color: 0x3a2a14,
      emissive: 0xffce7a,
      emissiveIntensity: 0.1,
      roughness: 0.4,
    });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), lamp);
    beacon.position.y = 2.65;
    group.add(beacon);
    return { group, lamp };
  }

  private buildPath(): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.07, 8),
      new THREE.MeshStandardMaterial({
        color: COL.brassHot,
        emissive: 0x704415,
        emissiveIntensity: 0.9,
        metalness: 0.6,
        roughness: 0.35,
      }),
      64,
    );
    mesh.count = 0;
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    return mesh;
  }

  private buildGateAndCore() {
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x3b2a1d, metalness: 0.6, roughness: 0.5 });
    const gateHot = new THREE.MeshStandardMaterial({
      color: 0x5a1e10,
      emissive: COL.danger,
      emissiveIntensity: 1.2,
      roughness: 0.4,
    });
    for (const dz of [-1.6, 1.6]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.6, 0.55), gateMat);
      pillar.position.set(worldX(16) + 1.15, 1.3, worldZ(6) + dz);
      pillar.castShadow = true;
      this.scene.add(pillar);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), gateHot);
      lamp.position.set(worldX(16) + 1.15, 2.1, worldZ(6) + dz);
      this.scene.add(lamp);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 3.8), gateMat);
    beam.position.set(worldX(16) + 1.15, 2.75, worldZ(6));
    beam.castShadow = true;
    this.scene.add(beam);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.65, 1.95, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a3636, metalness: 0.5, roughness: 0.6 }),
    );
    base.position.set(worldX(0), 0.27, worldZ(6));
    base.castShadow = true;
    base.receiveShadow = true;
    this.scene.add(base);
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.35, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x4b3a26, metalness: 0.6, roughness: 0.45 }),
    );
    plinth.position.set(worldX(0), 0.72, worldZ(6));
    this.scene.add(plinth);
    this.coreCrystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffd18a,
        emissive: 0xff9f45,
        emissiveIntensity: 2.2,
        metalness: 0.3,
        roughness: 0.2,
      }),
    );
    this.coreCrystal.position.set(worldX(0), 2.15, worldZ(6));
    this.coreCrystal.castShadow = true;
    this.scene.add(this.coreCrystal);
    this.coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.07, 8, 48),
      new THREE.MeshBasicMaterial({
        color: COL.brassHot,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.coreRing.rotation.x = Math.PI / 2;
    this.coreRing.position.set(worldX(0), 1.15, worldZ(6));
    this.scene.add(this.coreRing);
  }

  private buildDust(): THREE.Points {
    const count = 180;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 44;
      positions[i * 3 + 1] = 0.4 + Math.random() * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 38;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xf3d9a2,
        size: 0.055,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
  }

  private bindInput() {
    const canvas = this.canvas;
    canvas.addEventListener("pointerdown", (event) => {
      canvas.setPointerCapture(event.pointerId);
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.pointers.size === 1) {
        this.dragging = true;
        this.moved = 0;
        this.downAt = performance.now();
      }
      if (this.pointers.size === 2) {
        this.pinchDist = this.pointerDistance();
        this.dragging = false;
      }
    });
    canvas.addEventListener("pointermove", (event) => {
      const previous = this.pointers.get(event.pointerId);
      if (!previous) {
        if (event.pointerType === "mouse") this.hover(event.clientX, event.clientY);
        return;
      }
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.pointers.size === 2) {
        const next = this.pointerDistance();
        if (this.pinchDist > 0) {
          this.zoom = THREE.MathUtils.clamp(this.zoom * (next / this.pinchDist), 0.62, 2.1);
          this.applyCamera();
        }
        this.pinchDist = next;
        return;
      }
      if (!this.dragging) return;
      this.moved += Math.abs(dx) + Math.abs(dy);
      if (this.moved > 7) {
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, rect.width);
        const h = Math.max(1, rect.height);
        this.target.x = THREE.MathUtils.clamp(this.target.x - (dx / w) * this.viewWidth(), -12, 12);
        this.target.z = THREE.MathUtils.clamp(this.target.z - (dy / h) * this.viewHeight(), -8, 8);
        this.applyCamera();
        this.hoverPlane.visible = false;
        this.hovered = null;
        this.onHover(null);
      }
    });
    const finish = (event: PointerEvent) => {
      const wasTap = this.pointers.size === 1 && this.dragging && this.moved <= 7 && performance.now() - this.downAt < 600;
      this.pointers.delete(event.pointerId);
      if (this.pointers.size === 0) {
        this.dragging = false;
        if (wasTap) this.tap(event.clientX, event.clientY);
      }
      if (this.pointers.size < 2) this.pinchDist = 0;
    };
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
    canvas.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse" && this.pointers.size === 0) {
        this.hoverPlane.visible = false;
        this.hovered = null;
        this.onHover(null);
      }
    });
    canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        this.zoom = THREE.MathUtils.clamp(this.zoom * (event.deltaY > 0 ? 0.92 : 1.08), 0.62, 2.1);
        this.applyCamera();
      },
      { passive: false },
    );
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  private pointerDistance(): number {
    const points = [...this.pointers.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  private hover(clientX: number, clientY: number) {
    const cell = this.cellAt(clientX, clientY);
    if (!cell) {
      this.hovered = null;
      this.onHover(null);
      return;
    }
    if (!this.hovered || this.hovered.gx !== cell.gx || this.hovered.gz !== cell.gz) {
      this.hovered = cell;
      this.onHover(cell);
    }
  }

  private tap(clientX: number, clientY: number) {
    const cell = this.cellAt(clientX, clientY);
    if (cell) this.onTap(cell);
  }

  private cellAt(clientX: number, clientY: number): Cell | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.plane, hit)) return null;
    const gx = Math.round(hit.x / CELL + (GRID_W - 1) / 2);
    const gz = Math.round(hit.z / CELL + (GRID_H - 1) / 2);
    if (gx < 0 || gz < 0 || gx >= GRID_W || gz >= GRID_H) return null;
    return { gx, gz };
  }

  private viewWidth(): number {
    return this.baseW / this.zoom;
  }

  private viewHeight(): number {
    return this.baseH / this.zoom;
  }

  private resize = () => {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    const aspect = Math.max(0.45, width / Math.max(1, height));
    this.baseH = Math.max(30, 38 / aspect);
    this.baseW = this.baseH * aspect;
    this.applyCamera();
  };

  private applyCamera() {
    this.camera.left = -this.viewWidth() / 2;
    this.camera.right = this.viewWidth() / 2;
    this.camera.top = this.viewHeight() / 2;
    this.camera.bottom = -this.viewHeight() / 2;
    this.camera.position.set(this.target.x, 40, this.target.z + 27);
    this.camera.lookAt(this.target.x, 0, this.target.z - 1);
    this.camera.updateProjectionMatrix();
  }

  private makeTower(kind: number, level: number): THREE.Group {
    const group = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a3a3b, metalness: 0.4, roughness: 0.62 });
    const brass = new THREE.MeshStandardMaterial({
      color: COL.brass,
      metalness: 0.75,
      roughness: 0.3,
      emissive: 0x3c2608,
      emissiveIntensity: 0.5,
    });
    const glow = new THREE.MeshStandardMaterial({
      color: 0x7df5e0,
      emissive: COL.teal,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 0.26, 8), dark);
    base.position.y = 0.13;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.055, 6, 24), brass);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.3;
    group.add(collar);

    const head = new THREE.Group();
    head.position.y = 0.32;
    group.add(head);
    group.userData.head = head;
    group.userData.kind = kind;

    if (kind === 0) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 1.25, 8), dark);
      stem.position.y = 0.62;
      stem.castShadow = true;
      head.add(stem);
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.07, 6, 20), brass);
      coil.position.y = 1.2;
      coil.rotation.x = Math.PI / 2;
      head.add(coil);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), glow);
      orb.position.y = 1.38;
      head.add(orb);
      head.userData.spin = coil;
    } else if (kind === 1) {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 0.55, 8), dark);
      body.position.y = 0.3;
      body.castShadow = true;
      head.add(body);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 1.05, 10), brass);
      barrel.position.set(0.32, 0.72, 0);
      barrel.rotation.z = -0.85;
      barrel.castShadow = true;
      head.add(barrel);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 6, 16), glow);
      lip.position.set(0.72, 1.03, 0);
      lip.rotation.z = -0.85;
      head.add(lip);
    } else if (kind === 2) {
      for (let i = 0; i < 3; i++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.25, 0.09), dark);
        const a = (i / 3) * Math.PI * 2;
        leg.position.set(Math.cos(a) * 0.38, 0.66, Math.sin(a) * 0.38);
        leg.rotation.z = Math.cos(a) * 0.18;
        leg.rotation.x = -Math.sin(a) * 0.18;
        head.add(leg);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.75), brass);
      rail.position.set(0, 1.28, 0.35);
      rail.castShadow = true;
      head.add(rail);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), glow);
      tip.position.set(0, 1.28, 1.22);
      head.add(tip);
    } else {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const prong = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.92, 5), brass);
        prong.position.set(Math.cos(a) * 0.42, 0.82, Math.sin(a) * 0.42);
        prong.rotation.z = Math.cos(a) * 0.3;
        prong.rotation.x = -Math.sin(a) * 0.3;
        head.add(prong);
      }
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), glow);
      orb.position.y = 1.05;
      head.add(orb);
      head.userData.orb = orb;
    }
    for (let i = 0; i < level; i++) {
      const pip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 4), brass);
      const a = (i / 3) * Math.PI * 2 + 0.4;
      pip.position.set(Math.cos(a) * 0.82, 0.34, Math.sin(a) * 0.82);
      group.add(pip);
    }
    group.position.y = 0.02;
    return group;
  }

  private makeEnemy(kind: number): { body: THREE.Group; slow: THREE.Mesh } {
    const body = new THREE.Group();
    const slowRing = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.55, 24),
      new THREE.MeshBasicMaterial({
        color: COL.teal,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    slowRing.rotation.x = -Math.PI / 2;
    slowRing.position.y = 0.09;
    body.add(slowRing);
    if (kind === 0) {
      const shell = new THREE.MeshStandardMaterial({ color: 0x7a3b2c, roughness: 0.85 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.62, 0.9), shell);
      torso.position.y = 0.55;
      torso.castShadow = true;
      body.add(torso);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.4), shell);
      head.position.set(0.22, 1.0, 0);
      body.add(head);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xff9a3c, emissiveIntensity: 2 }),
      );
      eye.position.set(0.45, 1.03, 0.12);
      body.add(eye);
    } else if (kind === 1) {
      const shell = new THREE.MeshStandardMaterial({ color: 0xa64d33, roughness: 0.8 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.55), shell);
      torso.position.y = 0.45;
      torso.castShadow = true;
      body.add(torso);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 5), shell);
      head.rotation.z = -Math.PI / 2;
      head.position.set(0.62, 0.56, 0);
      body.add(head);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 0.8, 5), shell);
      tail.rotation.z = 1.1;
      tail.position.set(-0.65, 0.62, 0);
      body.add(tail);
    } else if (kind === 2) {
      const armor = new THREE.MeshStandardMaterial({ color: 0x53605e, metalness: 0.5, roughness: 0.55 });
      const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.72, 0), armor);
      torso.position.y = 0.72;
      torso.castShadow = true;
      body.add(torso);
      for (const z of [-0.5, 0.5]) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.16), armor);
        plate.position.set(0, 0.8, z);
        body.add(plate);
      }
      const eye = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.08, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xff8f6a, emissive: 0xff5a32, emissiveIntensity: 2 }),
      );
      eye.position.set(0.64, 0.8, 0);
      body.add(eye);
    } else if (kind === 3) {
      const orb = new THREE.MeshStandardMaterial({
        color: 0x75e6d8,
        emissive: COL.teal,
        emissiveIntensity: 1.6,
        roughness: 0.3,
      });
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), orb);
      core.position.y = 1.35;
      body.add(core);
      for (const z of [-0.55, 0.55]) {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.8, 4), orb);
        fin.rotation.z = Math.PI / 2;
        fin.position.set(-0.1, 1.35, z);
        body.add(fin);
      }
    } else {
      const shell = new THREE.MeshStandardMaterial({ color: 0x3a2528, metalness: 0.55, roughness: 0.5 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.5, 1.25), shell);
      torso.position.y = 1.35;
      torso.castShadow = true;
      body.add(torso);
      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshStandardMaterial({ color: 0xffc16b, emissive: 0xff5b2e, emissiveIntensity: 2.6 }),
      );
      core.position.set(0.65, 1.55, 0);
      body.add(core);
      for (const z of [-0.8, 0.8]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.1, 4), shell);
        horn.position.set(0, 2.75, z);
        horn.rotation.x = z > 0 ? -0.4 : 0.4;
        body.add(horn);
      }
    }
    return { body, slow: slowRing };
  }

  private enemySlot(index: number, kind: number): EnemySlot {
    let slot = this.enemies[index];
    if (slot) {
      if (slot.kind !== kind) {
        slot.group.remove(slot.body);
        const made = this.makeEnemy(kind);
        slot.body = made.body;
        slot.slow = made.slow;
        slot.group.add(made.body);
        slot.kind = kind;
      }
      return slot;
    }
    const group = new THREE.Group();
    const made = this.makeEnemy(kind);
    group.add(made.body);
    const bar = new THREE.Group();
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.11),
      new THREE.MeshBasicMaterial({ color: 0x061012, transparent: true, opacity: 0.82, depthWrite: false }),
    );
    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.06),
      new THREE.MeshBasicMaterial({ color: COL.lime, depthWrite: false, transparent: true, opacity: 0.95 }),
    );
    fill.position.z = 0.001;
    bar.add(back, fill);
    bar.visible = false;
    this.scene.add(bar);
    slot = { group, body: made.body, kind, bar, fill, slow: made.slow, phase: Math.random() * 10 };
    this.enemies[index] = slot;
    this.enemyGroup.add(group);
    return slot;
  }

  update(options: ViewOptions) {
    const now = performance.now() / 1000;
    const dt = this.lastTime ? Math.min(0.1, now - this.lastTime) : 0.016;
    this.lastTime = now;
    const snap = options.snapshot;

    const sig = snap.towers.map((t) => `${t.id}.${t.kind}.${t.level}`).join("|");
    if (sig !== this.towerSig.value) {
      this.towerSig.value = sig;
      for (const child of this.towerGroup.children) {
        child.visible = false;
      }
      for (const tower of snap.towers) {
        let mesh = this.towerCache.get(tower.id);
        if (!mesh) {
          mesh = this.makeTower(tower.kind, tower.level);
          this.towerCache.set(tower.id, mesh);
          this.towerGroup.add(mesh);
        } else {
          mesh.visible = true;
          const level = (mesh.userData.level as number) ?? 0;
          if (level !== tower.level) {
            this.towerGroup.remove(mesh);
            this.towerCache.delete(tower.id);
            mesh = this.makeTower(tower.kind, tower.level);
            this.towerCache.set(tower.id, mesh);
            this.towerGroup.add(mesh);
          }
        }
        mesh.userData.level = tower.level;
        mesh.position.x = tower.x;
        mesh.position.z = tower.z;
      }
      for (const [id, mesh] of this.towerCache) {
        if (!snap.towers.some((t) => t.id === id)) {
          this.towerGroup.remove(mesh);
          this.towerCache.delete(id);
        }
      }
    }
    const byId = new Map(snap.towers.map((t) => [t.id, t]));
    for (const [id, mesh] of this.towerCache) {
      const tower = byId.get(id);
      if (!tower) continue;
      const head = mesh.userData.head as THREE.Group;
      head.rotation.y = -tower.angle + Math.PI / 2;
      const spin = head.userData.spin as THREE.Mesh | undefined;
      if (spin) spin.rotation.z += dt * 1.8;
      const orb = head.userData.orb as THREE.Mesh | undefined;
      if (orb) orb.position.y = 1.05 + Math.sin(now * 2 + id) * 0.06;
    }

    const totalEnemies = Math.max(this.enemies.length, snap.enemies.length);
    for (let i = 0; i < totalEnemies; i++) {
      const enemy = snap.enemies[i];
      if (!enemy) {
        const old = this.enemies[i];
        if (old) {
          old.group.visible = false;
          old.bar.visible = false;
        }
        continue;
      }
      const slot = this.enemySlot(i, enemy.kind);
      slot.group.visible = true;
      const bob = enemy.flying ? 0.12 : 0;
      slot.group.position.set(enemy.x, bob + Math.sin(now * 5 + slot.phase) * (enemy.flying ? 0.08 : 0.03), enemy.z);
      slot.body.rotation.y = -enemy.angle;
      const ratio = enemy.maxHp > 0 ? Math.max(0, enemy.hp / enemy.maxHp) : 0;
      slot.bar.position.set(enemy.x, enemy.boss ? 3.9 : enemy.flying ? 2.15 : 1.45, enemy.z);
      slot.bar.quaternion.copy(this.camera.quaternion);
      slot.bar.visible = ratio < 0.999;
      slot.fill.scale.x = Math.max(0.03, ratio);
      slot.fill.position.x = -(1 - ratio) * 0.45;
      const fillMat = slot.fill.material as THREE.MeshBasicMaterial;
      fillMat.color.setHex(enemy.boss ? COL.danger : ratio < 0.35 ? COL.danger : COL.lime);
      const slowMat = slot.slow.material as THREE.MeshBasicMaterial;
      slowMat.opacity = enemy.slow > 0 ? 0.55 : 0;
    }
    for (let i = snap.enemies.length; i < this.enemies.length; i++) {
      this.enemies[i].group.visible = false;
      this.enemies[i].bar.visible = false;
    }

    for (let i = 0; i < snap.projectiles.length; i++) {
      let mesh = this.projectiles[i];
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.18, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xffd18a, emissive: 0xff7a2e, emissiveIntensity: 2.4 }),
        );
        this.projectiles[i] = mesh;
        this.fxGroup.add(mesh);
      }
      const p = snap.projectiles[i];
      const t = p.total > 0 ? 1 - Math.max(0, p.ttl) / p.total : 1;
      mesh.visible = true;
      mesh.position.set(
        THREE.MathUtils.lerp(p.sx, p.tx, t),
        0.45 + Math.sin(Math.min(1, Math.max(0, t)) * Math.PI) * 2.3,
        THREE.MathUtils.lerp(p.sz, p.tz, t),
      );
    }
    for (let i = snap.projectiles.length; i < this.projectiles.length; i++) {
      this.projectiles[i].visible = false;
    }

    let beam = 0;
    for (const ring of this.blasts) ring.visible = false;
    let blast = 0;
    for (const fx of snap.fx) {
      if (fx.kind === 2) {
        const ring = this.blasts[blast];
        if (ring) {
          const t = 1 - Math.max(0, fx.ttl) / Math.max(0.001, fx.total);
          ring.visible = true;
          ring.position.set(fx.x1, 0.12, fx.z1);
          ring.scale.setScalar(0.9 + t * 2.2);
          const mat = ring.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.75 * (1 - t);
          mat.color.setHex(COL.brassHot);
          blast++;
        }
        continue;
      }
      if (beam < 128) {
        const i = beam * 6;
        this.beamPos[i] = fx.x1;
        this.beamPos[i + 1] = 1.1;
        this.beamPos[i + 2] = fx.z1;
        this.beamPos[i + 3] = fx.x2;
        this.beamPos[i + 4] = 1.1;
        this.beamPos[i + 5] = fx.z2;
        const c = fx.kind === 0 ? new THREE.Color(COL.teal) : new THREE.Color(COL.brassHot);
        for (let k = 0; k < 2; k++) {
          this.beamCol[i + k * 3] = c.r;
          this.beamCol[i + k * 3 + 1] = c.g;
          this.beamCol[i + k * 3 + 2] = c.b;
        }
        beam++;
      }
    }
    const beamGeo = this.beams.geometry;
    beamGeo.setDrawRange(0, beam * 2);
    (beamGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (beamGeo.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;

    const pathSig = `${snap.path.length}:${snap.path.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(";")}`;
    if (pathSig !== this.pathSig) {
      this.pathSig = pathSig;
      this.pathMesh.count = Math.min(64, snap.path.length);
      for (let i = 0; i < this.pathMesh.count; i++) {
        this.pathDummy.position.set(snap.path[i][0], 0.06, snap.path[i][1]);
        this.pathDummy.updateMatrix();
        this.pathMesh.setMatrixAt(i, this.pathDummy.matrix);
      }
      this.pathMesh.instanceMatrix.needsUpdate = true;
    }

    const selected = options.selectedTower !== null ? snap.towers[options.selectedTower] : undefined;
    this.selectionRing.visible = Boolean(selected);
    this.rangeRing.visible = Boolean(selected);
    if (selected) {
      this.selectionRing.position.set(selected.x, 0.1, selected.z);
      this.selectionRing.rotation.z += dt * 0.6;
      this.rangeRing.position.set(selected.x, 0.08, selected.z);
      this.rangeRing.scale.setScalar(selected.range);
    }

    this.hoverPlane.visible = Boolean(options.hover && options.buildKind !== null);
    if (options.hover && options.buildKind !== null) {
      this.hoverPlane.position.set(worldX(options.hover.gx), 0.07, worldZ(options.hover.gz));
      const mat = this.hoverPlane.material as THREE.MeshBasicMaterial;
      mat.color.setHex(options.hoverOk ? COL.teal : COL.danger);
      mat.opacity = options.hoverOk ? 0.28 : 0.34;
    }

    this.coreCrystal.rotation.y += dt * 0.5;
    this.coreCrystal.position.y = 2.15 + Math.sin(now * 1.4) * 0.08;
    this.coreRing.rotation.z += dt * 0.9;
    const hpRatio = snap.coreMax > 0 ? snap.core / snap.coreMax : 0;
    const crystalMat = this.coreCrystal.material as THREE.MeshStandardMaterial;
    crystalMat.emissive.setHex(hpRatio < 0.35 ? COL.danger : 0xff9f45);
    this.coreGlow.intensity = 14 + hpRatio * 12 + Math.sin(now * 2) * 2;
    this.coreGlow.color.setHex(hpRatio < 0.35 ? COL.danger : 0xffb35c);
    if (snap.phase === 2) {
      crystalMat.emissiveIntensity = 0.15;
      this.coreGlow.intensity = 2;
    } else {
      crystalMat.emissiveIntensity = 1.8 + (1 - hpRatio) * 1.4;
    }

    for (let i = 0; i < this.city.length; i++) {
      const level = snap.city[i] ?? 0;
      const built = this.city[i];
      built.group.scale.y = 0.72 + level * 0.16;
      built.lamp.emissiveIntensity = level > 0 ? 0.7 + level * 0.7 : 0.05;
    }

    for (let i = 0; i < this.rubbleGroups.length; i++) {
      this.rubbleGroups[i].visible = snap.map === i;
    }

    this.dust.rotation.y += dt * 0.006;
    this.renderer.render(this.scene, this.camera);
  }
}
