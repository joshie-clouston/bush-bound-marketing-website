// Kit builder engine: turns the customer's picks into a recommendation and a
// stylised 3D layout for the preview.
//
// IMPORTANT: this file ships to the browser.
// - The layout is a deliberately simplified, rounded approximation of our wagon base
//   layout so the preview looks like a Bush Bound fit-out. It is NOT derived from our
//   Fusion models and must never contain real CAD dimensions, joinery or cut lists.
// - It contains NO prices. Pricing lives in pricing.server.ts and only the bracket
//   ever reaches the browser.
//
// Pure functions with no DOM or three.js imports, so the same logic runs in the
// browser (live preview) and on the Worker.

import {
  BASE_KIT,
  BUILD_LABELS,
  DEFAULT_STORAGE,
  ELECTRICAL_BUILD_LABELS,
  FINISHES,
  QUESTIONS,
  STORAGE,
  VEHICLES,
  getFridge,
  getVehicle,
  type FinishId,
  type Fridge,
  type FridgeId,
  type Question,
  type StorageId,
  type Vehicle,
  type VehicleId,
} from '@/data/kit-builder';

export interface KitAnswers {
  fridge?: FridgeId | 'none';
  /** Chest fridges only: on a slide-out rack, or fixed and reached from the side window */
  chestMount?: 'slide' | 'fixed';
  /** Customer already owns the fridge */
  ownFridge?: boolean;
  storage?: StorageId[];
  power12?: 'yes' | 'no';
  power240?: 'yes' | 'no';
  electricalBuild?: 'diy' | 'assembled' | 'installed';
  finish?: FinishId;
  build?: 'diy' | 'assembled' | 'installed';
  /** Carpet-lined tops, only with build === 'installed' */
  carpet?: boolean;
  vehicle?: VehicleId;
  /** Free text when they picked "Something else" */
  vehicleName?: string;
}

/** Drop anything that isn't a valid option. Used on the server before trusting client input. */
export function sanitiseAnswers(input: unknown): KitAnswers {
  const out: Record<string, unknown> = {};
  if (!input || typeof input !== 'object') return out;
  const raw = input as Record<string, unknown>;
  for (const q of QUESTIONS) {
    const allowed = new Set(q.options.map((o) => o.value));
    const value = raw[q.id];
    if (q.multi) {
      if (Array.isArray(value)) out[q.id] = [...new Set(value.filter((v): v is string => typeof v === 'string' && allowed.has(v)))];
    } else if (typeof value === 'string' && allowed.has(value)) {
      out[q.id] = value;
    }
  }
  if (typeof raw.vehicle === 'string' && VEHICLES.some((v) => v.id === raw.vehicle)) out.vehicle = raw.vehicle;
  if (raw.chestMount === 'slide' || raw.chestMount === 'fixed') out.chestMount = raw.chestMount;
  if (raw.ownFridge === true) out.ownFridge = true;
  if (raw.carpet === true && out.build === 'installed') out.carpet = true;
  if (typeof raw.vehicleName === 'string' && raw.vehicleName.trim()) out.vehicleName = raw.vehicleName.trim().slice(0, 80);
  if (out.power12 !== 'yes' && out.power240 !== 'yes') delete out.electricalBuild;
  return out as KitAnswers;
}

export const storage = (a: KitAnswers) => new Set<StorageId>(a.storage ?? DEFAULT_STORAGE);
export const wants12 = (a: KitAnswers) => a.power12 === 'yes';
export const wants240 = (a: KitAnswers) => a.power240 === 'yes';
export const wantsPower = (a: KitAnswers) => wants12(a) || wants240(a);
export const chestOnSlide = (a: KitAnswers) => a.chestMount !== 'fixed';
export const carpetOn = (a: KitAnswers) => a.build === 'installed' && a.carpet === true;
/** Questions that apply to these answers (the electrical build question only shows if they want power). */
export const isAsked = (q: Question, a: KitAnswers) => !q.needsPower || wantsPower(a);

// ---------------------------------------------------------------------------
// Layout (stylised)
// ---------------------------------------------------------------------------

export type ModuleKind =
  | 'carcass'
  | 'drawer'
  | 'cubby'
  | 'camp-table'
  | 'drawer-fridge'
  | 'end-panel'
  | 'deck'
  | 'fridge-cabinet'
  | 'fridge-upright'
  | 'fridge-chest'
  | 'slats'
  | 'mattress'
  | 'mattress-fold';

export type Fixture = 'sockets' | 'gpo' | 'monitor' | 'switch';

