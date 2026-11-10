// Three.js preview for the kit builder. Client-only: loaded with a dynamic import
// so the questionnaire still works (and the page stays light) if WebGL isn't available.
//
// This is a stylised look-alike of the Bush Bound wagon base layout built from simple
// boxes: black honeycomb birch ply with exposed birch edges, optional laminate fronts,
// finger-pull notches, paddle latches, an upright fridge cabinet, open drawer trays,
// the table cubby, pull-out bed and side panels with power fittings.
// It is generated in the browser from rounded proportions only. No CAD or Fusion
// data is loaded, and there's no way to export a model from it.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Fixture, Layout, ModuleSpec } from '@/lib/kit-builder/engine';

export interface Look {
  fronts: 'hex' | 'green' | 'timber';
  carpet: boolean;
}

const MM = 0.001;

interface Tracked {
  spec: ModuleSpec;
  object: THREE.Object3D;
  appear: number;
  removing: boolean;
  /** 0 = closed, 1 = open */
  openT: number;
  pos: THREE.Vector3;
}

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

const plyTexture = () =>
  canvasTexture((ctx, s) => {
    ctx.fillStyle = '#dcc49b';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      const y = Math.random() * s;
      ctx.strokeStyle = `rgba(120, 85, 40, ${0.04 + Math.random() * 0.06})`;
      ctx.lineWidth = 0.5 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 3);
      ctx.stroke();
    }
  });

