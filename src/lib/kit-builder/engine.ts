// Kit builder engine: turns questionnaire answers into a recommendation and a
// stylised 3D layout for the preview.
//
// IMPORTANT: this file ships to the browser. The layout here is a deliberately
// simplified, rounded approximation of our wagon base layout so the preview looks
// like a Bush Bound fit-out. It is NOT derived from our Fusion models and must never
// contain real CAD dimensions, panel geometry, joinery or cut lists.
//
// Pure functions with no DOM or three.js imports, so the same logic runs in the
// browser (live preview) and on the Worker (to rebuild the order server-side).

import {
  BASE_KIT,
  BASE_POWER,
  BUILD_LABELS,
  DEFAULT_ARCHES,
  DEFAULT_FEATURES,
  DEVICES,
  DIM_FIELDS,
  ELECTRICAL_PRICING,
  FEATURES,
  FINISH_LABELS,
  PRICING,
  QUESTIONS,
  getFridge,
  getVehicle,
  type DeviceId,
  type Dims,
  type FeatureId,
  type Fridge,
  type FridgeId,
  type Vehicle,
  type VehicleId,
} from '@/data/kit-builder';

export interface KitAnswers {
  vehicle?: VehicleId;
  dims?: Partial<Dims>;
  use?: 'weekender' | 'touring' | 'remote' | 'work';
  sleep?: 'no' | 'sometimes' | 'yes';
  sleepers?: 1 | 2;
  fridge?: FridgeId | 'none';
  /** Customer already owns the fridge, so leave it off the quote */
  ownFridge?: boolean;
  /** Free text when they picked "Something else" */
  vehicleName?: string;
  features?: FeatureId[];
  power?: DeviceId[];
  finish?: 'budget' | 'balanced' | 'premium';
  build?: 'diy' | 'assembled' | 'installed';
  electrical?: 'installed' | 'diy' | 'none';
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Drop anything that isn't a valid option. Used on the server before trusting client input. */
export function sanitiseAnswers(input: unknown): KitAnswers {
  const out: Record<string, unknown> = {};
  if (!input || typeof input !== 'object') return out;
  const raw = input as Record<string, unknown>;
  for (const q of QUESTIONS) {
    if (q.form) continue;
    const allowed = new Set(q.options.map((o) => o.value));
    const value = raw[q.id];
    if (q.multi) {
      if (Array.isArray(value)) out[q.id] = [...new Set(value.filter((v): v is string => typeof v === 'string' && allowed.has(v)))];
    } else if (typeof value === 'string' && allowed.has(value)) {
      out[q.id] = value;
    }
  }
  if (raw.sleepers === 1 || raw.sleepers === 2) out.sleepers = raw.sleepers;
  if (raw.ownFridge === true) out.ownFridge = true;
  if (typeof raw.vehicleName === 'string' && raw.vehicleName.trim()) out.vehicleName = raw.vehicleName.trim().slice(0, 80);
  if (raw.dims && typeof raw.dims === 'object') {
    const dims: Partial<Dims> = {};
    for (const f of DIM_FIELDS) {
      const n = Number((raw.dims as Record<string, unknown>)[f.key]);
      if (Number.isFinite(n) && n > 0) dims[f.key] = Math.round(clamp(n, f.min, f.max));
    }
    out.dims = dims;
  }
  return out as KitAnswers;
}

/** The customer's measurements, falling back to typical numbers for their vehicle. */
export function resolveDims(answers: KitAnswers): Dims {
  const v = getVehicle(answers.vehicle);
  const field = (k: keyof Dims) => DIM_FIELDS.find((f) => f.key === k)!;
  const pick = (k: keyof Dims, fallback: number) => {
    const n = answers.dims?.[k];
    return typeof n === 'number' && Number.isFinite(n) ? clamp(Math.round(n), field(k).min, field(k).max) : fallback;
  };
  const width = pick('width', v.floorWidth);
  const arches = Math.min(pick('arches', DEFAULT_ARCHES), width - 40);
  return { width, arches, depth: pick('depth', v.cargoLength), height: pick('height', v.roofHeight) };
}

export const features = (a: KitAnswers) => new Set<FeatureId>(a.features ?? DEFAULT_FEATURES);
const hasPower = (a: KitAnswers) => a.electrical !== 'none';

// ---------------------------------------------------------------------------
// Layout (stylised)
// ---------------------------------------------------------------------------

export type ModuleKind =
  | 'carcass'
  | 'drawer'
  | 'kitchen'
  | 'table'
  | 'hatch'
  | 'drawer-fridge'
  | 'end-panel'
  | 'deck'
  | 'fridge-cabinet'
  | 'fridge-upright'
  | 'fridge-chest'
  | 'slats'
  | 'platform'
  | 'mattress'
  | 'tank'
  | 'solar';

export type Fixture = 'sockets' | 'gpo' | 'monitor' | 'switch' | 'air';

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
  /** How far it slides out the back when "open" is toggled, mm */
  slide?: number;
  /** Door swings open when "open" is toggled */
  swing?: boolean;
  fixtures?: Fixture[];
  badge?: boolean;
}

