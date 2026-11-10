// Kit builder engine: turns questionnaire answers into a recommendation,
// a 3D layout (module boxes in mm) and Fusion 360 starter parameters.
//
// Pure functions with no DOM or three.js imports, so the same logic runs in the
// browser (live preview) and on the Worker (to rebuild the order server-side).

import {
  DEVICES,
  ELECTRICAL_PRICING,
  FINISH_LABELS,
  BUILD_LABELS,
  KITS,
  PRICING,
  QUESTIONS,
  getVehicle,
  type DeviceId,
  type KitTier,
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

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export type ModuleKind =
  | 'carcass'
  | 'drawer'
  | 'kitchen'
  | 'fridge-slide'
  | 'fridge'
  | 'deck'
  | 'platform'
  | 'infill'
  | 'mattress'
  | 'wing'
  | 'battery'
  | 'tank'
  | 'solar';

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
}

export interface Layout {
  vehicle: Vehicle;
  modules: ModuleSpec[];
  sleeping: boolean;
  seatsFolded: boolean;
  drawerLength: number;
  moduleHeight: number;
  deckTop: number;
  headroom: number | null;
  tankLitres: number;
  drawerCount: number;
  drawerWidth: number;
  fridgeBayWidth: number;
}

const PLY = 18;
const TAILGATE_GAP = 20;
const FRIDGE = {
  small: { w: 420, d: 650, h: 470 },
  large: { w: 490, d: 760, h: 520 },
};

