// Flat pack kit builder data: vehicles, questions, devices, products and pricing.
//
// Everything a non-developer might want to tweak lives in this file.
// Vehicle measurements are rough, rounded cargo sizes used ONLY to proportion the
// stylised 3D preview. This file ships to the browser: never put real CAD/Fusion
// dimensions, cut lists or joinery details in here. The real design stays in Fusion.
//
// NO PRICES IN HERE. This file ships to the browser, so all dollar figures live in
// src/lib/kit-builder/pricing.server.ts, which only runs on the server. Customers only
// ever see a price bracket.

export type VehicleId =
  | '80-series'
  | '100-series'
  | '200-series'
  | '300-series'
  | '76-series-wagon'
  | 'prado-120'
  | 'prado-150'
  | 'prado-250'
  | 'patrol-gq'
  | 'patrol-gu'
  | 'patrol-y62'
  | 'everest'
  | 'mu-x'
  | 'other';

export interface Vehicle {
  id: VehicleId;
  label: string;
  short: string;
  make: 'Toyota' | 'Nissan' | 'Ford' | 'Isuzu' | 'Other';
  /** Floor length from tailgate to the back of the 2nd row (3rd row out), mm */
  cargoLength: number;
  /** Wall to wall at floor/window height, mm */
  floorWidth: number;
  /** Clear width between the wheel arches, mm */
  archWidth: number;
  archHeight: number;
  archLength: number;
  /** Floor to bottom of the rear side windows, mm */
  windowHeight: number;
  /** Cargo floor to roof lining, mm */
  roofHeight: number;
  /** Tailgate to the back of the front seats with the 2nd row folded, mm */
  sleepLength: number;
}

export const VEHICLES: Vehicle[] = [
  { id: '80-series', label: 'LandCruiser 80 Series', short: '80 Series', make: 'Toyota', cargoLength: 1120, floorWidth: 1400, archWidth: 1050, archHeight: 280, archLength: 760, windowHeight: 480, roofHeight: 1060, sleepLength: 1880 },
  { id: '100-series', label: 'LandCruiser 100 / 105 Series', short: '100 Series', make: 'Toyota', cargoLength: 1050, floorWidth: 1250, archWidth: 1000, archHeight: 270, archLength: 760, windowHeight: 450, roofHeight: 1000, sleepLength: 1900 },
  { id: '200-series', label: 'LandCruiser 200 Series', short: '200 Series', make: 'Toyota', cargoLength: 1060, floorWidth: 1250, archWidth: 1020, archHeight: 260, archLength: 780, windowHeight: 480, roofHeight: 1000, sleepLength: 1940 },
  { id: '300-series', label: 'LandCruiser 300 Series', short: '300 Series', make: 'Toyota', cargoLength: 1100, floorWidth: 1260, archWidth: 1050, archHeight: 260, archLength: 780, windowHeight: 470, roofHeight: 990, sleepLength: 1950 },
  { id: '76-series-wagon', label: 'LandCruiser 76 Series Wagon', short: '76 Series', make: 'Toyota', cargoLength: 1450, floorWidth: 1400, archWidth: 1200, archHeight: 290, archLength: 800, windowHeight: 520, roofHeight: 1150, sleepLength: 2050 },
  { id: 'prado-120', label: 'Prado 120 Series', short: 'Prado 120', make: 'Toyota', cargoLength: 950, floorWidth: 1250, archWidth: 1050, archHeight: 250, archLength: 740, windowHeight: 450, roofHeight: 960, sleepLength: 1800 },
  { id: 'prado-150', label: 'Prado 150 Series', short: 'Prado 150', make: 'Toyota', cargoLength: 1000, floorWidth: 1300, archWidth: 1100, archHeight: 250, archLength: 740, windowHeight: 450, roofHeight: 950, sleepLength: 1830 },
  { id: 'prado-250', label: 'Prado 250 Series', short: 'Prado 250', make: 'Toyota', cargoLength: 1020, floorWidth: 1300, archWidth: 1080, archHeight: 250, archLength: 740, windowHeight: 460, roofHeight: 980, sleepLength: 1860 },
  { id: 'patrol-gq', label: 'Nissan Patrol GQ (Y60)', short: 'Patrol GQ', make: 'Nissan', cargoLength: 1150, floorWidth: 1400, archWidth: 1100, archHeight: 290, archLength: 780, windowHeight: 500, roofHeight: 1100, sleepLength: 1900 },
  { id: 'patrol-gu', label: 'Nissan Patrol GU (Y61)', short: 'Patrol GU', make: 'Nissan', cargoLength: 1100, floorWidth: 1350, archWidth: 1100, archHeight: 280, archLength: 780, windowHeight: 490, roofHeight: 1080, sleepLength: 1900 },
  { id: 'patrol-y62', label: 'Nissan Patrol Y62', short: 'Patrol Y62', make: 'Nissan', cargoLength: 1100, floorWidth: 1400, archWidth: 1200, archHeight: 270, archLength: 780, windowHeight: 480, roofHeight: 1020, sleepLength: 1950 },
  { id: 'everest', label: 'Ford Everest', short: 'Everest', make: 'Ford', cargoLength: 1000, floorWidth: 1250, archWidth: 1050, archHeight: 250, archLength: 740, windowHeight: 450, roofHeight: 960, sleepLength: 1850 },
  { id: 'mu-x', label: 'Isuzu MU-X', short: 'MU-X', make: 'Isuzu', cargoLength: 950, floorWidth: 1220, archWidth: 1040, archHeight: 250, archLength: 720, windowHeight: 440, roofHeight: 940, sleepLength: 1800 },
  { id: 'other', label: 'Something else', short: 'your wagon', make: 'Other', cargoLength: 1050, floorWidth: 1280, archWidth: 1050, archHeight: 260, archLength: 760, windowHeight: 460, roofHeight: 1000, sleepLength: 1880 },
];