export interface Layout {
  vehicle: Vehicle;
  dims: Dims;
  modules: ModuleSpec[];
  columns: number;
  fridge: Fridge | null;
  sleeping: boolean;
  seatsFolded: boolean;
  bedIsSingle: boolean;
  headroom: number | null;
  tankLitres: number;
  fridgeTooWide: boolean;
  fridgeTooTall: boolean;
}

const T = 18; // panel thickness used for the look of the preview
const GAP = 20; // inset from the tailgate
const round = (n: number, step = 10) => Math.round(n / step) * step;

export function buildLayout(answers: KitAnswers): Layout {
  // Roof solar is recommended in the summary but not drawn: it lives on the roof, not in the fit-out.
  const preset = getVehicle(answers.vehicle);
  const dims = resolveDims(answers);
  // The preview works off the customer's own measurements.
  const v: Vehicle = {
    ...preset,
    floorWidth: dims.width,
    archWidth: dims.arches,
    cargoLength: dims.depth,
    roofHeight: dims.height,
    windowHeight: round(dims.height * 0.46),
    sleepLength: dims.depth + (preset.sleepLength - preset.cargoLength),
  };
  const modules: ModuleSpec[] = [];
  const feats = features(answers);
  const fridge = getFridge(answers.fridge);
  const upright = fridge?.type === 'upright';
  const chest = fridge?.type === 'chest';
  const drawerFridge = fridge?.type === 'drawer';
  const sleeping = answers.sleep === 'yes' || answers.sleep === 'sometimes';
  const powered = hasPower(answers);

  const W = v.floorWidth;
  const A = v.archWidth;
  const endW = (W - A) / 2;
  const left = -A / 2;
  const depth = round(clamp(v.cargoLength - 60, 400, 1150));
  const zMid = -(GAP + depth / 2);
  const zFront = -(GAP + depth);

  // Optional slimline tank under everything lifts the whole system.
  let tankLitres = 0;
  const base = feats.has('tank') ? 110 : 0;
  if (base) {
    const target = answers.use === 'remote' ? 70 : 45;
    const tw = A - 40;
    const tl = Math.min(depth - 40, (target * 1e6) / (tw * base));
    tankLitres = round((tw * base * tl) / 1e6, 5);
    modules.push({ id: 'tank', kind: 'tank', x: 0, y: 0, z: -(GAP + tl / 2), w: tw, h: base, d: tl });
  }

  let H = answers.use === 'work' ? 300 : 280;
  if (drawerFridge && fridge) H = Math.max(H, fridge.h + 40);
  const lowH = 220; // cabinet under the upright fridge
  const columns = A >= 1500 || (answers.use === 'work' && A >= 1200) ? 3 : 2;
  const colW = A / columns;
  const colX = (i: number) => left + colW * (i + 0.5);
  const R = columns - 1;
  const fz = zMid + 15; // drawer centre so the front sits proud of the carcass
  let fridgeTooWide = false;
  let fridgeTooTall = false;

  const drawerSpec = (id: string, x: number, y: number, w: number, h: number, extra: Partial<ModuleSpec> = {}): ModuleSpec => ({
    id, kind: 'drawer', x, y, z: fz, w, h, d: depth - 30, slide: depth * 0.6, ...extra,
  });

  for (let i = 0; i < columns; i++) {
    const x = colX(i);
    const inner = colW - 2 * T;

    if (i === R && upright && fridge) {
      // Upright fridge cabinet over the pull-out table (our base wagon build).
      modules.push({ id: `carcass-${i}`, kind: 'carcass', x, y: base, z: zMid, w: colW, h: lowH, d: depth });
      const hatch = feats.has('compressor');
      const mainW = hatch ? inner * 0.68 : inner;
      const mainX = left + colW * i + T + mainW / 2;
      const kind = feats.has('table') ? 'table' : 'drawer';
      modules.push(drawerSpec(kind === 'table' ? 'table' : `drawer-${i}`, mainX, base + T, mainW - 4, lowH - 2 * T, { kind, slide: depth * (kind === 'table' ? 0.8 : 0.55) }));
      if (hatch) {
        const hw = inner - mainW;
        modules.push({ id: 'hatch', kind: 'hatch', x: left + colW * (i + 1) - T - hw / 2, y: base + T, z: -(GAP - 8), w: hw - 4, h: lowH - 2 * T, d: T });
      }
      modules.push({ id: `deck-${i}`, kind: 'deck', x, y: base + lowH, z: zMid, w: colW, h: 12, d: depth });
      const fw = Math.min(fridge.w, colW - 40);
      fridgeTooWide = fridge.w > colW - 40;
      const cabH = fridge.h + 50;
      const cabY = base + lowH + 12;
      fridgeTooTall = cabY + cabH > v.roofHeight - 20;
      const cabD = Math.min(fridge.d + 60, depth);
      const cabZ = -(GAP + cabD / 2);
      modules.push({ id: 'fridge-cabinet', kind: 'fridge-cabinet', x, y: cabY, z: cabZ, w: colW, h: cabH, d: cabD });
      modules.push({ id: 'fridge', kind: 'fridge-upright', x, y: cabY + 10, z: cabZ + 5, w: fw, h: fridge.h, d: Math.min(fridge.d, cabD - 20), swing: true });
      continue;
    }

    if (i === R && chest && fridge) {
      // Chest fridge on a drop slide at floor level, no cabinet over it.
      const fw = Math.min(fridge.w, colW - 30);
      fridgeTooWide = fridge.w > colW - 30;
      const fd = Math.min(fridge.d, depth - 20);
      const slide = fd * 0.85;
      modules.push({ id: 'fridge', kind: 'fridge-chest', x, y: base, z: -(GAP + fd / 2), w: fw, h: fridge.h, d: fd, slide });
      continue;
    }

    modules.push({ id: `carcass-${i}`, kind: 'carcass', x, y: base, z: zMid, w: colW, h: H, d: depth });
    modules.push({ id: `deck-${i}`, kind: 'deck', x, y: base + H, z: zMid, w: colW, h: 12, d: depth });

    if (i === R && drawerFridge && fridge) {
      fridgeTooWide = fridge.w > colW - 30;
      modules.push({ ...drawerSpec('fridge', x, base + T, inner - 4, H - 2 * T), kind: 'drawer-fridge', slide: depth * 0.55 });
      continue;
    }

    // Plain columns. A thin pull-out table rides under the deck of the first column
    // when it isn't living under an upright fridge.
    let top = base + H - T;
    if (i === 0 && feats.has('table') && !upright) {
      modules.push({ ...drawerSpec('table', x, top - 80, inner - 4, 76), kind: 'table', slide: depth * 0.8 });
      top -= 86;
    }
    const kitchen = i === 0 && feats.has('kitchen');
    modules.push(drawerSpec(kitchen ? 'kitchen' : `drawer-${i}`, x, base + T, inner - 4, top - (base + T), { kind: kitchen ? 'kitchen' : 'drawer', slide: depth * (kitchen ? 0.75 : 0.6), badge: i === 0 }));
  }

  // End panels over the wheel arches: power sockets on the left, monitor/switch/air on the right.
  if (endW >= 40) {
    const roomy = endW >= 70;
    const leftFx: Fixture[] = roomy && powered ? ['sockets', 'gpo'] : [];
    const rightFx: Fixture[] = roomy ? [...(powered ? (['monitor', 'switch'] as Fixture[]) : []), ...(feats.has('compressor') ? (['air'] as Fixture[]) : [])] : [];
    modules.push({ id: 'end-left', kind: 'end-panel', x: -W / 2 + endW / 2 + 3, y: 0, z: zMid, w: endW - 6, h: base + H, d: depth, fixtures: leftFx });
    const rightH = upright ? lowH : H;
    modules.push({ id: 'end-right', kind: 'end-panel', x: W / 2 - endW / 2 - 3, y: 0, z: zMid, w: endW - 6, h: base + rightH, d: depth, fixtures: rightFx });
  }

  // Bed over the folded 2nd row. With a tall fridge in the right-hand column it's a single beside it.
  let headroom: number | null = null;
  const deckTop = base + H + 12;
  const tallFridge = upright || chest;
  const bedLeft = -W / 2 + 20;
  const bedRight = tallFridge ? left + colW * R : W / 2 - 20;
  const bedW = bedRight - bedLeft;
  const bedX = (bedLeft + bedRight) / 2;
  if (sleeping) {
    const extLength = v.sleepLength - GAP - depth;
    const extZ = zFront - extLength / 2;
    if (answers.sleep === 'sometimes') {
      modules.push({ id: 'slats', kind: 'slats', x: bedX, y: deckTop - 30, z: extZ, w: bedW, h: 30, d: extLength });
      headroom = v.roofHeight - deckTop;
    } else {
      modules.push({ id: 'platform', kind: 'platform', x: bedX, y: deckTop - T, z: extZ, w: bedW, h: T, d: extLength });
      const mLength = v.sleepLength - GAP - 40;
      modules.push({ id: 'mattress', kind: 'mattress', x: bedX, y: deckTop, z: -(GAP + 20 + mLength / 2), w: bedW - 40, h: 80, d: mLength });
      headroom = v.roofHeight - deckTop - 80;
    }
  }


  return {
    vehicle: v,
    dims,
    modules,
    columns,
    fridge,
    sleeping,
    seatsFolded: sleeping,
    bedIsSingle: sleeping && tallFridge,
    headroom,
    tankLitres,
    fridgeTooWide,
    fridgeTooTall,
  };
}