/** A box in vehicle space, mm. x/z are centres, y is the bottom face. z=0 is the tailgate, -z runs forward. */
export interface ModuleSpec {
  id: string;
  kind: ModuleKind;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  /** Where it moves to (offset, mm) when "Open" is toggled */
  move?: [number, number, number];
  /** Door swings open when "Open" is toggled ('left' or 'right' hinge) */
  swing?: 'left' | 'right';
  /** Camp table only: where the folded table sits inside its cubby, relative to its set-up spot (mm) */
  from?: [number, number, number];
  /** Drawer with a pull-out table inside it: how much further the table slides out of the drawer, mm */
  tableSlide?: number;
  fixtures?: Fixture[];
  badge?: boolean;
}

export interface Layout {
  vehicle: Vehicle;
  modules: ModuleSpec[];
  columns: number;
  fridge: Fridge | null;
  bed: boolean;
  seatsFolded: boolean;
  bedIsSingle: boolean;
  fridgeTooWide: boolean;
  fridgeTooTall: boolean;
}

const T = 18; // panel thickness used for the look of the preview
const GAP = 20; // inset from the tailgate
const round = (n: number, step = 10) => Math.round(n / step) * step;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export function buildLayout(answers: KitAnswers): Layout {
  const v = getVehicle(answers.vehicle);
  const modules: ModuleSpec[] = [];
  const store = storage(answers);
  const fridge = getFridge(answers.fridge);
  const upright = fridge?.type === 'upright';
  const chest = fridge?.type === 'chest';
  const drawerFridge = fridge?.type === 'drawer';
  const bed = store.has('bed');

  const W = v.floorWidth;
  const A = v.archWidth;
  const endW = (W - A) / 2;
  const left = -A / 2;
  const depth = round(clamp(v.cargoLength - 60, 400, 1150));
  const zMid = -(GAP + depth / 2);
  const zFront = -(GAP + depth);
  const fz = zMid + 15; // drawer centre, so the front sits proud of the carcass
  const out = (d: number): [number, number, number] => [0, 0, d];

  const H = drawerFridge && fridge ? Math.max(280, fridge.h + 40) : 280;
  const lowH = 220; // cabinet under the upright fridge
  const columns = A >= 1500 ? 3 : 2;
  const colW = A / columns;
  const colX = (i: number) => left + colW * (i + 0.5);
  const R = columns - 1;
  let fridgeTooWide = false;
  let fridgeTooTall = false;

  // The table cubby sits at the outer edge of the right-hand cabinet (as on our base build),
  // or the left-hand column when the right column is taken by a drawer or chest fridge.
  const cubbyCol = store.has('cubby') ? (drawerFridge || chest ? 0 : R) : -1;
  const cubbyW = round(colW * 0.3);
  let cubbyAt: { x: number; y: number } | null = null;

  /** Fronts for one column's cabinet, from the floor to height h. */
  const fillColumn = (i: number, h: number, opts: { fridgeDrawer?: boolean; badge?: boolean } = {}) => {
    const inner = colW - 2 * T;
    let x0 = left + colW * i + T;
    let w = inner;
    if (cubbyCol === i) {
      const atRight = i === R && i !== 0;
      const cx = atRight ? x0 + inner - cubbyW / 2 : x0 + cubbyW / 2;
      modules.push({ id: 'cubby', kind: 'cubby', x: cx, y: T, z: -(GAP - 8), w: cubbyW - 4, h: h - 2 * T, d: 18, swing: 'right' });
      cubbyAt = { x: cx, y: T + (h - 2 * T) / 2 };
      w = inner - cubbyW;
      if (!atRight) x0 += cubbyW;
    }
    const cx = x0 + w / 2;
    if (opts.fridgeDrawer) {
      modules.push({ id: 'fridge', kind: 'drawer-fridge', x: cx, y: T, z: fz, w: w - 4, h: h - 2 * T, d: depth - 30, move: out(depth * 0.6) });
      return;
    }
    // The pull-out table lives inside the left drawer and slides out of it (and goes out with the drawer).
    const tableSlide = i === 0 && store.has('pullout') ? round(depth * 0.55) : undefined;
    modules.push({ id: `drawer-${i}`, kind: 'drawer', x: cx, y: T, z: fz, w: w - 4, h: h - 2 * T, d: depth - 30, move: out(depth * 0.6), badge: opts.badge, tableSlide });
  };

  for (let i = 0; i < columns; i++) {
    const x = colX(i);

    if (i === R && upright && fridge) {
      // Upright fridge cabinet on top of a drawer and the table cubby.
      modules.push({ id: `carcass-${i}`, kind: 'carcass', x, y: 0, z: zMid, w: colW, h: lowH, d: depth });
      fillColumn(i, lowH);
      modules.push({ id: `deck-${i}`, kind: 'deck', x, y: lowH, z: zMid, w: colW, h: 12, d: depth });
      fridgeTooWide = fridge.w > colW - 40;
      const cabH = fridge.h + 50;
      const cabY = lowH + 12;
      fridgeTooTall = cabY + cabH > v.roofHeight - 20;
      const cabD = Math.min(fridge.d + 60, depth);
      const cabZ = -(GAP + cabD / 2);
      modules.push({ id: 'fridge-cabinet', kind: 'fridge-cabinet', x, y: cabY, z: cabZ, w: colW, h: cabH, d: cabD });
      modules.push({ id: 'fridge', kind: 'fridge-upright', x, y: cabY + 10, z: cabZ + 5, w: Math.min(fridge.w, colW - 40), h: fridge.h, d: Math.min(fridge.d, cabD - 20), swing: 'left' });
      continue;
    }

    if (i === R && chest && fridge) {
      // Chest fridge on a slide-out rack, or fixed on a tie-down base and reached from the side window.
      fridgeTooWide = fridge.w > colW - 30;
      const fd = Math.min(fridge.d, depth - 20);
      const slide = chestOnSlide(answers);
      modules.push({
        id: 'fridge',
        kind: 'fridge-chest',
        x,
        y: 0,
        z: slide ? -(GAP + fd / 2) : zFront + fd / 2,
        w: Math.min(fridge.w, colW - 30),
        h: fridge.h,
        d: fd,
        move: slide ? out(fd * 0.85) : undefined,
      });
      continue;
    }

    modules.push({ id: `carcass-${i}`, kind: 'carcass', x, y: 0, z: zMid, w: colW, h: H, d: depth });
    modules.push({ id: `deck-${i}`, kind: 'deck', x, y: H, z: zMid, w: colW, h: 12, d: depth });
    if (i === R && drawerFridge && fridge) {
      fridgeTooWide = fridge.w > colW - 30;
      fillColumn(i, H, { fridgeDrawer: true });
    } else {
      fillColumn(i, H, { badge: i === 0 });
    }
  }

  // Bush Bound camp table: folded inside its cubby, and on "Open" it comes out, unfolds twice
  // and drops its legs beside the car (right-hand side).
  // (cubbyAt is set inside fillColumn, which TypeScript can't see, hence the cast.)
  const cubby = cubbyAt as { x: number; y: number } | null;
  if (store.has('cubby') && cubby) {
    const t = { x: W / 2 + 380, y: -25, z: 200, w: 440, h: 640, d: 720 };
    const from: [number, number, number] = [cubby.x - t.x, cubby.y - (t.y + t.h / 2), -(GAP + 380) - t.z];
    modules.push({ id: 'camp-table', kind: 'camp-table', ...t, from });
  }

  // End panels over the wheel arches: 12V sockets / 240V outlet on the left, monitor and switch on the right.
  if (endW >= 40) {
    const roomy = endW >= 70;
    const leftFx: Fixture[] = roomy ? [...(wants12(answers) ? (['sockets'] as Fixture[]) : []), ...(wants240(answers) ? (['gpo'] as Fixture[]) : [])] : [];
    const rightFx: Fixture[] = roomy && wantsPower(answers) ? ['monitor', 'switch'] : [];
    modules.push({ id: 'end-left', kind: 'end-panel', x: -W / 2 + endW / 2 + 3, y: 0, z: zMid, w: endW - 6, h: H, d: depth, fixtures: leftFx });
    modules.push({ id: 'end-right', kind: 'end-panel', x: W / 2 - endW / 2 - 3, y: 0, z: zMid, w: endW - 6, h: upright ? lowH : H, d: depth, fixtures: rightFx });
  }

  // Pull-out bed: slats stowed under the deck top slide forward over the folded seats,
  // and the folded mattress opens out on top. With a tall fridge it's a single beside it.
  const deckTop = H + 12;
  const tallFridge = upright || chest;
  const bedLeft = -W / 2 + 20;
  const bedRight = tallFridge ? left + colW * R : W / 2 - 20;
  const bedW = bedRight - bedLeft;
  const bedX = (bedLeft + bedRight) / 2;
  if (bed) {
    const ext = Math.min(v.sleepLength - GAP - depth, depth - 40);
    modules.push({ id: 'slats', kind: 'slats', x: bedX, y: deckTop - 34, z: zFront + ext / 2 + 10, w: bedW, h: 30, d: ext, move: [0, 0, -ext - 10] });
    const half = round((v.sleepLength - GAP - 40) / 2);
    const lowerZ = -(GAP + 20 + half / 2);
    modules.push({ id: 'mattress', kind: 'mattress', x: bedX, y: deckTop, z: lowerZ, w: bedW - 40, h: 80, d: half });
    modules.push({ id: 'mattress-top', kind: 'mattress-fold', x: bedX, y: deckTop + 80, z: lowerZ, w: bedW - 40, h: 80, d: half, move: [0, -80, -half] });
  }

  return { vehicle: v, modules, columns, fridge, bed, seatsFolded: bed, bedIsSingle: bed && tallFridge, fridgeTooWide, fridgeTooTall };
}