const hexTexture = () =>
  canvasTexture((ctx, s) => {
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 2;
    const r = s / 12;
    const hw = Math.sqrt(3) * r;
    for (let row = -1; row < 9; row++) {
      for (let col = -1; col < 8; col++) {
        const cx = col * hw + (row % 2 ? hw / 2 : 0);
        const cy = row * r * 1.5;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + (k * Math.PI) / 3;
          const x = cx + r * 0.9 * Math.cos(a);
          const y = cy + r * 0.9 * Math.sin(a);
          if (k) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  });

const timberTexture = () =>
  canvasTexture((ctx, s) => {
    ctx.fillStyle = '#9a6b42';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * s;
      ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? '60, 35, 15' : '190, 140, 95'}, ${0.08 + Math.random() * 0.12})`;
      ctx.lineWidth = 0.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y <= s; y += 32) ctx.lineTo(x + Math.sin(y * 0.03 + i) * 4, y);
      ctx.stroke();
    }
  });

/** Scale box UVs to real size so textures keep the same density on big and small panels. */
function scaleBoxUVs(geo: THREE.BoxGeometry, w: number, h: number, d: number, tile = 260) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // BoxGeometry faces: +x, -x, +y, -y, +z, -z (4 vertices each).
  const sizes: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, (uv.getX(i) * sizes[f][0]) / tile, (uv.getY(i) * sizes[f][1]) / tile);
    }
  }
  uv.needsUpdate = true;
}

const carpetTexture = () =>
  canvasTexture((ctx, s) => {
    ctx.fillStyle = '#5a5b5c';
    ctx.fillRect(0, 0, s, s);
    const img = ctx.getImageData(0, 0, s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 70;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  });

const phase = (s: number, a: number, b: number) => Math.min(1, Math.max(0, (s - a) / (b - a)));
const ease = (x: number) => x * x * (3 - 2 * x);

export class KitScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private envelope = new THREE.Group();
  private modulesGroup = new THREE.Group();
  private tracked = new Map<string, Tracked>();
  private open = false;
  /** Linear 0..1 progress for step-by-step animations (the camp table), so each step is easy to follow. */
  private seqT = 0;
  /** Dev only: freeze the step-by-step sequence at a given point for checking each stage. */
  private seqOverride: number | null = null;
  /** Camera distance we're easing towards (zooms out when opened), unless the customer takes over. */
  private distGoal: number | null = null;
  private look: Look = { fronts: 'hex', carpet: false };
  private m!: Record<string, THREE.Material>;
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
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', '3D preview of your fit-out. Drag to rotate, scroll or pinch to zoom.');
    this.renderer.domElement.setAttribute('role', 'img');
    // No right-click "save image" on the canvas.
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    this.renderer.domElement.style.display = 'block';
    // Plain mouse-wheel scrolls the page; only Ctrl/Cmd + wheel (or a trackpad pinch) zooms.
    // Registered before OrbitControls so it can swallow the event first.
    this.renderer.domElement.addEventListener(
      'wheel',
      (e) => {
        if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation();
      },
      { capture: true },
    );

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 50);
    this.camera.position.set(0.85, 1.4, 1.8);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // Let a vertical swipe scroll the page on phones; sideways drags still rotate the model.
    this.renderer.domElement.style.touchAction = 'pan-y';
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 4.5;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minAzimuthAngle = -1.35;
    this.controls.maxAzimuthAngle = 1.35;
    this.controls.target.set(0, 0.35, -0.7);
    this.controls.autoRotate = !this.reduceMotion;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false;
      this.lastInteraction = performance.now();
      this.distGoal = null;
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
    const carpet = carpetTexture();
    carpet.repeat.set(3, 3);
    this.m = {
      ply: new THREE.MeshStandardMaterial({ map: plyTexture(), roughness: 0.6 }),
      edge: new THREE.LineBasicMaterial({ color: 0x9a7b50, transparent: true, opacity: 0.6 }),
      birchEdge: new THREE.LineBasicMaterial({ color: 0xe2cfa6, transparent: true, opacity: 0.85 }),
      green: new THREE.MeshStandardMaterial({ color: 0x34453e, roughness: 0.55 }),
      timber: new THREE.MeshStandardMaterial({ map: timberTexture(), roughness: 0.5 }),
      carpet: new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }),
      hex: new THREE.MeshStandardMaterial({ map: hexTexture(), roughness: 0.85 }),
      alu: new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.8, roughness: 0.3 }),
      recess: new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 1 }),
      black: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.45 }),
      notch: new THREE.MeshBasicMaterial({ color: 0x0c0f0e }),
      badge: new THREE.MeshStandardMaterial({ color: 0xd8d8d4, roughness: 0.4, metalness: 0.3 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 0.8, roughness: 0.3 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x9a9a9a, metalness: 0.7, roughness: 0.35 }),
      screen: new THREE.MeshBasicMaterial({ color: 0xbfd3dc }),
      fridge: new THREE.MeshStandardMaterial({ color: 0x1b1c1d, roughness: 0.5 }),
      organiser: new THREE.MeshStandardMaterial({ color: 0x5a5e61, roughness: 0.9 }),
      pocket: new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.95 }),
      mattress: new THREE.MeshStandardMaterial({ color: 0x3d6354, roughness: 0.95 }),
      pillow: new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.9 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 }),
      arch: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 }),
      seat: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 }),
      shell: new THREE.MeshStandardMaterial({ color: 0xc4a882, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }),
      shellLine: new THREE.LineBasicMaterial({ color: 0xc4a882, transparent: true, opacity: 0.3 }),
      windowLine: new THREE.LineDashedMaterial({ color: 0xc4a882, dashSize: 0.04, gapSize: 0.03, transparent: true, opacity: 0.45 }),
      ground: new THREE.ShadowMaterial({ opacity: 0.25 }),
      fridgeLid: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5 }),
      fridgeInside: new THREE.MeshStandardMaterial({ color: 0x9aa3a8, roughness: 0.6 }),
      fridgeLiner: new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.5, emissive: 0x2a2d30 }),
      freezer: new THREE.MeshStandardMaterial({ color: 0xc9d0d5, roughness: 0.5, emissive: 0x1a1d20 }),
      freezerDoor: new THREE.MeshStandardMaterial({ color: 0xeef1f3, roughness: 0.35, emissive: 0x202326 }),
      shelf: new THREE.MeshPhysicalMaterial({ color: 0xd6e8ee, roughness: 0.1, transparent: true, opacity: 0.55 }),
    };
  }

  /** Drawer fronts and fridge cabinet sides: black honeycomb, or green / timber laminate. */
  private front(): THREE.Material {
    return this.look.fronts === 'green' ? this.m.green : this.look.fronts === 'timber' ? this.m.timber : this.m.hex;
  }

  /** Top surfaces: black honeycomb, or carpet on installed builds. */
  private top(): THREE.Material {
    return this.look.carpet ? this.m.carpet : this.m.hex;
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xfff6e8, 0x2d4a3e, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(1.5, 4, 3.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -2.5;
    sun.shadow.camera.right = 2.5;
    sun.shadow.camera.top = 2.5;
    sun.shadow.camera.bottom = -2.5;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc4a882, 0.6);
    fill.position.set(-2, 1.5, 3);
    this.scene.add(fill);
  }

  /** Box in mm, centred on the group origin unless moved. */
  private box(w: number, h: number, d: number, material: THREE.Material, edges: boolean | 'birch' = false): THREE.Mesh {
    const geo = new THREE.BoxGeometry(Math.max(w, 0.1) * MM, Math.max(h, 0.1) * MM, Math.max(d, 0.1) * MM);
    scaleBoxUVs(geo, w, h, d);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edges === 'birch' ? this.m.birchEdge : this.m.edge));
    return mesh;
  }

  private at<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number): T {
    obj.position.set(x * MM, y * MM, z * MM);
    return obj;
  }

  // -------------------------------------------------------------------------
  // Vehicle envelope (floor, arches, seats, ghosted shell)
  // -------------------------------------------------------------------------

  private buildEnvelope(layout: Layout) {
    // Just the fit-out on a soft ground shadow: no car body, seats or arches.
    const v = layout.vehicle;
    const key = v.id;
    if (key === this.envelopeKey) return;
    this.envelopeKey = key;
    this.envelope.clear();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), this.m.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.002;
    ground.receiveShadow = true;
    this.envelope.add(ground);
    this.controls.target.set(0, 0.3, (-v.cargoLength / 2 - 100) * MM);
  }

  // -------------------------------------------------------------------------
  // Details
  // -------------------------------------------------------------------------

  /** A cabinet front with a finger-pull notch and paddle latch, as on our builds. */
  private cabinetFront(w: number, h: number, opts: { latch?: 'paddle' | 'round'; badge?: boolean } = {}): THREE.Group {
    const g = new THREE.Group();
    g.add(this.box(w, h, 16, this.front()));
    const fz = 8.5;
    if (h > 120) {
      const notch = this.box(Math.min(w * 0.22, 130), 22, 2, this.m.notch);
      g.add(this.at(notch, 0, h / 2 - 11, fz));
    }
    if (opts.latch === 'round') {
      const latch = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.008, 24), this.m.black);
      latch.rotation.x = Math.PI / 2;
      g.add(this.at(latch, 0, h * 0.05, fz + 3));
    } else {
      const latch = new THREE.Mesh(new RoundedBoxGeometry(0.024, Math.min(0.075, (h * 0.4) * MM), 0.008, 2, 0.004), this.m.black);
      g.add(this.at(latch, -w / 2 + Math.min(110, w * 0.18), h * 0.12, fz + 3));
    }
    if (opts.badge && w > 400) {
      g.add(this.at(this.box(110, 30, 2, this.m.badge), w / 2 - 110, -h / 2 + 40, fz + 1));
    }
    return g;
  }

  private fixture(kind: Fixture, scale: number): THREE.Group {
    const g = new THREE.Group();
    const s = scale;
    switch (kind) {
      case 'sockets':
        for (const dy of [45, -45]) {
          g.add(this.at(this.box(56 * s, 56 * s, 4, this.m.black), 0, dy * s, 0));
          const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.017 * s, 0.017 * s, 0.01, 20), this.m.black);
          socket.rotation.x = Math.PI / 2;
          g.add(this.at(socket, 0, dy * s, 6));
          const hole = new THREE.Mesh(new THREE.CircleGeometry(0.01 * s, 16), this.m.notch);
          g.add(this.at(hole, 0, dy * s, 11.5));
        }
        break;
      case 'gpo':
        g.add(this.box(90 * s, 60 * s, 8, this.m.black));
        for (const dx of [-22, 22]) {
          for (const [sx, sy, r] of [[-6, 8, 0.5], [6, 8, -0.5], [0, -8, 0]] as const) {
            const pin = this.box(3 * s, 10 * s, 2, this.m.notch);
            pin.rotation.z = r;
            g.add(this.at(pin, (dx + sx) * s, sy * s, 5));
          }
        }
        break;
      case 'monitor':
        g.add(this.box(100 * s, 75 * s, 8, this.m.black));
        g.add(this.at(new THREE.Mesh(new THREE.PlaneGeometry(0.084 * s, 0.058 * s), this.m.screen), 0, 0, 4.5));
        break;
      case 'switch':
        g.add(this.box(55 * s, 40 * s, 6, this.m.black));
        g.add(this.at(this.box(14 * s, 20 * s, 6, this.m.steel), -8 * s, 0, 5));
        break;
    }
    return g;
  }

  // -------------------------------------------------------------------------
  // Modules
  // -------------------------------------------------------------------------

  /** A door hinged on one side that swings open with "Open". */
  private hingedDoor(w: number, h: number, hinge: 'left' | 'right', content: THREE.Object3D): THREE.Group {
    const pivot = new THREE.Group();
    pivot.position.x = ((hinge === 'left' ? -w : w) / 2) * MM;
    content.position.x = ((hinge === 'left' ? w : -w) / 2) * MM;
    pivot.add(content);
    pivot.userData.openAngle = hinge === 'left' ? -1.75 : 1.65;
    return pivot;
  }

  /** Open-topped drawer box: bottom, two sides, back and inner front, empty inside. */
  private drawerTray(w: number, h: number, d: number): THREE.Group {
    const g = new THREE.Group();
    const t = 12;
    const bh = h - 30;
    g.add(this.at(this.box(w - 12, t, d, this.m.ply, true), 0, -bh / 2 + t / 2, 0));
    for (const sx of [-1, 1]) g.add(this.at(this.box(t, bh, d, this.m.ply, true), sx * ((w - 12) / 2 - t / 2), 0, 0));
    g.add(this.at(this.box(w - 12, bh, t, this.m.ply, true), 0, 0, -d / 2 + t / 2));
    g.add(this.at(this.box(w - 12, bh, t, this.m.ply, true), 0, 0, d / 2 - t / 2));
    return g;
  }

  private buildModule(spec: ModuleSpec): THREE.Object3D {
    const g = new THREE.Group();
    const { w, h, d } = spec;

    switch (spec.kind) {
      case 'carcass':
        g.add(this.box(w, h, d, this.m.hex, 'birch'));
        break;

      case 'drawer': {
        g.add(this.drawerTray(w, h, d));
        g.add(this.at(this.cabinetFront(w + 8, h + 6, { badge: spec.badge }), 0, 0, d / 2 + 8));
        if (spec.tableSlide) {
          // Pull-out table inside the drawer, just under the top: slides out further than the drawer.
          const table = new THREE.Group();
          table.add(this.box(w - 40, 18, d - 40, this.m.hex, 'birch'));
          table.add(this.at(this.box(w - 40, 30, 18, this.m.hex, 'birch'), 0, -6, (d - 40) / 2 - 9));
          table.add(this.at(this.box(Math.min(140, w * 0.3), 10, 14, this.m.black), 0, -6, (d - 40) / 2 + 7));
          table.position.set(0, ((h - 30) / 2 - 22) * MM, -20 * MM);
          g.add(table);
          g.userData.inner = { obj: table, z0: table.position.z, dz: spec.tableSlide };
        }
        break;
      }

      case 'cubby': {
        // Hinged cubby door (right hinge) with the folded Bush Bound table inside.
        // The opening and the folded table's edges, drawn on the cabinet face (hidden behind the closed door).
        g.add(this.at(this.box(w - 6, h - 6, 2, this.m.recess), 0, 0, -7));
        const stored = new THREE.Group();
        for (const fx of [-0.18, 0, 0.18]) stored.add(this.at(this.box(18, h - 50, 3, this.m.timber), w * fx, 0, -5));
        g.add(stored);
        const door = this.cabinetFront(w, h, { latch: 'round' });
        const pivot = this.hingedDoor(w, h, 'right', door);
        g.add(pivot);
        // Door opens at the start of the table sequence and closes once the table is back in.
        g.userData.seq = (s: number) => {
          pivot.rotation.y = pivot.userData.openAngle * ease(phase(s, 0, 0.08));
          stored.visible = s < 0.1;
        };
        break;
      }

      case 'camp-table': {
        // Bush Bound camp table: four slats running the length of the top, legs at each end.
        // Folded it's a stack of four slats; it unfolds twice into the full top, then the legs swing down.
        const rig = new THREE.Group();
        g.add(rig);
        const topY = h / 2 - 9;
        const gap = 12;
        const slat = (w - 3 * gap) / 4;
        const pitch = slat + gap;
        const cx = [-1.5, -0.5, 0.5, 1.5].map((k) => k * pitch);
        const slats = cx.map(() => {
          const m = this.box(slat, 18, d, this.m.timber, true);
          rig.add(m);
          return m;
        });
        // Fold maths. The table folds underside to underside (legs tucked inside, slat tops facing out):
        // the outer slats (0 and 3) fold under slats 1 and 2, then the left half folds under the right at
        // the middle hinge, giving a stack of four under slot 2. Unfolding swings them up from underneath:
        // middle hinge first, then the outer slats.
        const rot = (p: { x: number; y: number; a: number }, hx: number, hy: number, a: number) => {
          const dx = p.x - hx;
          const dy = p.y - hy;
          return { x: hx + dx * Math.cos(a) - dy * Math.sin(a), y: hy + dx * Math.sin(a) + dy * Math.cos(a), a: p.a + a };
        };
        const frame = this.box(w - 40, 20, 24, this.m.alu);
        const frame2 = this.box(w - 40, 20, 24, this.m.alu);
        rig.add(this.at(frame, 0, topY - 19, d / 2 - 40), this.at(frame2, 0, topY - 19, -d / 2 + 40));
        const legLen = h - 30;
        const legs: THREE.Group[] = [];
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const pivot = new THREE.Group();
            pivot.position.set(sx * (w / 2 - (sz > 0 ? 50 : 80)) * MM, (topY - 22) * MM, sz * (d / 2 - 40) * MM);
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, legLen * MM, 12), this.m.alu);
            leg.castShadow = true;
            leg.position.y = (-legLen / 2) * MM;
            pivot.add(leg);
            // Folded flat under the table pointing to the middle; opens down and slightly outwards.
            pivot.userData.fold = sz > 0 ? Math.PI / 2 : -Math.PI / 2;
            pivot.userData.open = sz > 0 ? -0.08 : 0.08;
            rig.add(pivot);
            legs.push(pivot);
          }
        }
        const from = spec.from ?? [0, 0, 0];
        // The folded table stands on its tall edge in the cubby, slides out lengthwise, turns flat as
        // it's carried round to the right-hand side, then unfolds from the top down (middle first,
        // then the outer slats) and the legs drop out from underneath. Close reverses it.
        // Folded stack centre in rig space is (cx[2], topY - 27); standing on edge (rotated 90 deg
        // about the long axis) that's (27 - topY, cx[2]).
        const inCubby = new THREE.Vector3(from[0] + (topY - 27), from[1] - cx[2], from[2]);
        const outside = new THREE.Vector3(inCubby.x, inCubby.y, from[2] + 1300);
        g.userData.seq = (sq: number) => {
          // 0.08-0.22 slide out of the cubby, 0.22-0.38 turn flat and carry to the set-up spot,
          // 0.40-0.56 middle unfolds, 0.56-0.72 outer slats unfold, 0.75-0.95 legs drop.
          const out = ease(phase(sq, 0.08, 0.22));
          const carry = ease(phase(sq, 0.22, 0.38));
          const pos = inCubby.clone().lerp(outside, out).lerp(new THREE.Vector3(0, 0, 0), carry);
          rig.position.copy(pos.multiplyScalar(MM));
          rig.rotation.z = (Math.PI / 2) * (1 - carry);
          rig.visible = sq > 0.08;
          const middle = ease(phase(sq, 0.4, 0.56));
          const outer = ease(phase(sq, 0.56, 0.72));
          slats.forEach((m, k) => {
            let p = { x: cx[k], y: topY, a: 0 };
            if (k === 0) p = rot(p, -pitch, topY - 9, Math.PI * (1 - outer));
            if (k === 3) p = rot(p, pitch, topY - 9, -Math.PI * (1 - outer));
            if (k === 0 || k === 1) p = rot(p, 0, topY - 27, Math.PI * (1 - middle));
            m.position.set(p.x * MM, p.y * MM, 0);
            m.rotation.z = p.a;
          });
          const legT = ease(phase(sq, 0.75, 0.95));
          const flat = outer > 0.98;
          frame.visible = frame2.visible = flat;
          for (const leg of legs) {
            leg.visible = flat;
            leg.rotation.x = leg.userData.fold + (leg.userData.open - leg.userData.fold) * legT;
          }
        };
        break;
      }

      case 'drawer-fridge': {
        g.add(this.at(this.box(w - 20, h - 30, d * 0.8, this.m.fridge), 0, -10, d * 0.1));
        g.add(this.at(this.box(w - 60, 8, d * 0.75, this.m.fridgeLid), 0, h / 2 - 22, d * 0.1));
        g.add(this.at(this.box(w + 8, h + 6, 16, this.m.fridge), 0, 0, d / 2 + 8));
        g.add(this.at(this.box(w * 0.5, 18, 20, this.m.steel), 0, h / 2 - 40, d / 2 + 24));
        g.add(this.at(new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.018), this.m.screen), w / 2 - 60, h / 2 - 40, d / 2 + 16.5));
        break;
      }

      case 'end-panel': {
        g.add(this.box(w, h, d, this.m.hex, 'birch'));
        g.add(this.at(this.box(w + 4, 12, d + 2, this.top()), 0, h / 2 + 6, 0));
        const s = Math.min(1, (w - 30) / 100, h / 300);
        const fz = d / 2 + 4;
        const slots: Record<Fixture, number> = { sockets: h * 0.18, gpo: -h * 0.28, monitor: h * 0.22, switch: -h * 0.2 };
        for (const f of spec.fixtures ?? []) g.add(this.at(this.fixture(f, s), 0, slots[f], fz));
        break;
      }

      case 'deck':
        g.add(this.box(w, h, d, this.top(), this.look.carpet ? false : 'birch'));
        break;

      case 'fridge-cabinet': {
        // Gables take the laminate finish; the top stays black honeycomb.
        for (const sx of [-1, 1]) g.add(this.at(this.box(18, h, d, this.front(), 'birch'), sx * (w / 2 - 9), 0, 0));
        g.add(this.at(this.box(w, 18, d, this.m.hex, 'birch'), 0, h / 2 - 9, 0));
        break;
      }

      case 'fridge-upright': {
        // Front-opening fridge. The door (with organiser pockets) is hinged on the left.
        // Hollow body so the inside shows when the door opens: three shelves and a freezer top left.
        const t = 30;
        const bd = d - 30;
        const bz = -15;
        for (const sx of [-1, 1]) g.add(this.at(this.box(t, h, bd, this.m.fridge), sx * (w / 2 - t / 2), 0, bz));
        g.add(this.at(this.box(w, t, bd, this.m.fridge), 0, h / 2 - t / 2, bz));
        g.add(this.at(this.box(w, t, bd, this.m.fridge), 0, -h / 2 + t / 2, bz));
        g.add(this.at(this.box(w, h, t, this.m.fridge), 0, 0, bz - bd / 2 + t / 2));
        const iw = w - 2 * t;
        const ih = h - 2 * t;
        const id = bd - t;
        const front = bz + bd / 2;
        g.add(this.at(this.box(iw, ih, 4, this.m.fridgeLiner), 0, 0, bz - bd / 2 + t + 2));
        for (const sx of [-1, 1]) g.add(this.at(this.box(4, ih, id, this.m.fridgeLiner), sx * (iw / 2 - 2), 0, bz + t / 2));
        // Freezer compartment, top left, with its own flap and handle.
        const fw = iw * 0.58;
        const fh = ih * 0.24;
        const fx = -iw / 2 + fw / 2;
        const fy = ih / 2 - fh / 2;
        g.add(this.at(this.box(fw, fh, id - 20, this.m.freezer), fx, fy, bz + t / 2 - 10));
        g.add(this.at(this.box(fw, fh, 8, this.m.freezerDoor), fx, fy, front - 14));
        g.add(this.at(this.box(fw * 0.4, 10, 12, this.m.black), fx, fy - fh / 2 + 18, front - 6));
        // Three glass shelves spaced down the fridge, the top one under the freezer.
        for (const k of [1, 2, 3]) {
          g.add(this.at(this.box(iw - 8, 8, id - 30, this.m.shelf), 0, -ih / 2 + (ih * k) / 4, bz + t / 2 - 5));
        }
        const door = new THREE.Group();
        door.add(this.box(w, h, 30, this.m.fridge));
        const fz = 17;
        door.add(this.at(this.box(w - 40, h - 70, 4, this.m.organiser), 0, -10, fz));
        const pocketRow = (count: number, y: number, ph: number) => {
          const pw = (w - 60) / count;
          for (let i = 0; i < count; i++) door.add(this.at(this.box(pw - 6, ph, 10, this.m.pocket), -((w - 60) / 2) + pw * (i + 0.5), y, fz + 5));
        };
        pocketRow(4, h * 0.22, h * 0.18);
        pocketRow(1, -h * 0.02, h * 0.13);
        pocketRow(5, -h * 0.3, h * 0.2);
        door.add(this.at(this.box(70, 20, 14, this.m.black), 0, h / 2 - 16, fz + 4));
        const pivot = this.hingedDoor(w, h, 'left', door);
        pivot.position.z = (d / 2 - 15) * MM;
        g.add(pivot);
        g.userData.door = pivot;
        break;
      }

      case 'fridge-chest': {
        const body = new THREE.Mesh(new RoundedBoxGeometry(w * MM, h * 0.82 * MM, d * MM, 3, 0.02), this.m.fridge);
        body.castShadow = true;
        body.position.y = (-h * 0.09) * MM;
        g.add(body);
        const lid = new THREE.Mesh(new RoundedBoxGeometry(w * MM, h * 0.18 * MM, d * MM, 3, 0.02), this.m.fridgeLid);
        lid.castShadow = true;
        lid.position.y = (h * 0.41) * MM;
        g.add(lid);
        g.add(this.at(this.box(60, 30, 10, this.m.steel), 0, h * 0.25, d / 2 + 5));
        g.add(this.at(this.box(w + 40, 30, d + 20, spec.move ? this.m.steel : this.m.hex), 0, -h / 2 - 15, 0));
        break;
      }

      case 'slats': {
        // Pull-out bed frame: birch slats between two rails.
        const count = Math.max(5, Math.round(w / 120));
        const pitch = w / count;
        for (let i = 0; i < count; i++) {
          g.add(this.at(this.box(70, h - 8, d, this.m.ply, true), -w / 2 + pitch * (i + 0.5), 4, 0));
        }
        for (const sz of [-1, 1]) g.add(this.at(this.box(w, h, 40, this.m.hex, 'birch'), 0, 0, sz * (d / 2 - 20)));
        // Fold-down legs at the far end.
        for (const sx of [-1, 1]) g.add(this.at(this.box(30, spec.y, 30, this.m.alu), sx * (w / 2 - 50), -h / 2 - spec.y / 2, -d / 2 + 30));
        break;
      }

      case 'mattress':
      case 'mattress-fold': {
        const m = new THREE.Mesh(new RoundedBoxGeometry(w * MM, h * MM, d * MM, 4, 0.03), this.m.mattress);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
        if (spec.kind === 'mattress-fold') {
          const pillow = new THREE.Mesh(new RoundedBoxGeometry(Math.min(w * 0.7, 520) * MM, 0.06, 0.32, 4, 0.025), this.m.pillow);
          g.add(this.at(pillow, 0, h / 2 + 20, -d / 2 + 220));
        }
        break;
      }
    }
    return g;
  }

  private basePosition(spec: ModuleSpec): THREE.Vector3 {
    return new THREE.Vector3(spec.x * MM, (spec.y + spec.h / 2) * MM, spec.z * MM);
  }

  private sameShape(a: ModuleSpec, b: ModuleSpec) {
    return (
      a.kind === b.kind && a.w === b.w && a.h === b.h && a.d === b.d && a.badge === b.badge && a.swing === b.swing && a.tableSlide === b.tableSlide && (a.from ?? []).join() === (b.from ?? []).join() &&
      (a.move ?? []).join() === (b.move ?? []).join() && (a.fixtures ?? []).join() === (b.fixtures ?? []).join()
    );
  }

  update(layout: Layout, look: Look) {
    const finishChanged = look.fronts !== this.look.fronts || look.carpet !== this.look.carpet;
    this.look = { ...look };
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
      if (existing) this.modulesGroup.remove(existing.object);
      const object = this.buildModule(spec);
      object.position.copy(this.basePosition(spec));
      this.modulesGroup.add(object);
      this.tracked.set(spec.id, {
        spec,
        object,
        // Restyled or resized parts swap in place; new parts pop in.
        appear: existing || this.reduceMotion ? 1 : 0,
        removing: false,
        openT: existing?.openT ?? (this.open ? 1 : 0),
        pos: this.basePosition(spec),
      });
    }
  }

  setOpen(open: boolean) {
    if (open === this.open) return;
    this.open = open;
    // Pull back so the drawers, bed and table outside the car all fit, then come back in on close.
    const dist = this.camera.position.distanceTo(this.controls.target);
    this.distGoal = Math.min(this.controls.maxDistance, open ? dist * 1.45 : dist / 1.45);
  }

  /** Dev only (wired up in development builds): freeze the table sequence at s (0..1), or null to resume. */
  freezeSequence(s: number | null) {
    this.seqOverride = s;
    if (s !== null) this.open = s > 0;
  }

  resetView() {
    this.camera.position.set(0.85, 1.4, 1.8);
    this.controls.autoRotate = !this.reduceMotion;
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
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
    const realDt = Math.min((now - this.lastFrame) / 1000, 0.25);
    const dt = Math.min(realDt, 0.05);
    this.lastFrame = now;

    // Gentle back-and-forth sway until someone grabs it.
    if (this.controls.autoRotate) {
      const az = this.controls.getAzimuthalAngle();
      if (az > 0.8) this.controls.autoRotateSpeed = -Math.abs(this.controls.autoRotateSpeed);
      if (az < -0.8) this.controls.autoRotateSpeed = Math.abs(this.controls.autoRotateSpeed);
    } else if (!this.reduceMotion && this.lastInteraction && performance.now() - this.lastInteraction > 8000) {
      this.controls.autoRotate = true;
    }
    if (this.distGoal !== null) {
      const offset = this.camera.position.clone().sub(this.controls.target);
      const dist = offset.length();
      const next = dist + (this.distGoal - dist) * (this.reduceMotion ? 1 : 1 - Math.pow(0.02, dt));
      this.camera.position.copy(this.controls.target).add(offset.setLength(next));
      if (Math.abs(next - this.distGoal) < 0.005) this.distGoal = null;
    }
    this.controls.update();

    const speed = this.reduceMotion ? 1 : 1 - Math.pow(0.0015, dt);
    const seqTarget = this.open ? 1 : 0;
    this.seqT = this.reduceMotion ? seqTarget : this.seqT + Math.sign(seqTarget - this.seqT) * Math.min(Math.abs(seqTarget - this.seqT), realDt / 4.5);
    if (this.seqOverride !== null) this.seqT = this.seqOverride;
    for (const [id, t] of this.tracked) {
      t.pos.lerp(this.basePosition(t.spec), speed);
      t.openT += ((this.open ? 1 : 0) - t.openT) * speed;
      const mv = t.spec.move ?? [0, 0, 0];

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
      const o = t.openT;
      t.object.position.set(t.pos.x + mv[0] * MM * o, t.pos.y + drop + mv[1] * MM * o, t.pos.z + mv[2] * MM * o);
      (t.object.userData.seq as ((s: number) => void) | undefined)?.(this.seqT);
      const inner = t.object.userData.inner as { obj: THREE.Object3D; z0: number; dz: number } | undefined;
      if (inner) inner.obj.position.z = inner.z0 + inner.dz * MM * o;
      const door = t.object.userData.door as THREE.Object3D | undefined;
      if (door) door.rotation.y = (door.userData.openAngle ?? -1.75) * o;
      const scale = t.removing ? a : Math.max(0.001, Math.min(ease, 1.06));
      t.object.scale.setScalar(scale);
    }

    this.renderer.render(this.scene, this.camera);
  };
}