// ---------------------------------------------------------------------------
// Power
// ---------------------------------------------------------------------------

export interface PowerPlan {
  dailyWh: number;
  batteryAh: number;
  solarW: number;
  inverterW: number;
  /** Anything beyond what the base kit covers */
  upgrades: { battery: number; solar: number; inverter: number };
  needsUpgrade: boolean;
  tierName: string;
  baseItems: string[];
  upgradeItems: string[];
}

const AUTONOMY = { weekender: 1.5, touring: 2, remote: 3, work: 1 };

export function planPower(answers: KitAnswers): PowerPlan {
  const devices = DEVICES.filter((d) => answers.power?.includes(d.id));
  const fridge = getFridge(answers.fridge);
  const dailyWh = (fridge?.whPerDay ?? 0) + devices.reduce((sum, d) => sum + d.whPerDay, 0);

  const baseItems = [
    '12V and USB charging sockets',
    '240V outlet for chargers and small appliances',
    'Battery monitor and switch panel',
    'House battery with DC-DC charging from the car',
  ];
  if (fridge) baseItems.push('Dedicated fridge circuit');
  if (features(answers).has('compressor')) baseItems.push('Wiring for the built-in air compressor');

  if (!hasPower(answers)) {
    return { dailyWh, batteryAh: 0, solarW: 0, inverterW: 0, upgrades: { battery: 0, solar: 0, inverter: 0 }, needsUpgrade: false, tierName: 'Cabinets only', baseItems: [], upgradeItems: [] };
  }

  const acPeak = Math.max(0, ...devices.filter((d) => d.ac).map((d) => d.watts));
  const inverterNeeded = acPeak * 1.25 <= BASE_POWER.inverterW ? BASE_POWER.inverterW : acPeak * 1.25 <= 2000 ? 2000 : 3000;

  const autonomy = AUTONOMY[answers.use ?? 'touring'];
  let batteryAh = Math.ceil((dailyWh * autonomy) / (12.8 * 0.9) / 100) * 100;
  if (inverterNeeded >= 2000) batteryAh = Math.max(batteryAh, 200);
  if (inverterNeeded >= 3000) batteryAh = Math.max(batteryAh, 300);
  batteryAh = Math.min(Math.max(batteryAh, BASE_POWER.batteryAh), 400);

  const needsSolar = answers.use === 'remote' || (answers.use === 'touring' && dailyWh > 400) || dailyWh > 700;
  const solarW = needsSolar ? Math.min(Math.ceil(dailyWh / (4.5 * 0.7) / 100) * 100, 600) : 0;

  const upgrades = {
    battery: batteryAh - BASE_POWER.batteryAh,
    solar: solarW,
    inverter: inverterNeeded > BASE_POWER.inverterW ? inverterNeeded : 0,
  };
  const upgradeItems: string[] = [];
  if (upgrades.battery > 0) upgradeItems.push(`Bigger house battery (${batteryAh}Ah lithium) for ${answers.use === 'remote' ? 'days off-grid' : 'your extra loads'}`);
  if (upgrades.solar > 0) upgradeItems.push(`${solarW}W roof solar with MPPT charge controller`);
  if (upgrades.inverter > 0) upgradeItems.push(`Larger ${upgrades.inverter}W inverter for high-draw 240V gear`);
  const needsUpgrade = upgradeItems.length > 0;

  return {
    dailyWh,
    batteryAh,
    solarW,
    inverterW: Math.max(inverterNeeded, BASE_POWER.inverterW),
    upgrades,
    needsUpgrade,
    tierName: needsUpgrade ? 'Base power + upgrades' : 'Base power has you covered',
    baseItems,
    upgradeItems,
  };
}

