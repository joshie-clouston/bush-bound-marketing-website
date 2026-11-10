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
  DEVICES,
  ELECTRICAL_PRICING,
  FINISH_LABELS,
  PRICING,
  QUESTIONS,
  getVehicle,
  type DeviceId,
  type Vehicle,
  type VehicleId,
} from '@/data/kit-builder';

export interface KitAnswers {
  vehicle?: VehicleId;
  use?: 'weekender' | 'touring' | 'remote' | 'work';
  sleep?: 'no' | 'sometimes' | 'yes';
  fridge?: 'none' | 'small' | 'large';
  kitchen?: 'yes' | 'no';
  water?: 'none' | 'jerry' | 'tank';
  power?: DeviceId[];
  finish?: 'budget' | 'balanced' | 'premium';
  build?: 'diy' | 'assembled' | 'installed';
  electrical?: 'installed' | 'diy' | 'none';
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
  return out as KitAnswers;
}

const hasFridge = (a: KitAnswers) => a.fridge !== 'none';
const hasPower = (a: KitAnswers) => a.electrical !== 'none';

// ---------------------------------------------------------------------------
// Layout (stylised)
// ---------------------------------------------------------------------------

export type ModuleKind =
  | 'carcass'
  | 'drawer'
  | 'kitchen'
  | 'door'
  | 'end-panel'
  | 'deck'
  | 'fridge-tower'
  | 'fridge'
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
  fixtures?: Fixture[];
  badge?: boolean;
}

export interface Layout {
  vehicle: Vehicle;
  modules: ModuleSpec[];
  sleeping: boolean;
  seatsFolded: boolean;
  bedIsSingle: boolean;
  headroom: number | null;
  tankLitres: number;
}

const T = 18; // panel thickness used for the look of the preview
const GAP = 20; // inset from the tailgate
const FRIDGE = {
  small: { w: 400, d: 560, h: 470 },
  large: { w: 460, d: 640, h: 530 },
};
const round = (n: number, step = 10) => Math.round(n / step) * step;