export function buildLayout(answers: KitAnswers, power?: PowerPlan): Layout {
  const v = getVehicle(answers.vehicle);
  const modules: ModuleSpec[] = [];
  const sleeping = answers.sleep === 'yes' || answers.sleep === 'sometimes';
  const fridge = answers.fridge === 'small' || answers.fridge === 'large' ? FRIDGE[answers.fridge] : null;
  const kitchen = answers.kitchen === 'yes';
  const tank = answers.water === 'tank';
  const electrical = !!power && power.batteryAh > 0 && answers.electrical !== 'none' && answers.electrical !== undefined;
  const premium = answers.finish === 'premium';

  const drawerLength = Math.min(v.cargoLength - 60, 1150);
  const zFront = -(TAILGATE_GAP + drawerLength);
  const zMid = -(TAILGATE_GAP + drawerLength / 2);

  // Side cabinets ("wings") sit over the wheel arches.
  // The right-hand wing houses the battery, so it needs to be at least battery-width.
  const archMargin = (v.floorWidth - v.archWidth) / 2;
  const leftWing = premium || answers.use === 'remote';
  const rightWing = premium || answers.use === 'remote' || electrical;
  const leftWingWidth = Math.max(archMargin, 100);
  const rightWingWidth = Math.max(archMargin, electrical ? 170 : 100);
  const left = -v.floorWidth / 2 + (leftWing ? leftWingWidth : archMargin);
  const right = v.floorWidth / 2 - (rightWing ? rightWingWidth : archMargin);
  const moduleWidth = right - left;

  // Slimline water tank under the drawers raises everything.
  const tankHeight = tank ? 110 : 0;
  let tankLitres = 0;
  if (tank) {
    const target = answers.use === 'remote' ? 70 : 45;
    const tw = moduleWidth - 40;
    const tl = Math.min(drawerLength - 40, (target * 1e6) / (tw * tankHeight));
    tankLitres = Math.round((tw * tankHeight * tl) / 1e6);
    modules.push({ id: 'tank', kind: 'tank', x: (left + right) / 2, y: 0, z: -(TAILGATE_GAP + tl / 2), w: tw, h: tankHeight, d: tl });
  }
  const base = tankHeight;

  const drawerHeight = answers.use === 'work' ? 300 : 280;
  const moduleHeight = sleeping && fridge ? Math.max(drawerHeight, fridge.h + 70) : drawerHeight;

  // Floor modules, left to right: fridge bay (kerb side), then drawers.
  let cursor = left;
  let fridgeBayWidth = 0;
  if (fridge) {
    fridgeBayWidth = fridge.w + 60;
    const cx = cursor + fridgeBayWidth / 2;
    modules.push({ id: 'fridge-slide', kind: 'fridge-slide', x: cx, y: base, z: zMid, w: fridgeBayWidth - 20, h: 40, d: drawerLength, slide: fridge.d * 0.9 });
    modules.push({ id: 'fridge', kind: 'fridge', x: cx, y: base + 40, z: -(TAILGATE_GAP + fridge.d / 2 + 10), w: fridge.w, h: fridge.h, d: fridge.d, slide: fridge.d * 0.9 });
    if (sleeping) {
      // Fridge lives under the bed, so the bay gets side walls and a lid.
      modules.push({ id: 'fridge-bay-wall', kind: 'carcass', x: cursor + PLY / 2, y: base, z: zMid, w: PLY, h: moduleHeight, d: drawerLength });
    }
    cursor += fridgeBayWidth;
  }

  const remaining = right - cursor;
  const drawerCount = answers.use === 'work' && remaining >= 1000 ? 3 : remaining >= 760 ? 2 : 1;
  const drawerWidth = remaining / drawerCount;
  for (let i = 0; i < drawerCount; i++) {
    const cx = cursor + drawerWidth * (i + 0.5);
    const isKitchen = kitchen && i === 0;
    modules.push({ id: `carcass-${i}`, kind: 'carcass', x: cx, y: base, z: zMid, w: drawerWidth, h: moduleHeight, d: drawerLength });
    modules.push({
      id: isKitchen ? 'kitchen' : `drawer-${i}`,
      kind: isKitchen ? 'kitchen' : 'drawer',
      x: cx,
      y: base + PLY,
      z: zMid + 12,
      w: drawerWidth - 2 * PLY - 6,
      h: moduleHeight - 2 * PLY - 8,
      d: drawerLength - 30,
      slide: drawerLength * (isKitchen ? 0.75 : 0.6),
    });
  }

  // Deck over the drawers (and over the fridge when sleeping).
  const deckLeft = sleeping ? left : left + fridgeBayWidth;
  modules.push({ id: 'deck', kind: 'deck', x: (deckLeft + right) / 2, y: base + moduleHeight, z: zMid, w: right - deckLeft, h: PLY, d: drawerLength });
  const deckTop = base + moduleHeight + PLY;

  // Wings: full height to the window line, or level with the bed when sleeping.
  const wingHeight = sleeping ? deckTop : Math.max(v.windowHeight, deckTop);
  const wingSpec = (side: 'left' | 'right') => {
    const width = side === 'left' ? leftWingWidth : rightWingWidth;
    const x = side === 'left' ? -v.floorWidth / 2 + width / 2 + 5 : v.floorWidth / 2 - width / 2 - 5;
    return { x, w: width - 10 };
  };
  if (leftWing) {
    const { x, w } = wingSpec('left');
    modules.push({ id: 'wing-left', kind: 'wing', x, y: 0, z: zMid, w, h: wingHeight, d: drawerLength });
  }
  if (rightWing) {
    const { x, w } = wingSpec('right');
    if (electrical) {
      const batteryDepth = 380;
      modules.push({ id: 'wing-right', kind: 'wing', x, y: 0, z: zFront + (drawerLength - batteryDepth) / 2, w, h: wingHeight, d: drawerLength - batteryDepth });
      modules.push({ id: 'battery', kind: 'battery', x, y: 0, z: -(TAILGATE_GAP + batteryDepth / 2), w, h: wingHeight, d: batteryDepth });
    } else {
      modules.push({ id: 'wing-right', kind: 'wing', x, y: 0, z: zMid, w, h: wingHeight, d: drawerLength });
    }
  }

  // Sleeping platform over the folded 2nd row.
  let headroom: number | null = null;
  if (sleeping) {
    const platformLength = v.sleepLength - TAILGATE_GAP - drawerLength;
    const platformWidth = v.floorWidth - 40;
    const pz = zFront - platformLength / 2;
    if (answers.sleep === 'yes') {
      modules.push({ id: 'platform', kind: 'platform', x: 0, y: deckTop - PLY, z: pz, w: platformWidth, h: PLY, d: platformLength });
    } else {
      const half = platformLength / 2;
      modules.push({ id: 'infill-0', kind: 'infill', x: 0, y: deckTop - PLY, z: zFront - half / 2, w: platformWidth, h: PLY, d: half - 6 });
      modules.push({ id: 'infill-1', kind: 'infill', x: 0, y: deckTop - PLY, z: zFront - half - half / 2, w: platformWidth, h: PLY, d: half - 6 });
    }
    const mattressLength = v.sleepLength - TAILGATE_GAP - 40;
    modules.push({ id: 'mattress', kind: 'mattress', x: 0, y: deckTop, z: -(TAILGATE_GAP + 20 + mattressLength / 2), w: platformWidth - 60, h: 80, d: mattressLength });
    headroom = v.roofHeight - deckTop - 80;
  }

  // Roof solar.
  if (power && power.solarW > 0 && answers.electrical && answers.electrical !== 'none') {
    const panelLength = Math.min(1500, 600 + power.solarW * 2.2);
    modules.push({ id: 'solar', kind: 'solar', x: 0, y: v.roofHeight + 60, z: -(v.sleepLength / 2), w: Math.min(v.floorWidth - 100, 1100), h: 35, d: panelLength });
  }

  return {
    vehicle: v,
    modules,
    sleeping,
    seatsFolded: sleeping,
    drawerLength,
    moduleHeight,
    deckTop,
    headroom,
    tankLitres,
    drawerCount,
    drawerWidth: Math.round(drawerWidth),
    fridgeBayWidth,
  };
}