// ---------------------------------------------------------------------------
// Recommendation
// ---------------------------------------------------------------------------

export interface PriceLine {
  label: string;
  amount: number;
}

export interface Recommendation {
  kitName: string;
  tagline: string;
  addOns: string[];
  vehicle: Vehicle;
  layout: Layout;
  power: PowerPlan;
  why: string[];
  tips: { text: string; link?: { label: string; href: string } }[];
  includes: string[];
  kitLines: PriceLine[];
  fridgeLines: PriceLine[];
  electricalLines: PriceLine[];
  kitTotal: number;
  fridgeTotal: number;
  electricalTotal: number;
  total: number;
  /** Fridges that suit this customer best, for a "best fit" badge */
  bestFridges: FridgeId[];
}

const featureLabel = (id: FeatureId) => FEATURES.find((f) => f.id === id)!.label;

export function recommend(answers: KitAnswers): Recommendation {
  const power = planPower(answers);
  const layout = buildLayout(answers);
  const v = layout.vehicle;
  const fridge = layout.fridge;
  const feats = features(answers);
  const powered = hasPower(answers);

  // Changes from the Wagon Base Kit, for the chips in the viewer and summary.
  const addOns: string[] = FEATURES.filter((f) => !f.inBase && feats.has(f.id)).map((f) => f.label);
  for (const f of FEATURES) if (f.inBase && !feats.has(f.id)) addOns.push(`No ${f.label.toLowerCase()}`);
  if (fridge?.type === 'drawer') addOns.push('Drawer fridge');
  if (fridge?.type === 'chest') addOns.push('Chest fridge slide');
  if (!fridge) addOns.push('No fridge');
  if (answers.sleep === 'sometimes') addOns.push('Bed slats');
  if (answers.sleep === 'yes') addOns.push('Fixed bed');
  if (powered) addOns.push(power.needsUpgrade ? 'Power pack+' : 'Power pack');
  const couple = layout.sleeping && answers.sleepers === 2;

  // Why this layout, in plain English. Only the customer's own measurements are quoted,
  // never our cabinet dimensions.
  const n = layout.columns;
  const why: string[] = [
    `Drawers split evenly into ${n === 2 ? 'two' : 'three'} equal columns across the ${answers.dims?.arches ? `${layout.dims.arches.toLocaleString('en-AU')}mm between your wheel arches` : 'space between the wheel arches'}, so nothing's wasted.`,
  ];
  if (fridge?.type === 'upright') why.push(`${fridge.label} in its own cabinet at waist height on the right. The door opens straight towards you, like the one at home.${feats.has('table') ? ' Pull-out table tucked in underneath.' : ''}`);
  if (fridge?.type === 'drawer') why.push(`${fridge.label} built flush into the right-hand column. Slides out like any other drawer.`);
  if (fridge?.type === 'chest') why.push(`${fridge.label} on a drop slide in the right-hand column. Pull it out and the lid opens clear of the tailgate.`);
  if (!fridge) why.push('No fridge, so it\'s drawers right across with a flat carpeted top.');
  if (feats.has('table') && fridge?.type !== 'upright') why.push('Pull-out table slides out from under the deck top. Instant bench for lunch on the side of the track.');
  if (feats.has('kitchen')) why.push('The left-hand drawer becomes a kitchen drawer: stove and prep bench slide out at standing height, sheltered by the tailgate.');
  if (feats.has('compressor')) why.push('Built-in air compressor with the air outlet on the right-hand side panel.');
  if (powered) why.push('12V and USB sockets plus a 240V outlet on the left panel, battery monitor and switches on the right.');
  if (answers.sleep === 'sometimes') why.push(`Slatted bed extension over the folded 2nd row${layout.bedIsSingle ? ', a single beside the fridge' : ', full width'}. Pulls out when you need it.`);
  if (answers.sleep === 'yes') why.push(`Fixed carpeted bed over the folded 2nd row, flush with the drawer top${layout.bedIsSingle ? ', running beside the fridge' : ''}.`);
  if (feats.has('tank')) why.push(`About ${layout.tankLitres}L slimline tank under the drawers. Lowest, most central spot for the weight.`);
  if (answers.use === 'work') why.push('Heavy-duty locking slides rated for a full load of tools on rough site tracks.');

  // Expert tips.
  const tips: Recommendation['tips'] = [];
  if (layout.fridgeTooWide && fridge) tips.push({ text: `The ${fridge.label} is wider than an even split allows in your boot. We'd widen the fridge column a touch in your design, or a smaller fridge keeps everything even.` });
  if (layout.fridgeTooTall && fridge) tips.push({ text: `The ${fridge.label} cabinet is tight for your boot height${feats.has('tank') ? ' with the under-drawer tank lifting everything' : ''}. The 50L upright, a drawer fridge or a chest fridge would sit lower.` });
  for (const d of DEVICES) {
    if (answers.power?.includes(d.id) && d.tip) tips.push({ text: d.tip, link: d.link });
  }
  if (powered && !power.needsUpgrade && (answers.power?.length ?? 0) > 0) {
    tips.push({ text: 'Good news: everything you picked runs fine on the base power setup. No need to spend more on electrics.' });
  }
  if (couple && layout.bedIsSingle) {
    tips.push({ text: `Two of you sleeping: with ${fridge?.type === 'chest' ? 'a chest fridge' : 'an upright fridge'} in the right-hand column the bed is a single beside it. For a full-width bed, go a drawer fridge (50L is the biggest that keeps the top flat), or keep this fridge and put one person in a swag or rooftop tent.` });
  } else if (layout.bedIsSingle) {
    tips.push({ text: 'Sleeping solo, so a single bed beside the fridge works a treat and you keep the big fridge.' });
  }
  if (fridge?.type === 'drawer' && (answers.use === 'remote' || answers.use === 'touring')) {
    tips.push({
      text: couple
        ? 'A drawer fridge is the right call for two sleeping inside. For trips over a week, top it up with a soft cooler bag for the extra cold stuff.'
        : 'Drawer fridges are brilliant for drinks and lunch, but for a week or more away most people want 60L+. An upright 65L is our go-to for touring.',
    });
  }
  if (powered && answers.electrical === 'installed' && answers.build !== 'installed') {
    tips.push({ text: 'Our electrician fits the power pack at our Gold Coast workshop, so you\'ll need to bring the car in for that part. Interstate? Pick "send me the parts" and any auto electrician can fit it.' });
  }
  if (answers.ownFridge && fridge) {
    tips.push({ text: `Bringing your own fridge: we'll size the ${fridge.type === 'upright' ? 'cabinet' : fridge.type === 'chest' ? 'slide' : 'drawer'} to suit. Pop the make and model in the notes when you lock in your kit.` });
  }
  if (layout.headroom !== null && layout.headroom < 600) {
    tips.push({ text: `Heads up: headroom over the bed is tight in your boot${feats.has('tank') ? ', and the under-drawer tank lifts it a bit more' : ''}. Fine for sleeping, a squeeze for sitting up.` });
  }
  if (feats.has('tank') && layout.tankLitres < 40) {
    tips.push({ text: 'Your boot only fits a modest tank under the drawers. Pair it with a 20L jerry for longer trips.' });
  }
  if (answers.use === 'remote' && !fridge) tips.push({ text: 'Going remote without a fridge is hard work. Even a 40L makes a massive difference to what you can eat out there.' });
  if (answers.use === 'remote' && !feats.has('tank')) tips.push({ text: 'For remote trips, plan on 7L per person per day. A built-in tank plus jerries is the safest bet.' });
  if (answers.finish === 'budget') tips.push({ text: 'Where to spend if money is tight: slides, ply and the floor mount. Never skimp on those. Finishes can always be upgraded later.' });
  if (answers.build === 'diy') tips.push({ text: 'Most people build our kits in a weekend with a drill, a few clamps and a mate. Every panel is numbered and the floor template marks exactly where to drill, clear of fuel tanks and wiring.' });

  // Pricing (placeholders, see src/data/kit-builder.ts).
  // The Wagon Base Kit price includes the upright fridge cabinet, pull-out table and compressor.
  const kitLines: PriceLine[] = [{ label: `${BASE_KIT.name} for ${v.short}`, amount: BASE_KIT.base }];
  if (fridge?.type === 'chest') kitLines.push({ label: 'Chest fridge drop slide instead of cabinet', amount: PRICING.chestSlide - PRICING.fridgeCabinet });
  if (fridge?.type === 'drawer') kitLines.push({ label: 'Drawer fridge column instead of cabinet', amount: -PRICING.fridgeCabinet });
  if (!fridge) kitLines.push({ label: 'No fridge cabinet', amount: -PRICING.fridgeCabinet });
  for (const f of FEATURES) {
    if (f.inBase && !feats.has(f.id)) kitLines.push({ label: `No ${f.label.toLowerCase()}`, amount: -f.price });
    if (!f.inBase && feats.has(f.id)) kitLines.push({ label: f.id === 'tank' ? `${layout.tankLitres}L under-drawer water tank` : f.label, amount: f.price });
  }
  if (answers.sleep === 'sometimes') kitLines.push({ label: 'Slatted bed extension', amount: PRICING.sleepSlats });
  if (answers.sleep === 'yes') kitLines.push({ label: 'Fixed bed platform', amount: PRICING.sleepFixed });
  const finishMult = PRICING.finishMultiplier[answers.finish ?? 'balanced'];
  if (finishMult !== 1) {
    const subtotal = kitLines.reduce((s, l) => s + l.amount, 0);
    kitLines.push({ label: finishMult < 1 ? `${FINISH_LABELS[answers.finish ?? 'balanced']} (saving)` : FINISH_LABELS[answers.finish ?? 'balanced'], amount: Math.round((subtotal * (finishMult - 1)) / 10) * 10 });
  }
  const build = answers.build ?? 'diy';
  if (PRICING.build[build] > 0) kitLines.push({ label: BUILD_LABELS[build], amount: PRICING.build[build] });
  const kitTotal = kitLines.reduce((s, l) => s + l.amount, 0);

  const fridgeLines: PriceLine[] = fridge && !answers.ownFridge ? [{ label: `${fridge.label} (we can supply)`, amount: fridge.price }] : [];
  const fridgeTotal = fridgeLines.reduce((s, l) => s + l.amount, 0);

  const electricalLines: PriceLine[] = [];
  if (powered) {
    electricalLines.push({ label: 'Power pack: 12V, USB, 240V, monitor', amount: ELECTRICAL_PRICING.basePower });
    if (power.upgrades.battery > 0) electricalLines.push({ label: `Battery upgrade to ${power.batteryAh}Ah`, amount: (power.upgrades.battery / 100) * ELECTRICAL_PRICING.batteryPer100Ah });
    if (power.upgrades.solar > 0) electricalLines.push({ label: `${power.solarW}W roof solar`, amount: (power.solarW / 100) * ELECTRICAL_PRICING.solarPer100W });
    if (power.upgrades.inverter > 0) electricalLines.push({ label: `${power.upgrades.inverter}W inverter upgrade`, amount: ELECTRICAL_PRICING.inverterUpgrade[power.upgrades.inverter] ?? 0 });
    if (answers.electrical === 'installed') electricalLines.push({ label: 'Install + electrician sign-off', amount: ELECTRICAL_PRICING.install });
  }
  const electricalTotal = electricalLines.reduce((s, l) => s + l.amount, 0);

  const bestFridges: FridgeId[] = couple
    ? ['drawer-50', 'drawer-30']
    : answers.use === 'weekender'
      ? ['upright-50', 'drawer-50']
      : answers.use === 'work'
        ? ['drawer-30', 'upright-50']
        : ['upright-65', 'chest-60'];

  const includes = [
    'Your layout drawn up by our team to your measurements, approved by you before we cut',
    'CNC-cut premium birch ply, every panel numbered',
    'Pre-drilled joins and all hardware',
    'Floor install template, clear of fuel tanks, lines and wiring',
    'Heavy-duty ball-bearing slides and flush paddle latches',
    build === 'installed' ? 'Workshop install on the Gold Coast' : build === 'assembled' ? 'Assembled and checked before it ships' : 'Flat packed and shipped Australia-wide',
  ];

  return {
    kitName: BASE_KIT.name,
    tagline: BASE_KIT.tagline,
    addOns,
    vehicle: v,
    layout,
    power,
    why,
    tips,
    includes,
    kitLines,
    fridgeLines,
    electricalLines,
    kitTotal,
    fridgeTotal,
    electricalTotal,
    total: kitTotal + fridgeTotal + electricalTotal,
    bestFridges,
  };
}