export const DEFAULT_VEHICLE: VehicleId = '80-series';

export function getVehicle(id: VehicleId | undefined): Vehicle {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES.find((v) => v.id === DEFAULT_VEHICLE)!;
}

// ---------------------------------------------------------------------------
// Power devices (not asked yet: kept for the upcoming 12V sizing step)
// ---------------------------------------------------------------------------

export type DeviceId =
  | 'phones'
  | 'lights'
  | 'laptop'
  | 'camera'
  | 'starlink'
  | 'cpap'
  | 'coffee'
  | 'kettle'
  | 'ebike';

export interface Device {
  id: DeviceId;
  label: string;
  /** Already handled by the base kit's 12V / 240V / compressor setup */
  base?: boolean;
  /** Typical energy per day, Wh */
  whPerDay: number;
  /** Peak draw, W */
  watts: number;
  /** Needs 240V (inverter) */
  ac: boolean;
  /** Mate-to-mate advice shown when the device is picked */
  tip?: string;
  link?: { label: string; href: string };
}

export const DEVICES: Device[] = [
  { id: 'phones', label: 'Phones & head torches', base: true, whPerDay: 25, watts: 20, ac: false },
  { id: 'lights', label: 'Camp lights', base: true, whPerDay: 40, watts: 30, ac: false },
  { id: 'laptop', label: 'Laptop', base: true, whPerDay: 150, watts: 100, ac: false, tip: 'Most laptops charge fine off the USB-C outlet, straight off 12V. More efficient than plugging the brick into the 240V outlet.' },
  { id: 'camera', label: 'Camera or drone batteries', base: true, whPerDay: 80, watts: 60, ac: false },
  { id: 'starlink', label: 'Starlink', whPerDay: 300, watts: 45, ac: false, tip: 'Starlink Mini runs off 12V and pulls around 25 to 40W. Leave it on all day and it\'s your biggest load after the fridge, so we size the battery for it.' },
  { id: 'cpap', label: 'CPAP machine', whPerDay: 300, watts: 60, ac: false, tip: 'Run your CPAP off a 12V DC converter, not the inverter. It roughly halves the draw. Turning the humidifier off saves even more.' },
  { id: 'coffee', label: 'Coffee machine', whPerDay: 120, watts: 1400, ac: true, tip: 'Real talk: a 240V coffee machine pulls about 1,400W. That means a 2,000W inverter, a 200Ah+ battery and heavier cabling, easily $2k+ extra for a flat white. An AeroPress or stovetop on the gas makes a ripper coffee for under $80 and uses zero amps.', link: { label: 'Check out the AeroPress', href: 'https://aeropress.com/' } },
  { id: 'kettle', label: 'Kettle or induction cooktop', whPerDay: 500, watts: 2200, ac: true, tip: 'Electric kettles and induction cooktops are the hungriest thing you can run off-grid (2,000W+). A butane stove or Jetboil does the same job for a fraction of the cost and weight.' },
  { id: 'ebike', label: 'E-bike or power tool charging', whPerDay: 500, watts: 250, ac: true, tip: 'E-bike batteries are big (500Wh+). Charge them while you drive through the DC-DC and your house battery stays topped up for the fridge.' },
];

