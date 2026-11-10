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

export class KitScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private envelope = new THREE.Group();
  private modulesGroup = new THREE.Group();
  private tracked = new Map<string, Tracked>();
  private open = false;
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
    const v = layout.vehicle;
    const key = `${v.id}|${layout.seatsFolded}|${v.floorWidth}|${v.archWidth}|${v.cargoLength}|${v.roofHeight}`;
    if (key === this.envelopeKey) return;
    this.envelopeKey = key;
    this.envelope.clear();

    const W = v.floorWidth;
    const totalLength = v.sleepLength + 300;

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), this.m.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.03;
    ground.receiveShadow = true;
    this.envelope.add(ground);

    this.envelope.add(this.at(this.box(W, 20, totalLength, this.m.floor), 0, -10, -totalLength / 2));

    const archW = (W - v.archWidth) / 2;
    for (const side of [-1, 1]) {
      this.envelope.add(this.at(this.box(archW - 10, v.archHeight, v.archLength, this.m.arch), side * (W / 2 - archW / 2), v.archHeight / 2, -v.cargoLength * 0.6));
    }

    const seatZ = -(v.cargoLength + 280);
    if (layout.seatsFolded) {
      this.envelope.add(this.at(this.box(W - 120, 240, 520, this.m.seat), 0, 120, seatZ));
    } else {
      this.envelope.add(this.at(this.box(W - 120, 420, 520, this.m.seat), 0, 210, seatZ));
      const back = this.at(this.box(W - 120, 640, 120, this.m.seat), 0, 740, -(v.cargoLength + 60));
      back.rotation.x = -0.12;
      this.envelope.add(back);
    }

    const shellGeo = new THREE.BoxGeometry(W * MM, v.roofHeight * MM, totalLength * MM);
    const shell = new THREE.Mesh(shellGeo, this.m.shell);
    shell.position.set(0, (v.roofHeight / 2) * MM, (-totalLength / 2) * MM);
    shell.renderOrder = -1;
    this.envelope.add(shell);
    const shellEdges = new THREE.LineSegments(new THREE.EdgesGeometry(shellGeo), this.m.shellLine);
    shellEdges.position.copy(shell.position);
    this.envelope.add(shellEdges);

    for (const side of [-1, 1]) {
      const pts = [new THREE.Vector3(side * (W / 2) * MM, v.windowHeight * MM, 0), new THREE.Vector3(side * (W / 2) * MM, v.windowHeight * MM, -totalLength * MM)];
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.m.windowLine);
      line.computeLineDistances();
      this.envelope.add(line);
    }

    this.controls.target.set(0, 0.35, (-v.cargoLength / 2 - 100) * MM);
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

      case 'drawer':
        g.add(this.drawerTray(w, h, d));
        g.add(this.at(this.cabinetFront(w + 8, h + 6, { badge: spec.badge }), 0, 0, d / 2 + 8));
        break;

      case 'pullout': {
        // Table top that slides out from under the left drawer.
        g.add(this.at(this.box(w - 10, 16, d, this.m.hex, 'birch'), 0, h / 2 - 12, 0));
        g.add(this.at(this.box(w - 40, h - 24, d * 0.9, this.m.ply, true), 0, -8, 0));
        const front = this.box(w + 8, h + 4, 16, this.front(), 'birch');
        g.add(this.at(front, 0, 0, d / 2 + 8));
        const pull = this.box(Math.min(160, w * 0.3), 14, 18, this.m.black);
        g.add(this.at(pull, 0, 0, d / 2 + 22));
        break;
      }

      case 'cubby': {
        // Hinged cubby door (right hinge) with the folded Bush Bound table inside.
        // The opening and the folded table's edges, drawn on the cabinet face (hidden behind the closed door).
        g.add(this.at(this.box(w - 6, h - 6, 2, this.m.recess), 0, 0, -7));
        for (const fx of [-0.18, 0, 0.18]) g.add(this.at(this.box(18, h - 50, 3, this.m.timber), w * fx, 0, -5));
        const door = this.cabinetFront(w, h, { latch: 'round' });
        g.add(this.hingedDoor(w, h, 'right', door));
        g.userData.door = g.children[g.children.length - 1];
        break;
      }

      case 'camp-table': {
        // Bush Bound camp table: four slats on top, four legs.
        const slatW = (w - 3 * 12) / 4;
        for (let k = 0; k < 4; k++) {
          g.add(this.at(this.box(slatW, 18, d, this.m.timber, true), -w / 2 + slatW / 2 + k * (slatW + 12), h / 2 - 9, 0));
        }
        for (const sz of [-1, 1]) g.add(this.at(this.box(w - 40, 20, 24, this.m.alu), 0, h / 2 - 28, sz * (d / 2 - 40)));
        for (const sx of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, (h - 30) * MM, 12), this.m.alu);
            leg.castShadow = true;
            g.add(this.at(leg, sx * (w / 2 - 50), -15, sz * (d / 2 - 40)));
          }
        }
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
        const body = new THREE.Mesh(new RoundedBoxGeometry(w * MM, h * MM, (d - 30) * MM, 3, 0.012), this.m.fridge);
        body.castShadow = true;
        body.position.z = -15 * MM;
        g.add(body);
        g.add(this.at(this.box(w - 40, h - 40, 4, this.m.fridgeInside), 0, 0, d / 2 - 31));
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
      a.kind === b.kind && a.w === b.w && a.h === b.h && a.d === b.d && a.badge === b.badge && a.swing === b.swing &&
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
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
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
      const door = t.object.userData.door as THREE.Object3D | undefined;
      if (door) door.rotation.y = (door.userData.openAngle ?? -1.75) * o;
      const scale = t.removing ? a : Math.max(0.001, Math.min(ease, 1.06));
      t.object.scale.setScalar(t.spec.onlyOpen ? Math.max(0.001, scale * o) : scale);
      t.object.visible = !t.spec.onlyOpen || o > 0.02;
    }

    this.renderer.render(this.scene, this.camera);
  };
}