/** Plain-text summary for the CRM and staff email. */
export function summaryText(answers: KitAnswers, rec: Recommendation): string {
  const q = (id: string) => {
    const question = QUESTIONS.find((x) => x.id === id);
    const value = (answers as Record<string, unknown>)[id];
    if (!question || value === undefined) return '-';
    if (Array.isArray(value)) return value.map((v) => question.options.find((o) => o.value === v)?.label ?? v).join(', ') || 'Nothing';
    return question.options.find((o) => o.value === value)?.label ?? String(value);
  };
  const d = rec.layout.dims;
  const mm = (n: number) => `${n.toLocaleString('en-AU')}mm`;
  return [
    `${rec.kitName} for ${answers.vehicle === 'other' && answers.vehicleName ? answers.vehicleName : getVehicle(answers.vehicle).label}${rec.addOns.length ? ` (${rec.addOns.join(', ')})` : ''}`,
    `Measurements${answers.dims && Object.keys(answers.dims).length ? '' : ' (typical, not measured)'}: boot width ${mm(d.width)}, between arches ${mm(d.arches)}, depth ${mm(d.depth)}, height ${mm(d.height)}`,
    `Trip: ${q('use')} | Sleeping: ${q('sleep')}${rec.layout.sleeping ? ` (${answers.sleepers === 2 ? 'two' : 'one'})` : ''} | Fridge: ${rec.layout.fridge?.label ?? 'None'}${answers.ownFridge ? ' (customer has their own)' : ''}`,
    `Features: ${[...features(answers)].map(featureLabel).join(', ') || 'None'}`,
    `Power: ${q('power')}`,
    `Electrical: ${q('electrical')} | ${rec.power.tierName}${rec.power.upgradeItems.length ? ` (${rec.power.upgradeItems.join('; ')})` : ''}`,
    `Finish: ${q('finish')} | Build: ${q('build')}`,
    `Indicative: kit $${rec.kitTotal.toLocaleString('en-AU')} + fridge $${rec.fridgeTotal.toLocaleString('en-AU')} + electrical $${rec.electricalTotal.toLocaleString('en-AU')} = $${rec.total.toLocaleString('en-AU')}`,
  ].join('\n');
}