// ---------------------------------------------------------------------------
// Fridges (GUESSED sizes for the proof of concept: swap in the exact
// models Bush Bound uses and recommends)
// ---------------------------------------------------------------------------

export type FridgeType = 'upright' | 'drawer' | 'chest';
export type FridgeId = 'upright-50' | 'upright-60' | 'upright-65' | 'drawer-30' | 'drawer-50' | 'chest-40' | 'chest-60' | 'chest-75';

export interface Fridge {
  id: FridgeId;
  type: FridgeType;
  litres: number;
  label: string;
  /** Rough outside size for the preview, mm */
  w: number;
  d: number;
  h: number;
}

export const FRIDGES: Fridge[] = [
  { id: 'upright-50', type: 'upright', litres: 50, label: 'Upright fridge 50L', w: 460, d: 540, h: 580 },
  { id: 'upright-60', type: 'upright', litres: 60, label: 'Upright fridge 60L', w: 470, d: 550, h: 620 },
  { id: 'upright-65', type: 'upright', litres: 65, label: 'Upright fridge 65L', w: 480, d: 560, h: 650 },
  { id: 'drawer-30', type: 'drawer', litres: 30, label: 'Drawer fridge 30L', w: 480, d: 600, h: 320 },
  { id: 'drawer-50', type: 'drawer', litres: 50, label: 'Drawer fridge 50L', w: 540, d: 700, h: 380 },
  { id: 'chest-40', type: 'chest', litres: 40, label: 'Chest fridge 40L', w: 400, d: 640, h: 470 },
  { id: 'chest-60', type: 'chest', litres: 60, label: 'Chest fridge 60L', w: 450, d: 720, h: 520 },
  { id: 'chest-75', type: 'chest', litres: 75, label: 'Chest fridge 75L', w: 480, d: 800, h: 560 },
];

export const DEFAULT_FRIDGE: FridgeId = 'upright-65';

export function getFridge(id: string | undefined): Fridge | null {
  if (id === 'none') return null;
  return FRIDGES.find((f) => f.id === id) ?? FRIDGES.find((f) => f.id === DEFAULT_FRIDGE)!;
}

// ---------------------------------------------------------------------------
// Storage options
// ---------------------------------------------------------------------------

export type StorageId = 'cubby' | 'pullout';

export const STORAGE: { id: StorageId; label: string; sub: string }[] = [
  { id: 'cubby', label: 'Bush Bound table + storage cubby', sub: 'Our slatted folding camp table, stored in its own hinged cubby. Tap Open to see it' },
  { id: 'pullout', label: 'Pull-out table', sub: 'A table that slides out from inside the left drawer' },
];

/** Ticked before the customer reaches the storage step (matches our base wagon build). */
export const DEFAULT_STORAGE: StorageId[] = ['cubby'];

// ---------------------------------------------------------------------------
// Finishes
// ---------------------------------------------------------------------------

export type FinishId = 'hex' | 'green' | 'timber';

export const FINISHES: { id: FinishId; label: string; sub: string }[] = [
  { id: 'hex', label: 'Black honeycomb', sub: 'Our standard. Hard-wearing black hex-top birch ply throughout' },
  { id: 'green', label: 'Green laminate fronts', sub: 'Forest green on the drawer fronts and fridge cabinet sides' },
  { id: 'timber', label: 'Timber grain laminate fronts', sub: 'Warm timber look on the drawer fronts and fridge cabinet sides' },
];


// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export interface QuestionOption {
  value: string;
  label: string;
  sub?: string;
  /** Heading to group options under */
  group?: string;
}

export interface Question {
  id: 'fridge' | 'bed' | 'storage' | 'power12' | 'power240' | 'electricalBuild' | 'finish' | 'build' | 'vehicle';
  title: string;
  help: string;
  multi?: boolean;
  /** Only asked when the customer wants 12V or 240V */
  needsPower?: boolean;
  options: QuestionOption[];
}

