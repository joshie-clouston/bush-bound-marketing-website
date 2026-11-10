// Three.js preview for the kit builder. Client-only: loaded with a dynamic import
// so the questionnaire still works (and the page stays light) if WebGL isn't available.
//
// This is a stylised look-alike of the Bush Bound wagon base layout built from simple
// boxes: forest green fronts with birch edges, finger-pull notches, paddle latches,
// grey carpet tops, a ply fridge tower and side panels with power fittings.
// It is generated in the browser from rounded proportions only. No CAD or Fusion
// data is loaded, and there's no way to export a model from it.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Fixture, Layout, ModuleSpec } from '@/lib/kit-builder/engine';

type Finish = 'budget' | 'balanced' | 'premium';

const MM = 0.001;

interface Tracked {
  spec: ModuleSpec;
  object: THREE.Object3D;
  appear: number;
  removing: boolean;
  slideCurrent: number;
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
  private dimsGroup = new THREE.Group();
  private dimsKey = '';
  private tracked = new Map<string, Tracked>();
  private open = false;
  private finish: Finish = 'balanced';
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

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 50);
    this.camera.position.set(0.85, 1.4, 1.8);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
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
    });

    this.buildMaterials();
    this.buildLights();
    this.scene.add(this.envelope, this.modulesGroup, this.dimsGroup);

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
      green: new THREE.MeshStandardMaterial({ color: 0x34453e, roughness: 0.55 }),
      carpet: new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 }),
      hex: new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.9 }),
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
      tank: new THREE.MeshPhysicalMaterial({ color: 0x4a90c2, roughness: 0.25, transparent: true, opacity: 0.8 }),
      solar: new THREE.MeshStandardMaterial({ color: 0x14243a, metalness: 0.4, roughness: 0.3 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.95 }),
      arch: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 }),
      seat: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.95 }),
      shell: new THREE.MeshStandardMaterial({ color: 0xc4a882, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }),
      shellLine: new THREE.LineBasicMaterial({ color: 0xc4a882, transparent: true, opacity: 0.3 }),
      windowLine: new THREE.LineDashedMaterial({ color: 0xc4a882, dashSize: 0.04, gapSize: 0.03, transparent: true, opacity: 0.45 }),
      ground: new THREE.ShadowMaterial({ opacity: 0.25 }),
      dimLine: new THREE.LineBasicMaterial({ color: 0xc4a882, depthTest: false, transparent: true }),
      fridgeLid: new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5 }),
      fridgeInside: new THREE.MeshStandardMaterial({ color: 0x9aa3a8, roughness: 0.6 }),
    };
  }

  private front(): THREE.Material {
    return this.finish === 'budget' ? this.m.ply : this.m.green;
  }

  private top(): THREE.Material {
    return this.finish === 'premium' ? this.m.hex : this.m.carpet;
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
  private box(w: number, h: number, d: number, material: THREE.Material, edges = false): THREE.Mesh {
    const geo = new THREE.BoxGeometry(Math.max(w, 0.1) * MM, Math.max(h, 0.1) * MM, Math.max(d, 0.1) * MM);
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.m.edge));
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
      case 'air': {
        g.add(this.box(60 * s, 80 * s, 6, this.m.black));
        const coupler = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * s, 0.014 * s, 0.03, 20), this.m.brass);
        coupler.rotation.x = Math.PI / 2;
        g.add(this.at(coupler, 0, -10 * s, 16));
        break;
      }
    }
    return g;
  }

  // -------------------------------------------------------------------------
  // Modules
  // -------------------------------------------------------------------------

  private buildModule(spec: ModuleSpec): THREE.Object3D {
    const g = new THREE.Group();
    const { w, h, d } = spec;

    switch (spec.kind) {
      case 'carcass':
        g.add(this.box(w, h, d, this.m.ply, true));
        break;

      case 'drawer':
      case 'kitchen': {
        // Ply tray that slides out behind a green front.
        g.add(this.box(w - 12, h - 30, d, this.m.ply, true));
        g.add(this.at(this.cabinetFront(w + 8, h + 6, { badge: spec.badge }), 0, 0, d / 2 + 8));
        if (spec.kind === 'kitchen') {
          const stove = this.box(w * 0.4, 40, d * 0.4, this.m.black);
          g.add(this.at(stove, -w * 0.22, h / 2 - 10, d * 0.2));
          for (const off of [-0.1, 0.1]) {
            const burner = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.007, 8, 20), this.m.steel);
            burner.rotation.x = Math.PI / 2;
            burner.position.set(-w * 0.22 * MM, (h / 2 + 12) * MM, d * 0.2 * MM + off);
            g.add(burner);
          }
          g.add(this.at(this.box(w * 0.38, 20, d * 0.4, this.m.ply, true), w * 0.24, h / 2 - 20, d * 0.2));
        }
        break;
      }

      case 'end-panel': {
        g.add(this.box(w, h, d, this.front()));
        g.add(this.at(this.box(w + 4, 12, d + 2, this.top()), 0, h / 2 + 6, 0));
        const s = Math.min(1, (w - 30) / 100, h / 300);
        const fz = d / 2 + 4;
        // Stack fittings down the rear face of the panel.
        const slots: Record<Fixture, number> = { sockets: h * 0.18, gpo: -h * 0.3, monitor: h * 0.26, switch: -h * 0.04, air: -h * 0.3 };
        for (const f of spec.fixtures ?? []) g.add(this.at(this.fixture(f, s), 0, slots[f], fz));
        break;
      }

      case 'deck':
        g.add(this.box(w, h, d, this.top()));
        break;

      case 'hatch':
        g.add(this.cabinetFront(w, h, { latch: 'round' }));
        break;

      case 'table': {
        // Pull-out table: front panel with a tabletop that slides out behind it.
        g.add(this.at(this.box(w - 12, 18, d, this.top() === this.m.carpet ? this.m.ply : this.m.hex, true), 0, h / 2 - 12, 0));
        if (h > 100) g.add(this.at(this.box(w - 12, h - 40, d * 0.5, this.m.ply, true), 0, -14, d * 0.25));
        g.add(this.at(this.cabinetFront(w + 8, h + 6), 0, 0, d / 2 + 8));
        break;
      }

      case 'drawer-fridge': {
        // Fridge in a drawer: dark front with a bar handle, fridge body on the runners.
        g.add(this.at(this.box(w - 20, h - 30, d * 0.8, this.m.fridge), 0, -10, d * 0.1));
        g.add(this.at(this.box(w - 60, 8, d * 0.75, this.m.fridgeLid), 0, h / 2 - 22, d * 0.1));
        g.add(this.at(this.box(w + 8, h + 6, 16, this.m.fridge), 0, 0, d / 2 + 8));
        g.add(this.at(this.box(w * 0.5, 18, 20, this.m.steel), 0, h / 2 - 40, d / 2 + 24));
        g.add(this.at(new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.018), this.m.screen), w / 2 - 60, h / 2 - 40, d / 2 + 16.5));
        break;
      }

      case 'fridge-cabinet': {
        // Open ply frame around the upright fridge, edges exposed.
        for (const sx of [-1, 1]) g.add(this.at(this.box(18, h, d, this.m.ply, true), sx * (w / 2 - 9), 0, 0));
        g.add(this.at(this.box(w, 18, d, this.m.ply, true), 0, h / 2 - 9, 0));
        break;
      }

      case 'fridge-upright': {
        // Front-opening fridge. The door (with organiser pockets) is hinged on the left.
        const body = new THREE.Mesh(new RoundedBoxGeometry(w * MM, h * MM, (d - 30) * MM, 3, 0.012), this.m.fridge);
        body.castShadow = true;
        body.position.z = -15 * MM;
        g.add(body);
        g.add(this.at(this.box(w - 40, h - 40, 4, this.m.fridgeInside), 0, 0, d / 2 - 31));
        const pivot = new THREE.Group();
        pivot.position.set((-w / 2) * MM, 0, (d / 2 - 15) * MM);
        const door = new THREE.Group();
        door.position.x = (w / 2) * MM;
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
        pivot.add(door);
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
        g.add(this.at(this.box(w + 40, 30, d + 20, this.m.steel), 0, -h / 2 - 15, 0));
        break;
      }

      case 'slats': {
        // Ply rails with carpet pads, like the pull-out bed extension.
        const count = Math.max(4, Math.round(w / 140));
        const pitch = w / count;
        for (let i = 0; i < count; i++) {
          const x = -w / 2 + pitch * (i + 0.5);
          g.add(this.at(this.box(60, h, d, this.m.ply, true), x, 0, 0));
          const pads = Math.max(2, Math.round(d / 220));
          for (let j = 0; j < pads; j++) {
            g.add(this.at(this.box(70, 10, 150, this.m.carpet), x, h / 2 + 5, -d / 2 + (d / pads) * (j + 0.5)));
          }
        }
        for (const sz of [-1, 1]) g.add(this.at(this.box(w, h, 40, this.m.ply, true), 0, 0, sz * (d / 2 - 20)));
        break;
      }

      case 'platform':
        g.add(this.box(w, h, d, this.top()));
        break;

      case 'mattress': {
        const m = new THREE.Mesh(new RoundedBoxGeometry(w * MM, h * MM, d * MM, 4, 0.03), this.m.mattress);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
        const pillow = new THREE.Mesh(new RoundedBoxGeometry(Math.min(w * 0.7, 520) * MM, 0.06, 0.32, 4, 0.025), this.m.pillow);
        g.add(this.at(pillow, 0, h / 2 + 20, -d / 2 + 220));
        break;
      }

      case 'tank': {
        g.add(this.box(w, h, d, this.m.tank));
        const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 12), this.m.steel);
        tap.rotation.x = Math.PI / 2;
        g.add(this.at(tap, w * 0.3, 0, d / 2 + 25));
        break;
      }

      case 'solar': {
        g.add(this.box(w, h, d, this.m.solar));
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
    return a.kind === b.kind && a.w === b.w && a.h === b.h && a.d === b.d && a.badge === b.badge && a.swing === b.swing && (a.fixtures ?? []).join() === (b.fixtures ?? []).join();
  }

  // -------------------------------------------------------------------------
  // Measurement overlay: the customer's own boot measurements
  // -------------------------------------------------------------------------

  private label(text: string): THREE.Sprite {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 112;
    const ctx = c.getContext('2d')!;
    ctx.font = '600 44px Inter, system-ui, sans-serif';
    const tw = Math.min(ctx.measureText(text).width + 48, 768);
    ctx.fillStyle = '#C4A882';
    ctx.beginPath();
    ctx.roundRect((768 - tw) / 2, 16, tw, 80, 40);
    ctx.fill();
    ctx.fillStyle = '#1A1A1A';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 384, 58);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sprite.scale.set(0.66, 0.096, 1);
    sprite.renderOrder = 20;
    return sprite;
  }

  private dimension(a: THREE.Vector3, b: THREE.Vector3, tick: THREE.Vector3, text: string, labelAt: THREE.Vector3) {
    const pts = [a, b, a.clone().add(tick), a.clone().sub(tick), b.clone().add(tick), b.clone().sub(tick)];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    geo.setIndex([0, 1, 2, 3, 4, 5]);
    const line = new THREE.LineSegments(geo, this.m.dimLine);
    line.renderOrder = 19;
    const sprite = this.label(text);
    sprite.position.copy(labelAt);
    this.dimsGroup.add(line, sprite);
  }

  private buildDims(layout: Layout) {
    const { width, arches, depth, height } = layout.dims;
    const key = `${width}|${arches}|${depth}|${height}`;
    if (key === this.dimsKey) return;
    this.dimsKey = key;
    this.dimsGroup.clear();
    const W = width * MM;
    const A = arches * MM;
    const D = depth * MM;
    const H = height * MM;
    const mm = (n: number) => `${n.toLocaleString('en-AU')}mm`;
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    this.dimension(V(-W / 2, H + 0.05, 0.06), V(W / 2, H + 0.05, 0.06), V(0, 0.03, 0), `Boot width ${mm(width)}`, V(0, H + 0.13, 0.06));
    this.dimension(V(-A / 2, 0.005, 0.2), V(A / 2, 0.005, 0.2), V(0, 0, 0.03), `Between arches ${mm(arches)}`, V(0, -0.07, 0.2));
    this.dimension(V(-W / 2 - 0.08, 0.005, 0), V(-W / 2 - 0.08, 0.005, -D), V(0.03, 0, 0), `Depth ${mm(depth)}`, V(-W / 2 - 0.08, 0.09, -D / 2));
    this.dimension(V(W / 2 + 0.08, 0, 0.06), V(W / 2 + 0.08, H, 0.06), V(0.03, 0, 0), `Height ${mm(height)}`, V(W / 2 + 0.08, H / 2, 0.06));
  }

  setDimsVisible(visible: boolean) {
    this.dimsGroup.visible = visible;
  }

  update(layout: Layout, finish: Finish | undefined) {
    const nextFinish = finish ?? 'balanced';
    const finishChanged = nextFinish !== this.finish;
    this.finish = nextFinish;
    this.buildEnvelope(layout);
    this.buildDims(layout);

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
        // Restyled or resized parts swap in place (no jumping while typing measurements); new parts pop in.
        appear: existing || this.reduceMotion ? 1 : 0,
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
    this.camera.position.set(0.85, 1.4, 1.8);
    this.controls.autoRotate = !this.reduceMotion;
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
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
      const door = t.object.userData.door as THREE.Object3D | undefined;
      if (door) door.rotation.y += ((this.open ? -1.75 : 0) - door.rotation.y) * speed;
      t.object.scale.setScalar(t.removing ? a : Math.max(0.001, Math.min(ease, 1.06)));
    }

    this.renderer.render(this.scene, this.camera);
  };
}