export function buildLayout(answers: KitAnswers, power?: PowerPlan): Layout {
  const v = getVehicle(answers.vehicle);
  const modules: ModuleSpec[] = [];
  const sleeping = answers.sleep === 'yes' || answers.sleep === 'sometimes';
  const fridge = answers.fridge === 'large' ? FRIDGE.large : answers.fridge === 'none' ? null : FRIDGE.small;
  const powered = hasPower(answers);

  const W = v.floorWidth;
  const endW = round(Math.max((W - v.archWidth) / 2, 120));
  const left = -W / 2 + endW;
  const right = W / 2 - endW;
  const span = right - left;
  const depth = round(Math.min(v.cargoLength - 60, 1100), 50);
  const zMid = -(GAP + depth / 2);
  const zFront = -(GAP + depth);

  // Optional slimline tank under everything lifts the whole system.
  let tankLitres = 0;
  const base = answers.water === 'tank' ? 110 : 0;
  if (base) {
    const target = answers.use === 'remote' ? 70 : 45;
    const tw = span - 40;
    const tl = Math.min(depth - 40, (target * 1e6) / (tw * base));
    tankLitres = round((tw * base * tl) / 1e6, 5);
    modules.push({ id: 'tank', kind: 'tank', x: (left + right) / 2, y: 0, z: -(GAP + tl / 2), w: tw, h: base, d: tl });
  }

  const H = answers.use === 'work' ? 300 : 280; // main drawer module
  const lowH = 200; // module under the fridge tower
  const rightW = fridge ? fridge.w + 2 * T + 40 : round(Math.min(Math.max(span * 0.42, 380), 480));
  const bigW = span - rightW;
  const rightX = left + bigW + rightW / 2;
  const bigX = left + bigW / 2;
  const rightH = fridge ? lowH : H;

  // End panels over the wheel arches: power sockets on the left, monitor/switch/air on the right.
  modules.push({ id: 'end-left', kind: 'end-panel', x: -W / 2 + endW / 2 + 3, y: 0, z: zMid, w: endW - 6, h: base + H, d: depth, fixtures: powered ? ['sockets', 'gpo'] : [] });
  modules.push({ id: 'end-right', kind: 'end-panel', x: W / 2 - endW / 2 - 3, y: 0, z: zMid, w: endW - 6, h: base + rightH, d: depth, fixtures: powered ? ['monitor', 'switch', 'air'] : ['air'] });

  // Big drawer (or kitchen drawer) on the left.
  const kitchen = answers.kitchen === 'yes';
  modules.push({ id: 'carcass-big', kind: 'carcass', x: bigX, y: base, z: zMid, w: bigW, h: H, d: depth });
  modules.push({ id: kitchen ? 'kitchen' : 'drawer-big', kind: kitchen ? 'kitchen' : 'drawer', x: bigX, y: base + T, z: zMid + 15, w: bigW - 2 * T, h: H - 2 * T, d: depth - 30, slide: depth * (kitchen ? 0.75 : 0.6), badge: true });
  modules.push({ id: 'deck-big', kind: 'deck', x: bigX, y: base + H, z: zMid, w: bigW, h: 12, d: depth });

  // Right module: drawer + air compressor door, with the fridge tower on top.
  const doorW = round(rightW * 0.3);
  const drawerW = rightW - doorW;
  modules.push({ id: 'carcass-right', kind: 'carcass', x: rightX, y: base, z: zMid, w: rightW, h: rightH, d: depth });
  modules.push({ id: 'drawer-right', kind: 'drawer', x: left + bigW + drawerW / 2 + T / 2, y: base + T, z: zMid + 15, w: drawerW - 1.5 * T, h: rightH - 2 * T, d: depth - 30, slide: depth * 0.55 });
  modules.push({ id: 'door-air', kind: 'door', x: right - doorW / 2 - T / 2, y: base + T, z: -(GAP - 8), w: doorW - 1.5 * T, h: rightH - 2 * T, d: T });
  modules.push({ id: 'deck-right', kind: 'deck', x: rightX, y: base + rightH, z: zMid, w: rightW, h: 12, d: depth });

  if (fridge) {
    const towerD = fridge.d + 60;
    const towerZ = -(GAP + towerD / 2);
    modules.push({ id: 'fridge-tower', kind: 'fridge-tower', x: rightX, y: base + lowH + 12, z: towerZ, w: rightW, h: fridge.h + 50, d: towerD });
    modules.push({ id: 'fridge', kind: 'fridge', x: rightX, y: base + lowH + 12 + 8, z: towerZ + 10, w: fridge.w, h: fridge.h, d: fridge.d, slide: fridge.d * 0.85 });
  }

  // Bed: slatted extension (sometimes) or solid platform + mattress (most nights),
  // over the folded 2nd row. With the fridge tower in, it's a single beside it.
  let headroom: number | null = null;
  const deckTop = base + H + 12;
  const bedLeft = -W / 2 + 20;
  const bedRight = fridge ? left + bigW : W / 2 - 20;
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

  if (power && power.solarW > 0 && powered) {
    const panelLength = Math.min(1500, 600 + power.solarW * 2.2);
    modules.push({ id: 'solar', kind: 'solar', x: 0, y: v.roofHeight + 60, z: -(v.sleepLength / 2), w: Math.min(W - 100, 1100), h: 35, d: panelLength });
  }

  return { vehicle: v, modules, sleeping, seatsFolded: sleeping, bedIsSingle: sleeping && !!fridge, headroom, tankLitres };
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

const FRIDGE_WH = { none: 0, small: 300, large: 450 };
const AUTONOMY = { weekender: 1.5, touring: 2, remote: 3, work: 1 };

export function planPower(answers: KitAnswers): PowerPlan {
  const devices = DEVICES.filter((d) => answers.power?.includes(d.id));
  const fridgeWh = FRIDGE_WH[answers.fridge ?? 'small'];
  const dailyWh = fridgeWh + devices.reduce((sum, d) => sum + d.whPerDay, 0);

  const baseItems = [
    '12V and USB charging sockets',
    '240V outlet for laptops and small appliances',
    'Air compressor with side-panel air outlet',
    'Battery monitor and switch panel',
    'House battery with DC-DC charging from the car',
  ];
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
  electricalLines: PriceLine[];
  kitTotal: number;
  electricalTotal: number;
  total: number;
}

export function recommend(answers: KitAnswers): Recommendation {
  const power = planPower(answers);
  const layout = buildLayout(answers, power);
  const v = layout.vehicle;
  const fridge = hasFridge(answers);
  const kitchen = answers.kitchen === 'yes';
  const tank = answers.water === 'tank';
  const powered = hasPower(answers);

  const addOns: string[] = [];
  if (kitchen) addOns.push('Kitchen drawer');
  if (answers.sleep === 'sometimes') addOns.push('Bed slats');
  if (answers.sleep === 'yes') addOns.push('Fixed bed');
  if (tank) addOns.push('Water tank');
  if (power.needsUpgrade) addOns.push('Power upgrade');

  // Why this layout, in plain English (no dimensions: the design stays ours).
  const why: string[] = [
    `Our wagon base layout, cut for your ${v.short}: one big drawer on the left, ${fridge ? 'a fridge tower over a second drawer' : 'a second full-height drawer'} on the right. Same layout we build in the workshop.`,
  ];
  if (fridge) why.push('The fridge sits at waist height in its own ply tower on a drop slide. No bending into the boot, no lifting it out.');
  why.push('Air compressor lives behind its own door, with the air outlet right there on the side panel.');
  if (powered) why.push('12V and USB sockets plus a 240V outlet on the left panel, battery monitor and switches on the right. Charge phones, run a laptop, plug in small appliances.');
  if (kitchen) why.push('The big drawer becomes a kitchen drawer: stove and prep bench slide out the back at standing height, sheltered by the tailgate.');
  if (answers.sleep === 'sometimes') why.push(`Slatted bed extension over the folded 2nd row. ${layout.bedIsSingle ? 'A single beside the fridge tower.' : 'Full width.'} Pulls out when you need it.`);
  if (answers.sleep === 'yes') why.push(`Fixed carpeted bed platform over the folded 2nd row, flush with the drawer top${layout.bedIsSingle ? ', running beside the fridge tower' : ''}. No setup at night.`);
  if (tank) why.push(`About ${layout.tankLitres}L slimline tank under the drawers. Lowest, most central spot for the weight.`);
  if (!fridge) why.push('No fridge means no tower, so you get a flat carpeted top right across.');
  if (answers.use === 'work') why.push('Heavy-duty locking slides rated for a full load of tools on rough site tracks.');

  // Expert tips.
  const tips: Recommendation['tips'] = [];
  for (const d of DEVICES) {
    if (answers.power?.includes(d.id) && d.tip) tips.push({ text: d.tip, link: d.link });
  }
  if (powered && !power.needsUpgrade && (answers.power?.length ?? 0) > 0) {
    tips.push({ text: 'Good news: everything you picked runs fine on the base power setup. No need to spend more on electrics.' });
  }
  if (layout.bedIsSingle) {
    tips.push({ text: 'With the fridge tower in, the bed is a single beside it. Travelling as a couple? Plenty go without the tower and run a fridge in the back seat or the cab to get a full-width bed. We can talk it through.' });
  }
  if (layout.headroom !== null && layout.headroom < 600) {
    tips.push({ text: `Heads up: headroom over the bed is tight in a ${v.short}${tank ? ', and the under-drawer tank lifts it a bit more' : ''}. Fine for sleeping, a squeeze for sitting up.` });
  }
  if (tank && layout.tankLitres < 40) {
    tips.push({ text: `The ${v.short} only fits a modest tank under the drawers. Pair it with a 20L jerry for longer trips.` });
  }
  if (answers.use === 'remote' && !fridge) tips.push({ text: 'Going remote without a fridge is hard work. Even a 40L makes a massive difference to what you can eat out there.' });
  if (answers.use === 'remote' && !tank) tips.push({ text: 'For remote trips, plan on 7L per person per day. A built-in tank plus jerries is the safest bet.' });
  if (answers.finish === 'budget') tips.push({ text: 'Where to spend if money is tight: slides, ply and the floor mount. Never skimp on those. Finishes can always be upgraded later.' });
  if (answers.build === 'diy') tips.push({ text: 'Most people build our kits in a weekend with a drill, a few clamps and a mate. Every panel is numbered and the floor template marks exactly where to drill, clear of fuel tanks and wiring.' });

  // Pricing (placeholders, see src/data/kit-builder.ts).
  const kitLines: PriceLine[] = [{ label: `${BASE_KIT.name} for ${v.short}`, amount: BASE_KIT.base }];
  if (kitchen) kitLines.push({ label: 'Kitchen drawer upgrade', amount: PRICING.kitchen });
  if (answers.sleep === 'sometimes') kitLines.push({ label: 'Slatted bed extension', amount: PRICING.sleepSlats });
  if (answers.sleep === 'yes') kitLines.push({ label: 'Fixed bed platform', amount: PRICING.sleepFixed });
  if (tank) kitLines.push({ label: `${layout.tankLitres}L under-drawer water tank`, amount: PRICING.waterTank });
  const finishMult = PRICING.finishMultiplier[answers.finish ?? 'balanced'];
  if (finishMult !== 1) {
    const subtotal = kitLines.reduce((s, l) => s + l.amount, 0);
    kitLines.push({ label: FINISH_LABELS[answers.finish ?? 'balanced'], amount: Math.round((subtotal * (finishMult - 1)) / 10) * 10 });
  }
  const build = answers.build ?? 'diy';
  if (PRICING.build[build] > 0) kitLines.push({ label: BUILD_LABELS[build], amount: PRICING.build[build] });
  const kitTotal = kitLines.reduce((s, l) => s + l.amount, 0);

  const electricalLines: PriceLine[] = [];
  if (powered) {
    electricalLines.push({ label: 'Base power: 12V, USB, 240V, compressor', amount: ELECTRICAL_PRICING.basePower });
    if (power.upgrades.battery > 0) electricalLines.push({ label: `Battery upgrade to ${power.batteryAh}Ah`, amount: (power.upgrades.battery / 100) * ELECTRICAL_PRICING.batteryPer100Ah });
    if (power.upgrades.solar > 0) electricalLines.push({ label: `${power.solarW}W roof solar`, amount: (power.solarW / 100) * ELECTRICAL_PRICING.solarPer100W });
    if (power.upgrades.inverter > 0) electricalLines.push({ label: `${power.upgrades.inverter}W inverter upgrade`, amount: ELECTRICAL_PRICING.inverterUpgrade[power.upgrades.inverter] ?? 0 });
    if (answers.electrical === 'installed') electricalLines.push({ label: 'Install + electrician sign-off', amount: ELECTRICAL_PRICING.install });
  }
  const electricalTotal = electricalLines.reduce((s, l) => s + l.amount, 0);

  const includes = [
    'Your layout drawn up by our team and approved by you before we cut',
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
    electricalLines,
    kitTotal,
    electricalTotal,
    total: kitTotal + electricalTotal,
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
  return [
    `${rec.kitName} for ${rec.vehicle.label}${rec.addOns.length ? ` + ${rec.addOns.join(', ')}` : ''}`,
    `Trip: ${q('use')} | Sleeping: ${q('sleep')} | Fridge: ${q('fridge')} | Kitchen: ${q('kitchen')} | Water: ${q('water')}`,
    `Power: ${q('power')}`,
    `Electrical: ${q('electrical')} | ${rec.power.tierName}${rec.power.upgradeItems.length ? ` (${rec.power.upgradeItems.join('; ')})` : ''}`,
    `Finish: ${q('finish')} | Build: ${q('build')}`,
    `Indicative: kit $${rec.kitTotal.toLocaleString('en-AU')} + electrical $${rec.electricalTotal.toLocaleString('en-AU')} = $${rec.total.toLocaleString('en-AU')}`,
  ].join('\n');
}