export const QUESTIONS: Question[] = [
  {
    id: 'fridge',
    title: 'Fridge',
    help: 'Pick the fridge you want built in. The cabinetry sizes itself around it.',
    options: [
      { value: 'none', label: 'No fridge', group: 'No fridge', sub: 'Drawers right across' },
      ...FRIDGES.map((f) => ({
        value: f.id,
        label: f.label,
        group: f.type === 'upright' ? 'Upright fridge' : f.type === 'drawer' ? 'Drawer fridge' : 'Chest fridge',
        sub: f.type === 'upright' ? 'Front-opening, in its own cabinet' : f.type === 'drawer' ? 'Built into the drawer system' : 'Lid on top',
      })),
    ],
  },
  {
    id: 'bed',
    title: 'Bed',
    help: 'The pull-out bed slides forward over the folded rear seats. Tap Open on the preview to see it.',
    options: [
      { value: 'none', label: 'No bed', sub: 'Drawers and storage only' },
      { value: 'pullout', label: 'Pull-out bed', sub: 'Slides out with a folding mattress' },
    ],
  },
  {
    id: 'storage',
    title: 'Tables',
    help: 'Tick what you want, or neither.',
    multi: true,
    options: STORAGE.map((s) => ({ value: s.id, label: s.label, sub: s.sub })),
  },
  {
    id: 'power12',
    title: '12V power',
    help: 'House battery charged from the car, 12V and USB sockets, and a battery monitor. Runs the fridge, lights and charges your devices.',
    options: [
      { value: 'yes', label: 'Yes, add 12V', sub: 'Battery, charging, 12V and USB sockets, monitor' },
      { value: 'no', label: 'No 12V', sub: 'Cable runs cut so you can add it later' },
    ],
  },
  {
    id: 'power240',
    title: '240V power',
    help: 'An inverter and 240V outlet for laptops, chargers and small appliances. It runs off the 12V battery.',
    options: [
      { value: 'yes', label: 'Yes, add 240V', sub: 'Inverter and 240V outlet' },
      { value: 'no', label: 'No 240V', sub: '' },
    ],
  },
  {
    id: 'electricalBuild',
    title: 'How do you want the electrical?',
    help: 'We\'ll size the system to what you want to run before anything ships.',
    needsPower: true,
    options: [
      { value: 'diy', label: 'I\'ll install it myself', sub: 'Send me the parts, labelled, for me or my auto electrician' },
      { value: 'assembled', label: 'Build it for me, I\'ll install it', sub: 'Arrives pre-wired on a panel, I connect it up' },
      { value: 'installed', label: 'Build and install it for me', sub: 'At your Gold Coast workshop, with electrician sign-off' },
    ],
  },
  {
    id: 'finish',
    title: 'Finish',
    help: 'Black honeycomb is our standard. Laminate goes on the drawer fronts and fridge cabinet sides.',
    options: FINISHES.map((f) => ({ value: f.id, label: f.label, sub: f.sub })),
  },
  {
    id: 'build',
    title: 'How do you want the fit-out built?',
    help: 'Every kit is CNC cut, numbered and pre-drilled, with a floor template for installing.',
    options: [
      { value: 'diy', label: 'I\'ll build and install it myself', sub: 'DIY flat pack, shipped to me' },
      { value: 'assembled', label: 'Build it for me, I\'ll install it', sub: 'Arrives assembled, I bolt it in' },
      { value: 'installed', label: 'Build and install it for me', sub: 'At your Gold Coast workshop' },
    ],
  },
  {
    id: 'vehicle',
    title: 'What are you driving?',
    help: 'We\'ve got the measurements for these. Every kit is cut for your exact vehicle.',
    options: VEHICLES.map((v) => ({ value: v.id, label: v.short === 'your wagon' ? 'Something else' : v.short, sub: v.make === 'Other' ? 'Tell us what it is' : v.label })),
  },
];

// ---------------------------------------------------------------------------
// Names (prices are server-side only, see pricing.server.ts)
// ---------------------------------------------------------------------------

export const BASE_KIT = {
  name: 'Wagon Base Kit',
  tagline: 'Evenly split drawers and an upright fridge cabinet in black honeycomb birch ply.',
};

export const BUILD_LABELS: Record<string, string> = {
  diy: 'DIY flat pack: I\'ll build and install it',
  assembled: 'Built for me, I\'ll install it',
  installed: 'Built and installed for me',
};

export const ELECTRICAL_BUILD_LABELS: Record<string, string> = {
  diy: 'Electrical parts, I\'ll install them',
  assembled: 'Pre-wired electrical panel, I\'ll install it',
  installed: 'Electrical built and installed for me, with sign-off',
};