// ---------------------------------------------------------------------------
// Power
// ---------------------------------------------------------------------------

export interface PowerPlan {
  dailyWh: number;
  batteryAh: number;
  solarW: number;
  dcdcAmps: number;
  inverterW: number;
  tierName: string;
  products: string[];
}

const FRIDGE_WH = { none: 0, small: 300, large: 450 };
const AUTONOMY = { weekender: 1.5, touring: 2, remote: 3, work: 1 };

export function planPower(answers: KitAnswers): PowerPlan {
  const devices = DEVICES.filter((d) => answers.power?.includes(d.id));
  const fridgeWh = FRIDGE_WH[answers.fridge ?? 'none'];
  const dailyWh = fridgeWh + devices.reduce((sum, d) => sum + d.whPerDay, 0);

  if (dailyWh === 0) {
    return { dailyWh: 0, batteryAh: 0, solarW: 0, dcdcAmps: 0, inverterW: 0, tierName: 'No 12V needed yet', products: [] };
  }

  const acPeak = Math.max(0, ...devices.filter((d) => d.ac).map((d) => d.watts));
  const inverterW = acPeak === 0 ? 0 : acPeak * 1.25 <= 1600 ? 1600 : acPeak * 1.25 <= 2000 ? 2000 : 3000;

  const autonomy = AUTONOMY[answers.use ?? 'touring'];
  let batteryAh = Math.ceil((dailyWh * autonomy) / (12.8 * 0.9) / 100) * 100;
  if (inverterW >= 2000) batteryAh = Math.max(batteryAh, 200);
  if (inverterW >= 3000) batteryAh = Math.max(batteryAh, 300);
  batteryAh = Math.min(Math.max(batteryAh, 100), 400);

  const needsSolar = answers.use === 'remote' || answers.use === 'touring' || dailyWh > 400;
  const solarW = needsSolar ? Math.min(Math.ceil(dailyWh / (4.5 * 0.7) / 100) * 100, 600) : 0;
  const dcdcAmps = batteryAh <= 100 ? 30 : 50;

  const products = [
    `${batteryAh}Ah lithium (LiFePO4) house battery`,
    dcdcAmps === 30 ? 'Victron Orion-Tr Smart 12/12-30A DC-DC charger' : 'Victron Orion XS 12/12-50A DC-DC charger',
    'Victron SmartShunt battery monitor',
    'USB-C PD + USB-A outlets, 12V sockets and fused distribution',
  ];
  if (solarW > 0) products.push(`${solarW}W roof solar + Victron SmartSolar MPPT ${solarW > 300 ? '100/50' : '100/30'}`);
  if (inverterW > 0) products.push(`Victron Phoenix Inverter Smart 12/${inverterW}`);
  if (answers.fridge && answers.fridge !== 'none') products.push('Dedicated fridge circuit (pairs well with a Bushman fridge)');
  if (answers.power?.includes('compressor')) products.push('Rear Anderson plug for the compressor');

  const tierName = inverterW > 0 || batteryAh >= 300 ? 'Off-grid 12V + 240V' : batteryAh >= 200 ? 'Touring 12V' : 'Weekender 12V';
  return { dailyWh, batteryAh, solarW, dcdcAmps, inverterW, tierName, products };
}

