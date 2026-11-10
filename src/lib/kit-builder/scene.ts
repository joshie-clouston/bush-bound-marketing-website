// Three.js preview for the kit builder. Client-only: loaded with a dynamic import
// so the questionnaire still works (and the page stays light) if WebGL isn't available.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Layout, ModuleSpec } from '@/lib/kit-builder/engine';

type Finish = 'budget' | 'balanced' | 'premium';

const MM = 0.001;
const COLOURS = {
  plyBudget: 0xe3cfa8,
  plyBalanced: 0xd6b88a,
  edge: 0x8a6d45,
  hex: 0x222222,
  fridge: 0xeeeeea,
  fridgeLid: 0x3a3a3a,
  mattress: 0x3d6354,
  tank: 0x4a90c2,
  battery: 0x1f1f1f,
  floor: 0x2a2a2a,
  arch: 0x333333,
  seat: 0x3a3a3a,
  shell: 0xc4a882,
  steel: 0x9a9a9a,
};

interface Tracked {
  spec: ModuleSpec;
  object: THREE.Object3D;
  /** Animation state */
  appear: number;
  removing: boolean;
  slideCurrent: number;
  pos: THREE.Vector3;
}

function plyTexture(base: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const col = new THREE.Color(base);
  ctx.fillStyle = `#${col.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);
  // Soft grain lines
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * 256;
    ctx.strokeStyle = `rgba(120, 85, 40, ${0.04 + Math.random() * 0.06})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 256; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 3);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export class KitScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private envelope = new THREE.Group();
  private modulesGroup = new THREE.Group();
  private tracked = new Map<string, Tracked>();
  private open = false;
  private finish: Finish = 'balanced';
  private materials!: Record<string, THREE.Material>;
  private reduceMotion: boolean;
  private lastInteraction = 0;
  private envelopeKey = '';
  private running = false;
  private rafActive = false;
  private lastFrame = performance.now();
  private resizeObserver: ResizeObserver;

  constructor(private container: HTMLElement) {
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', '3D preview of your fit-out. Drag to rotate, scroll or pinch to zoom.');
    this.renderer.domElement.setAttribute('role', 'img');

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 50);
    this.camera.position.set(1.75, 1.45, 1.85);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 5;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minAzimuthAngle = -1.35;
    this.controls.maxAzimuthAngle = 1.35;
    this.controls.target.set(0, 0.3, -0.75);
    this.controls.autoRotate = !this.reduceMotion;
    this.controls.autoRotateSpeed = 0.6;
    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false;
      this.lastInteraction = performance.now();
    });

    this.buildMaterials();
    this.buildLights();
    this.scene.add(this.envelope, this.modulesGroup);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    // Pause rendering when the viewer is scrolled off-screen.
    new IntersectionObserver(([entry]) => {
      this.running = entry.isIntersecting;
      if (this.running && !this.rafActive) {
        this.lastFrame = performance.now();
        this.loop();
      }
    }).observe(container);
  }

  private buildMaterials() {
    const plyBalanced = plyTexture(COLOURS.plyBalanced);
    const plyBudget = plyTexture(COLOURS.plyBudget);
    this.materials = {
      plyBalanced: new THREE.MeshStandardMaterial({ map: plyBalanced, roughness: 0.55 }),
      plyBudget: new THREE.MeshStandardMaterial({ map: plyBudget, roughness: 0.85 }),
      hex: new THREE.MeshStandardMaterial({ color: COLOURS.hex, roughness: 0.9 }),
      edge: new THREE.LineBasicMaterial({ color: COLOURS.edge, transparent: true, opacity: 0.55 }),
      fridge: new THREE.MeshStandardMaterial({ color: COLOURS.fridge, roughness: 0.4 }),
      fridgeLid: new THREE.MeshStandardMaterial({ color: COLOURS.fridgeLid, roughness: 0.5 }),
      mattress: new THREE.MeshStandardMaterial({ color: COLOURS.mattress, roughness: 0.95 }),
      tank: new THREE.MeshPhysicalMaterial({ color: COLOURS.tank, roughness: 0.25, transparent: true, opacity: 0.75 }),
      battery: new THREE.MeshStandardMaterial({ color: COLOURS.battery, roughness: 0.6 }),
      screen: new THREE.MeshBasicMaterial({ color: 0x3aa0ff }),
      led: new THREE.MeshBasicMaterial({ color: 0x4cff7a }),
      steel: new THREE.MeshStandardMaterial({ color: COLOURS.steel, metalness: 0.7, roughness: 0.35 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6 }),
      solar: new THREE.MeshStandardMaterial({ color: 0x14243a, metalness: 0.4, roughness: 0.3 }),
      floor: new THREE.MeshStandardMaterial({ color: COLOURS.floor, roughness: 0.95 }),
      arch: new THREE.MeshStandardMaterial({ color: COLOURS.arch, roughness: 0.9 }),
      seat: new THREE.MeshStandardMaterial({ color: COLOURS.seat, roughness: 0.95 }),
      shell: new THREE.MeshStandardMaterial({ color: COLOURS.shell, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }),
      shellLine: new THREE.LineBasicMaterial({ color: COLOURS.shell, transparent: true, opacity: 0.35 }),
      windowLine: new THREE.LineDashedMaterial({ color: COLOURS.shell, dashSize: 0.04, gapSize: 0.03, transparent: true, opacity: 0.5 }),
      ground: new THREE.ShadowMaterial({ opacity: 0.25 }),
    };
  }

  private ply(): THREE.Material {
    return this.finish === 'budget' ? this.materials.plyBudget : this.materials.plyBalanced;
  }

  private top(): THREE.Material {
    return this.finish === 'premium' ? this.materials.hex : this.ply();
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xfff6e8, 0x2d4a3e, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(2.5, 4, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -2.5;
    sun.shadow.camera.right = 2.5;
    sun.shadow.camera.top = 2.5;
    sun.shadow.camera.bottom = -2.5;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc4a882, 0.5);
    fill.position.set(-3, 2, 1);
    this.scene.add(fill);
  }

  private box(w: number, h: number, d: number, material: THREE.Material, edges = false): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w * MM, h * MM, d * MM);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.materials.edge));
    return mesh;
  }

  // -------------------------------------------------------------------------
  // Vehicle envelope (floor, arches, seats, ghosted shell)
  // -------------------------------------------------------------------------

  private buildEnvelope(layout: Layout) {
    const v = layout.vehicle;
    const key = `${v.id}|${layout.seatsFolded}`;
    if (key === this.envelopeKey) return;
    this.envelopeKey = key;
    this.envelope.clear();

    const W = v.floorWidth;
    const totalLength = v.sleepLength + 300;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), this.materials.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    this.envelope.add(ground);

    const floor = this.box(W, 20, totalLength, this.materials.floor);
    floor.position.set(0, -0.01, (-totalLength / 2) * MM);
    this.envelope.add(floor);

    // Wheel arches
    const archW = (W - v.archWidth) / 2;
    const archZ = -v.cargoLength * 0.6 * MM;
    for (const side of [-1, 1]) {
      const arch = this.box(archW, v.archHeight, v.archLength, this.materials.arch);
      arch.position.set(side * (W / 2 - archW / 2) * MM, (v.archHeight / 2) * MM, archZ);
      this.envelope.add(arch);
    }

    // 2nd row seats: upright, or folded flat under the bed.
    const seatZ = -(v.cargoLength + 280) * MM;
    if (layout.seatsFolded) {
      const folded = this.box(W - 120, 260, 520, this.materials.seat);
      folded.position.set(0, 0.13, seatZ);
      this.envelope.add(folded);
    } else {
      const base = this.box(W - 120, 420, 520, this.materials.seat);
      base.position.set(0, 0.21, seatZ);
      const back = this.box(W - 120, 640, 120, this.materials.seat);
      back.position.set(0, 0.42 + 0.32, -(v.cargoLength + 60) * MM);
      back.rotation.x = -0.12;
      this.envelope.add(base, back);
    }

    // Ghosted cabin shell
    const shellGeo = new THREE.BoxGeometry(W * MM, v.roofHeight * MM, totalLength * MM);
    const shell = new THREE.Mesh(shellGeo, this.materials.shell);
    shell.position.set(0, (v.roofHeight / 2) * MM, (-totalLength / 2) * MM);
    shell.renderOrder = -1;
    this.envelope.add(shell);
    const shellEdges = new THREE.LineSegments(new THREE.EdgesGeometry(shellGeo), this.materials.shellLine);
    shellEdges.position.copy(shell.position);
    this.envelope.add(shellEdges);

    // Window line on both walls
    for (const side of [-1, 1]) {
      const pts = [new THREE.Vector3(side * (W / 2) * MM, v.windowHeight * MM, 0), new THREE.Vector3(side * (W / 2) * MM, v.windowHeight * MM, -totalLength * MM)];
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.materials.windowLine);
      line.computeLineDistances();
      this.envelope.add(line);
    }

    // Re-aim the camera at the middle of the cargo area.
    this.controls.target.set(0, 0.3, (-v.cargoLength / 2 - 150) * MM);
  }

  // -------------------------------------------------------------------------
  // Modules
  // -------------------------------------------------------------------------

  private buildModule(spec: ModuleSpec): THREE.Object3D {
    const g = new THREE.Group();
    const { w, h, d } = spec;

    switch (spec.kind) {
      case 'carcass':
      case 'wing': {
        g.add(this.box(w, h, d, this.ply(), true));
        if (spec.kind === 'wing') {
          const lid = this.box(w + 4, 6, d + 4, this.top());
          lid.position.y = (h / 2) * MM;
          g.add(lid);
        }
        break;
      }
      case 'drawer':
      case 'kitchen': {
        // Tray that slides out, with a proud front panel and handle.
        const tray = this.box(w - 10, h - 30, d, this.ply(), true);
        g.add(tray);
        const front = this.box(w + 20, h + 4, 18, this.ply(), true);
        front.position.z = (d / 2 + 9) * MM;
        g.add(front);
        const handle = this.box(Math.min(160, w * 0.4), 18, 22, this.materials.dark);
        handle.position.set(0, (h / 2 - 40) * MM, (d / 2 + 26) * MM);
        g.add(handle);
        if (spec.kind === 'kitchen') {
          const stove = this.box(w * 0.42, 40, d * 0.42, this.materials.dark);
          stove.position.set((-w * 0.22) * MM, (h / 2 - 15 + 20) * MM, (d * 0.18) * MM);
          g.add(stove);
          for (const off of [-0.1, 0.1]) {
            const burner = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 20), this.materials.steel);
            burner.rotation.x = Math.PI / 2;
            burner.position.set((-w * 0.22) * MM, (h / 2 + 26) * MM, (d * 0.18) * MM + off);
            g.add(burner);
          }
          const board = this.box(w * 0.4, 20, d * 0.4, this.materials.plyBudget);
          board.position.set((w * 0.24) * MM, (h / 2 - 5) * MM, (d * 0.18) * MM);
          g.add(board);
        }
        break;
      }
      case 'fridge-slide': {
        const plate = this.box(w, h, d, this.materials.steel);
        g.add(plate);
        break;
      }
      case 'fridge': {
        const body = new THREE.Mesh(new RoundedBoxGeometry(w * MM, h * 0.82 * MM, d * MM, 3, 0.02), this.materials.fridge);
        body.castShadow = true;
        body.position.y = (-h * 0.09) * MM;
        g.add(body);
        const lid = new THREE.Mesh(new RoundedBoxGeometry(w * MM, h * 0.18 * MM, d * MM, 3, 0.02), this.materials.fridgeLid);
        lid.castShadow = true;
        lid.position.y = (h * 0.41) * MM;
        g.add(lid);
        break;
      }
      case 'deck':
        g.add(this.box(w, h, d, this.top(), true));
        break;
      case 'platform':
        g.add(this.box(w, h, d, this.top(), true));
        break;
      case 'infill': {
        const half = (w - 10) / 2;
        for (const s of [-1, 1]) {
          const panel = this.box(half, h, d, this.top(), true);
          panel.position.x = s * (half / 2 + 5) * MM;
          g.add(panel);
        }
        break;
      }
      case 'mattress': {
        const m = new THREE.Mesh(new RoundedBoxGeometry(w * MM, h * MM, d * MM, 4, 0.03), this.materials.mattress);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
        const pillow = new THREE.Mesh(new RoundedBoxGeometry(w * 0.4 * MM, 0.06, 0.32, 4, 0.025), this.materials.fridge);
        pillow.position.set((-w * 0.22) * MM, (h / 2 + 20) * MM, (-d / 2 + 220) * MM);
        g.add(pillow);
        break;
      }
      case 'tank': {
        g.add(this.box(w, h, d, this.materials.tank));
        const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 12), this.materials.steel);
        tap.rotation.x = Math.PI / 2;
        tap.position.set((w * 0.3) * MM, 0, (d / 2 + 25) * MM);
        g.add(tap);
        break;
      }
      case 'battery': {
        g.add(this.box(w, h, d, this.materials.battery, true));
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w - 30, 90) * MM, 0.05), this.materials.screen);
        screen.position.set(0, (h * 0.2) * MM, (d / 2 + 1) * MM);
        g.add(screen);
        for (const off of [-0.02, 0.02]) {
          const led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 8), this.materials.led);
          led.position.set(off, (h * 0.2 - 50) * MM, (d / 2 + 2) * MM);
          g.add(led);
        }
        break;
      }
      case 'solar': {
        g.add(this.box(w, h, d, this.materials.solar));
        const grid = new THREE.GridHelper(1, 6, 0x3d5a80, 0x3d5a80);
        grid.scale.set(w * MM, 1, d * MM);
        grid.position.y = (h / 2 + 1) * MM;
        g.add(grid);
        break;
      }
    }
    return g;
  }

  private basePosition(spec: ModuleSpec): THREE.Vector3 {
    return new THREE.Vector3(spec.x * MM, (spec.y + spec.h / 2) * MM, spec.z * MM);
  }

  private sameShape(a: ModuleSpec, b: ModuleSpec) {
    return a.kind === b.kind && a.w === b.w && a.h === b.h && a.d === b.d;
  }

  update(layout: Layout, finish: Finish | undefined) {
    const nextFinish = finish ?? 'balanced';
    const finishChanged = nextFinish !== this.finish;
    this.finish = nextFinish;
    this.buildEnvelope(layout);

    const nextIds = new Set(layout.modules.map((m) => m.id));
    for (const [id, t] of this.tracked) {
      if (!nextIds.has(id)) t.removing = true;
    }

    for (const spec of layout.modules) {
      const existing = this.tracked.get(spec.id);
      if (existing && !existing.removing && this.sameShape(existing.spec, spec) && !finishChanged) {
        existing.spec = spec;
        continue;
      }
      if (existing) {
        this.modulesGroup.remove(existing.object);
      }
      const object = this.buildModule(spec);
      object.position.copy(this.basePosition(spec));
      this.modulesGroup.add(object);
      this.tracked.set(spec.id, {
        spec,
        object,
        // Restyles (finish change) swap in place; new or resized parts pop in.
        appear: existing && finishChanged ? 1 : this.reduceMotion ? 1 : 0,
        removing: false,
        slideCurrent: existing?.slideCurrent ?? 0,
        pos: this.basePosition(spec),
      });
    }
  }

  setOpen(open: boolean) {
    this.open = open;
  }

  resetView() {
    this.camera.position.set(1.75, 1.45, 1.85);
    this.controls.autoRotate = !this.reduceMotion;
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Pull back a little on narrow (portrait) screens so the whole cargo area fits.
    this.camera.fov = w / h < 1 ? 50 : 38;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    if (!this.running) {
      this.rafActive = false;
      return;
    }
    this.rafActive = true;
    requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;

    // Gentle back-and-forth sway until someone grabs it.
    if (this.controls.autoRotate) {
      const az = this.controls.getAzimuthalAngle();
      if (az > 0.95) this.controls.autoRotateSpeed = -Math.abs(this.controls.autoRotateSpeed);
      if (az < -0.95) this.controls.autoRotateSpeed = Math.abs(this.controls.autoRotateSpeed);
    } else if (!this.reduceMotion && this.lastInteraction && performance.now() - this.lastInteraction > 8000) {
      this.controls.autoRotate = true;
    }
    this.controls.update();

    const speed = this.reduceMotion ? 1 : 1 - Math.pow(0.0015, dt);
    for (const [id, t] of this.tracked) {
      t.pos.lerp(this.basePosition(t.spec), speed);
      const slideTarget = this.open && t.spec.slide ? t.spec.slide * MM : 0;
      t.slideCurrent += (slideTarget - t.slideCurrent) * speed;

      if (t.removing) {
        t.appear -= dt * 4;
        if (t.appear <= 0) {
          this.modulesGroup.remove(t.object);
          this.tracked.delete(id);
          continue;
        }
      } else if (t.appear < 1) {
        t.appear = Math.min(1, t.appear + dt * 2.2);
      }

      // Ease-out-back pop: drop in from above with a little settle.
      const a = Math.max(0, t.appear);
      const ease = 1 + 2.2 * Math.pow(a - 1, 3) + 1.2 * Math.pow(a - 1, 2);
      const drop = (1 - Math.min(1, ease)) * 0.35;
      t.object.position.set(t.pos.x, t.pos.y + drop, t.pos.z + t.slideCurrent);
      const s = t.removing ? a : Math.max(0.001, Math.min(ease, 1.06));
      t.object.scale.setScalar(s);
    }

    this.renderer.render(this.scene, this.camera);
  };
}