// ---------------------------------------------------------------------------
// Recommendation (no prices)
// ---------------------------------------------------------------------------

export interface QuoteItem {
  group: 'Cabinetry' | 'Fridge' | 'Power';
  label: string;
}

export interface Recommendation {
  kitName: string;
  tagline: string;
  /** Short list of picks for the viewer and summary chips */
  addOns: string[];
  vehicle: Vehicle;
  layout: Layout;
  why: string[];
  tips: string[];
  includes: string[];
  items: QuoteItem[];
}

export function recommend(answers: KitAnswers): Recommendation {
  const layout = buildLayout(answers);
  const v = layout.vehicle;
  const fridge = layout.fridge;
  const store = storage(answers);
  const finish = FINISHES.find((f) => f.id === (answers.finish ?? 'hex'))!;
  const build = answers.build;
  const carpet = carpetOn(answers);
  const p12 = wants12(answers);
  const p240 = wants240(answers);
  const eBuild = answers.electricalBuild ?? 'diy';

  const fridgeName = fridge ? (fridge.type === 'chest' ? `${fridge.label}${chestOnSlide(answers) ? ' on slide' : ', fixed'}` : fridge.label) : 'No fridge';
  const addOns: string[] = [fridgeName];
  for (const s of STORAGE) if (store.has(s.id)) addOns.push(s.label);
  if (p12) addOns.push('12V');
  if (p240) addOns.push('240V');
  if (finish.id !== 'hex') addOns.push(finish.label.replace(' fronts', ''));
  if (carpet) addOns.push('Carpet');

  const why: string[] = [`Drawers split evenly across the space between the wheel arches, in our black honeycomb birch ply${finish.id !== 'hex' ? ` with ${finish.label.toLowerCase()}` : ''}.`];
  if (fridge?.type === 'upright') why.push(`${fridge.label} in its own cabinet at waist height. The door opens straight towards you, like the one at home.`);
  if (fridge?.type === 'drawer') why.push(`${fridge.label} built flush into the right-hand column. Slides out like any other drawer.`);
  if (fridge?.type === 'chest') {
    why.push(chestOnSlide(answers)
      ? `${fridge.label} on a slide-out rack. Pull it out past the tailgate and the lid opens clear.`
      : `${fridge.label} fixed on a tie-down base. Reach in from the side window, no slide needed.`);
  }
  if (!fridge) why.push('No fridge, so it\'s drawers right across.');
  if (layout.bed) why.push(`Sliding bed: the slats slide forward over the folded rear seats and the mattress folds out on top${layout.bedIsSingle ? ', a single beside the fridge' : ''}. Packs away in seconds.`);
  if (store.has('pullout')) why.push('Pull-out table slides out from the bottom of the left drawer. Instant bench at the tailgate.');
  if (store.has('cubby')) why.push('Your folding Bush Bound table lives in its own hinged cubby. Open the door, grab it, set it up beside the car.');
  if (p12) why.push('12V and USB sockets on the side panel, with a battery monitor and switch.');
  if (p240) why.push('240V outlet for laptops, chargers and small appliances, running off the 12V battery.');

  const tips: string[] = [];
  if (layout.fridgeTooWide && fridge) tips.push(`The ${fridge.label} is wider than an even split allows in a ${v.short}. We'd widen the fridge column a touch in your design, or a smaller fridge keeps everything even.`);
  if (layout.fridgeTooTall && fridge) tips.push(`The ${fridge.label} cabinet is tight for the roof height in a ${v.short}. A smaller upright, a drawer fridge or a chest fridge would sit lower.`);
  if (layout.bedIsSingle) tips.push('With a tall fridge in the right-hand column, the bed is a single beside it. Want a full-width bed? A drawer fridge keeps the top flat.');
  if (fridge?.type === 'chest' && !chestOnSlide(answers)) tips.push('A fixed chest fridge saves on the slide. Just make sure you can open the side window wide enough to reach in, otherwise the slide is worth it.');
  if (p240 && !p12) tips.push('240V runs off a 12V battery through an inverter, so we\'ll include the battery and charging it needs.');
  if (wantsPower(answers)) tips.push('We\'ll chat about what you want to run (fridge, Starlink, laptops, coffee) and size the battery and solar to suit before anything ships.');
  if (wantsPower(answers) && eBuild === 'installed' && build !== 'installed') tips.push('Electrical install happens at our Gold Coast workshop, so you\'ll need to bring the car in for that part.');
  if (build === 'diy') tips.push('Most people build our kits in a weekend with a drill, a few clamps and a mate. Every panel is numbered and the floor template marks exactly where to drill, clear of fuel tanks and wiring.');
  if (build && build !== 'installed') tips.push('Carpet-lined tops are only available if we build and install it for you, because carpet doesn\'t flat pack.');

  // What goes on the quote (labels only, priced on the server).
  const items: QuoteItem[] = [{ group: 'Cabinetry', label: `${BASE_KIT.name} for ${answers.vehicle === 'other' ? answers.vehicleName || 'your vehicle' : v.short}` }];
  if (fridge?.type === 'upright') items.push({ group: 'Cabinetry', label: 'Upright fridge cabinet' });
  if (fridge?.type === 'drawer') items.push({ group: 'Cabinetry', label: 'Drawer fridge column' });
  if (fridge?.type === 'chest') items.push({ group: 'Cabinetry', label: chestOnSlide(answers) ? 'Chest fridge slide-out rack' : 'Fixed chest fridge tie-down base' });
  for (const s of STORAGE) if (store.has(s.id)) items.push({ group: 'Cabinetry', label: s.label });
  items.push({ group: 'Cabinetry', label: finish.id === 'hex' ? 'Black honeycomb birch ply' : `Black honeycomb with ${finish.label.toLowerCase()}` });
  if (carpet) items.push({ group: 'Cabinetry', label: 'Carpet-lined tops' });
  if (build) items.push({ group: 'Cabinetry', label: BUILD_LABELS[build] });
  if (fridge) items.push({ group: 'Fridge', label: answers.ownFridge ? `${fridge.label} (you have one)` : `${fridge.label} (we can supply)` });
  if (p12 || p240) items.push({ group: 'Power', label: 'House battery with DC-DC charging' });
  if (p12) items.push({ group: 'Power', label: '12V and USB sockets, battery monitor and switch' });
  if (p240) items.push({ group: 'Power', label: 'Inverter and 240V outlet' });
  if (wantsPower(answers)) items.push({ group: 'Power', label: ELECTRICAL_BUILD_LABELS[eBuild] });

  const includes = [
    'Your layout drawn up by our team for your vehicle, approved by you before we cut',
    'CNC-cut black honeycomb birch ply, every panel numbered',
    'Pre-drilled joins and all hardware',
    'Floor install template, clear of fuel tanks, lines and wiring',
    'Heavy-duty ball-bearing slides and flush paddle latches',
    build === 'installed' ? 'Workshop install on the Gold Coast' : build === 'assembled' ? 'Assembled and checked before it ships' : 'Flat packed and shipped Australia-wide, or built and installed for you',
  ];

  return { kitName: BASE_KIT.name, tagline: BASE_KIT.tagline, addOns, vehicle: v, layout, why, tips, includes, items };
}

/** Plain-text summary for the CRM and staff email. */
export function summaryText(answers: KitAnswers, rec: Recommendation): string {
  const q = (id: string) => {
    const question = QUESTIONS.find((x) => x.id === id);
    const value = (answers as Record<string, unknown>)[id];
    if (!question || value === undefined) return '-';
    if (Array.isArray(value)) return value.map((v) => question.options.find((o) => o.value === v)?.label ?? v).join(', ') || 'None';
    return question.options.find((o) => o.value === value)?.label ?? String(value);
  };
  const fridge = rec.layout.fridge;
  return [
    `${rec.kitName} for ${answers.vehicle === 'other' ? answers.vehicleName || 'Other vehicle (not specified)' : rec.vehicle.label}`,
    `Fridge: ${fridge ? `${fridge.label}${fridge.type === 'chest' ? (answers.chestMount === 'fixed' ? ', fixed (side window access)' : ', on slide-out rack') : ''}${answers.ownFridge ? ' (customer has their own)' : ''}` : 'None'}`,
    `Options: ${q('storage')}`,
  ].join('\n');
}