// ---------------------------------------------------------------------------
// Recommendation
// ---------------------------------------------------------------------------

export interface PriceLine {
  label: string;
  amount: number;
}

export interface Recommendation {
  tier: KitTier;
  kitName: string;
  tagline: string;
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
  fusionParams: { name: string; unit: string; expression: string; comment: string }[];
}

const roundTo = (n: number, step = 10) => Math.round(n / step) * step;

export function recommend(answers: KitAnswers): Recommendation {
  const power = planPower(answers);
  const layout = buildLayout(answers, power);
  const v = layout.vehicle;
  const hasFridge = answers.fridge === 'small' || answers.fridge === 'large';
  const hasKitchen = answers.kitchen === 'yes';
  const hasTank = answers.water === 'tank';
  const wings = layout.modules.filter((m) => m.kind === 'wing').length;

  const tier: KitTier =
    (hasFridge && hasKitchen) || hasTank || answers.use === 'remote' ? 'expedition' : hasFridge || hasKitchen ? 'touring' : 'essentials';
  const kit = KITS[tier];

  // Why we picked it, in plain English.
  const why: string[] = [];
  const sizing = `${layout.drawerLength}mm long, sized to your ${v.short} (~${v.archWidth}mm between the wheel arches)`;
  if (layout.drawerCount === 1 && hasKitchen) {
    why.push(`A ${layout.drawerWidth}mm-wide kitchen drawer beside the fridge, ${sizing}.${answers.fridge === 'large' ? ' Want a storage drawer too? A 40 to 50L fridge frees up the width.' : ''}`);
  } else {
    why.push(`${layout.drawerCount === 1 ? 'A' : layout.drawerCount === 2 ? 'Twin' : 'Three'} ${layout.drawerWidth}mm-wide drawer${layout.drawerCount > 1 ? 's' : ''}, ${sizing}.`);
  }
  if (hasFridge) why.push(`Fridge on a drop-down slide on the kerb side, so you're grabbing a cold one from the footpath side, not the road.`);
  if (hasKitchen) why.push(`Kitchen drawer slides ${Math.round(layout.drawerLength * 0.75)}mm out the back. Stove and prep bench at standing height, sheltered by the tailgate.`);
  if (answers.sleep === 'yes') why.push(`Fixed bed ${v.sleepLength - 40}mm long, flush with the drawer deck. Folded 2nd row underneath, no setup at night.`);
  if (answers.sleep === 'sometimes') why.push(`Removable infill panels turn the deck into a ${v.sleepLength - 40}mm bed when you need it and pack away when you don't.`);
  if (hasTank) why.push(`About ${layout.tankLitres}L slimline tank under the drawers. Lowest, most central spot for ${layout.tankLitres}kg of water.`);
  if (wings > 0) why.push(`Side cabinets over the wheel arches use dead space most fit-outs waste${power.batteryAh > 0 && answers.electrical !== 'none' ? ', with the battery and monitor tucked in the right-hand side' : ''}.`);
  if (answers.use === 'work') why.push('Heavy-duty locking slides rated for a full load of tools on rough site tracks.');

  // Expert tips: device advice first, then layout-specific heads-ups.
  const tips: Recommendation['tips'] = [];
  for (const d of DEVICES) {
    if (answers.power?.includes(d.id) && d.tip) tips.push({ text: d.tip, link: d.link });
  }
  if (layout.headroom !== null && layout.headroom < 450) {
    tips.push({ text: `Straight up: this combo leaves about ${Math.round(layout.headroom)}mm between mattress and roof in a ${v.short}. That's too tight to sleep comfortably. A fridge under the bed pushes the whole deck up, so most people either sleep "sometimes" with the fridge moved out at night, go for a smaller fridge, or skip the under-drawer tank. We'll talk it through with you.` });
  } else if (layout.headroom !== null && layout.headroom < 650) {
    tips.push({ text: `Heads up: you've got about ${Math.round(layout.headroom)}mm from mattress to roof. Fine for sleeping, tight for sitting up. A lower-profile fridge or skipping the under-drawer tank buys back headroom.` });
  }
  if (hasTank && layout.tankLitres < 40) {
    tips.push({ text: `The ${v.short} tops out around ${layout.tankLitres}L under the drawers. Pair it with a 20L jerry for longer trips.` });
  }
  if (answers.use === 'remote' && !hasFridge) tips.push({ text: 'Going remote without a fridge is hard work. Even a 40L makes a massive difference to what you can eat out there.' });
  if (answers.use === 'remote' && answers.water !== 'tank') tips.push({ text: 'For remote trips, plan on 7L per person per day. A built-in tank plus jerries is the safest bet.' });
  if (answers.finish === 'budget') tips.push({ text: 'Where to spend if money is tight: slides, ply and the floor mount. Never skimp on those. Finishes can always be upgraded later.' });
  if (answers.build === 'diy') tips.push({ text: 'Most people build our kits in a weekend with a drill, a few clamps and a mate. Every panel is numbered and the floor template marks exactly where to drill, clear of fuel tanks and wiring.' });

  // Pricing (placeholders, see src/data/kit-builder.ts).
  const finishMult = PRICING.finishMultiplier[answers.finish ?? 'balanced'];
  const kitLines: PriceLine[] = [{ label: `${kit.name} for ${v.short}`, amount: kit.base }];
  if (answers.sleep === 'yes') kitLines.push({ label: 'Fixed sleeping platform', amount: PRICING.sleepFixed });
  if (answers.sleep === 'sometimes') kitLines.push({ label: 'Removable bed infills', amount: PRICING.sleepInfill });
  if (wings > 0 && tier !== 'expedition') kitLines.push({ label: 'Side cabinets', amount: PRICING.sideCabinets });
  if (hasTank) kitLines.push({ label: `${layout.tankLitres}L under-drawer water tank`, amount: PRICING.waterTank });
  if (finishMult !== 1) {
    const subtotal = kitLines.reduce((s, l) => s + l.amount, 0);
    kitLines.push({ label: FINISH_LABELS[answers.finish ?? 'balanced'], amount: roundTo(subtotal * (finishMult - 1)) });
  }
  const build = answers.build ?? 'diy';
  if (PRICING.build[build] > 0) kitLines.push({ label: BUILD_LABELS[build], amount: PRICING.build[build] });
  const kitTotal = kitLines.reduce((s, l) => s + l.amount, 0);

  const electricalLines: PriceLine[] = [];
  if (power.batteryAh > 0 && answers.electrical && answers.electrical !== 'none') {
    electricalLines.push({ label: `${power.tierName} system (${power.batteryAh}Ah)`, amount: ELECTRICAL_PRICING.batteryKit[power.batteryAh] ?? 0 });
    if (power.solarW > 0) electricalLines.push({ label: `${power.solarW}W solar`, amount: (power.solarW / 100) * ELECTRICAL_PRICING.solarPer100W });
    if (power.inverterW > 0) electricalLines.push({ label: `${power.inverterW}W inverter`, amount: ELECTRICAL_PRICING.inverter[power.inverterW] ?? 0 });
    if (answers.electrical === 'installed') {
      electricalLines.push({ label: 'Install + electrician sign-off', amount: ELECTRICAL_PRICING.install + (power.inverterW > 0 ? ELECTRICAL_PRICING.installInverter : 0) });
    }
  }
  const electricalTotal = electricalLines.reduce((s, l) => s + l.amount, 0);

  const includes = [
    'Full 3D design of your layout, approved by you before we cut',
    'CNC-cut premium birch ply, every panel numbered',
    'Pre-drilled joins and all hardware',
    'Floor install template, clear of fuel tanks, lines and wiring',
    'Heavy-duty ball-bearing slides',
    build === 'installed' ? 'Workshop install on the Gold Coast' : build === 'assembled' ? 'Assembled and checked before it ships' : 'Flat packed and shipped Australia-wide',
  ];

  const fusionParams = [
    { name: 'cargo_length', unit: 'mm', expression: `${v.cargoLength} mm`, comment: `${v.label} cargo length (approx, confirm with template)` },
    { name: 'floor_width', unit: 'mm', expression: `${v.floorWidth} mm`, comment: 'Wall to wall' },
    { name: 'arch_width', unit: 'mm', expression: `${v.archWidth} mm`, comment: 'Between wheel arches' },
    { name: 'drawer_length', unit: 'mm', expression: `${layout.drawerLength} mm`, comment: '' },
    { name: 'module_height', unit: 'mm', expression: `${layout.moduleHeight} mm`, comment: 'Drawer carcass height' },
    { name: 'drawer_count', unit: '', expression: `${layout.drawerCount}`, comment: '' },
    { name: 'drawer_width', unit: 'mm', expression: `${layout.drawerWidth} mm`, comment: 'Per carcass' },
    { name: 'fridge_bay_width', unit: 'mm', expression: `${layout.fridgeBayWidth} mm`, comment: answers.fridge ?? 'none' },
    { name: 'has_kitchen', unit: '', expression: hasKitchen ? '1' : '0', comment: '' },
    { name: 'tank_height', unit: 'mm', expression: `${hasTank ? 110 : 0} mm`, comment: `${layout.tankLitres}L` },
    { name: 'sleep_mode', unit: '', expression: answers.sleep === 'yes' ? '2' : answers.sleep === 'sometimes' ? '1' : '0', comment: '0 none, 1 infill, 2 fixed' },
    { name: 'platform_length', unit: 'mm', expression: `${layout.sleeping ? v.sleepLength - TAILGATE_GAP - layout.drawerLength : 0} mm`, comment: '' },
    { name: 'wing_count', unit: '', expression: `${wings}`, comment: '' },
    { name: 'ply_thickness', unit: 'mm', expression: `${PLY} mm`, comment: '' },
  ];

  return {
    tier,
    kitName: kit.name,
    tagline: kit.tagline,
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
    fusionParams,
  };
}

