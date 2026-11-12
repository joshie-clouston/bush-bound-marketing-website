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
export type FridgeId = 'upright-65' | 'upright-85' | 'drawer-30';

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
  { id: 'upright-65', type: 'upright', litres: 65, label: 'Upright fridge 65L', w: 480, d: 560, h: 650 },
  { id: 'upright-85', type: 'upright', litres: 85, label: 'Upright fridge 85L', w: 520, d: 600, h: 760 },
  { id: 'drawer-30', type: 'drawer', litres: 30, label: 'Drawer fridge 30L', w: 480, d: 600, h: 320 },
];

export const DEFAULT_FRIDGE: FridgeId = 'upright-65';

export function getFridge(id: string | undefined): Fridge | null {
  if (id === 'none') return null;
  return FRIDGES.find((f) => f.id === id) ?? FRIDGES.find((f) => f.id === DEFAULT_FRIDGE)!;
}

// ---------------------------------------------------------------------------
// Storage options
// ---------------------------------------------------------------------------

export type StorageId = 'bed' | 'pullout' | 'cubby';

export const STORAGE: { id: StorageId; label: string; sub: string }[] = [
  { id: 'bed', label: 'Sliding bed', sub: 'Slides out over the folded rear seats' },
  { id: 'pullout', label: 'Pull-out table', sub: 'Built into the bottom of the left drawer' },
  { id: 'cubby', label: 'Foldable table storage', sub: 'A hinged cubby that holds a folding table' },
];

/** Nothing is ticked until the customer picks it. */
export const DEFAULT_STORAGE: StorageId[] = [];

// ---------------------------------------------------------------------------
// Finishes
// ---------------------------------------------------------------------------

export type FinishId = 'hex' | 'green' | 'timber';

export const FINISHES: { id: FinishId; label: string; sub: string }[] = [
  { id: 'hex', label: 'Black honeycomb', sub: 'Our standard. Hard-wearing black hex-top birch ply throughout' },
  { id: 'green', label: 'Green laminate', sub: 'Forest green on the drawer fronts and fridge cabinet sides' },
  { id: 'timber', label: 'Timber grain laminate', sub: 'Warm timber look on the drawer fronts and fridge cabinet sides' },
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
  id: 'fridge' | 'storage' | 'finish';
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
    title: 'Pick your fridge',
    help: 'The cabinetry is built around it.',
    options: FRIDGES.map((f) => ({
      value: f.id,
      label: f.label,
      sub: f.type === 'upright' ? 'Front-opening, in its own cabinet' : 'Built into the drawers',
    })),
  },
  {
    id: 'storage',
    title: 'Add options',
    help: 'Tick any you want. Tap Open on the model to see them in action.',
    multi: true,
    options: STORAGE.map((o) => ({ value: o.id, label: o.label, sub: o.sub })),
  },
  {
    id: 'finish',
    title: 'Pick your finish',
    help: 'Black honeycomb is our standard. Laminate goes on the faces you see.',
    options: FINISHES.map((f) => ({ value: f.id, label: f.label, sub: f.sub })),
  },
];

/**
 * Not asked in the builder for now (kept so they're easy to bring back): 12V and 240V power.
 * The quote request covers these with the customer.
 */
export const HIDDEN_QUESTIONS = ['power12', 'power240', 'electricalBuild'] as const;

// ---------------------------------------------------------------------------
// Names (prices are server-side only, see pricing.server.ts)
// ---------------------------------------------------------------------------

export const BASE_KIT = {
  name: 'Wagon Base Kit',
  tagline: 'Evenly split drawers and an upright fridge cabinet in black honeycomb birch ply.',
};

/** How they want it, asked on the details page (customer's voice). */
export const BUILD_OPTIONS: { value: 'diy' | 'assembled' | 'installed'; label: string; sub: string }[] = [
  { value: 'diy', label: 'Flat pack, delivered to me', sub: 'I\'ll build and install it myself' },
  { value: 'assembled', label: 'Build it for me, I\'ll install it', sub: 'Arrives assembled, I bolt it in' },
  { value: 'installed', label: 'Build and install it for me', sub: 'At your Gold Coast workshop' },
];

/** Rough ordering timeframes shown to customers (confirmed per order). */
export const ORDERING = {
  payment: 'Full payment up front, once we\'ve confirmed your design and exact price',
  make: '2 to 4 weeks',
  delivery: '3 to 5 days',
  note: 'These are rough estimates. We\'ll confirm timing for your vehicle and location.',
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