/** Fusion 360 "Parameter I/O" compatible CSV (Name, Unit, Expression, Comment). */
export function fusionParamsCsv(rec: Recommendation): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return ['Name,Unit,Expression,Comment', ...rec.fusionParams.map((p) => [p.name, p.unit, p.expression, p.comment].map(esc).join(','))].join('\n');
}

/** One-paragraph plain-text summary, used for CRM fields and emails. */
export function summaryText(answers: KitAnswers, rec: Recommendation): string {
  const q = (id: string) => {
    const question = QUESTIONS.find((x) => x.id === id);
    const value = (answers as Record<string, unknown>)[id];
    if (!question || value === undefined) return '-';
    if (Array.isArray(value)) return value.map((v) => question.options.find((o) => o.value === v)?.label ?? v).join(', ') || 'Nothing';
    return question.options.find((o) => o.value === value)?.label ?? String(value);
  };
  return [
    `${rec.kitName} for ${rec.vehicle.label}`,
    `Trip: ${q('use')} | Sleeping: ${q('sleep')} | Fridge: ${q('fridge')} | Kitchen: ${q('kitchen')} | Water: ${q('water')}`,
    `Power: ${q('power')}`,
    `12V: ${rec.power.tierName}${rec.power.batteryAh ? ` (${rec.power.batteryAh}Ah, ${rec.power.solarW}W solar${rec.power.inverterW ? `, ${rec.power.inverterW}W inverter` : ''})` : ''} | Electrical: ${q('electrical')}`,
    `Finish: ${q('finish')} | Build: ${q('build')}`,
    `Indicative: kit $${rec.kitTotal.toLocaleString('en-AU')} + electrical $${rec.electricalTotal.toLocaleString('en-AU')} = $${rec.total.toLocaleString('en-AU')}`,
  ].join('\n');
}
