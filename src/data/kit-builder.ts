// Flat pack kit builder data: vehicles, questions, devices, products and pricing.
//
// Everything a non-developer might want to tweak lives in this file.
// Vehicle measurements are rough, rounded cargo sizes used ONLY to proportion the
// stylised 3D preview. This file ships to the browser: never put real CAD/Fusion
// dimensions, cut lists or joinery details in here. The real design stays in Fusion.
//
// PRICES ARE PLACEHOLDERS. Every dollar figure in PRICING and ELECTRICAL_PRICING
// needs to be confirmed by Luke before this goes live.

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

export const DEFAULT_VEHICLE: VehicleId = '200-series';

export function getVehicle(id: VehicleId | undefined): Vehicle {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES.find((v) => v.id === DEFAULT_VEHICLE)!;
}

// ---------------------------------------------------------------------------
// Power devices
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
// Fridges (GUESSED sizes and prices for the proof of concept: swap in the exact
// models Bush Bound uses and recommends)
// ---------------------------------------------------------------------------

export type FridgeType = 'upright' | 'drawer' | 'chest';
export type FridgeId = 'upright-50' | 'upright-65' | 'upright-85' | 'drawer-30' | 'drawer-50' | 'chest-40' | 'chest-60' | 'chest-75';

export interface Fridge {
  id: FridgeId;
  type: FridgeType;
  litres: number;
  label: string;
  /** Rough outside size for the preview, mm */
  w: number;
  d: number;
  h: number;
  /** Typical energy per day, Wh */
  whPerDay: number;
  price: number;
}

export const FRIDGES: Fridge[] = [
  { id: 'upright-50', type: 'upright', litres: 50, label: 'Upright fridge 50L', w: 460, d: 540, h: 580, whPerDay: 320, price: 1290 },
  { id: 'upright-65', type: 'upright', litres: 65, label: 'Upright fridge 65L', w: 480, d: 560, h: 650, whPerDay: 380, price: 1490 },
  { id: 'upright-85', type: 'upright', litres: 85, label: 'Upright fridge 85L', w: 520, d: 600, h: 780, whPerDay: 450, price: 1790 },
  { id: 'drawer-30', type: 'drawer', litres: 30, label: 'Drawer fridge 30L', w: 480, d: 600, h: 320, whPerDay: 260, price: 1190 },
  { id: 'drawer-50', type: 'drawer', litres: 50, label: 'Drawer fridge 50L', w: 540, d: 700, h: 380, whPerDay: 330, price: 1490 },
  { id: 'chest-40', type: 'chest', litres: 40, label: 'Chest fridge 40L', w: 400, d: 640, h: 470, whPerDay: 280, price: 990 },
  { id: 'chest-60', type: 'chest', litres: 60, label: 'Chest fridge 60L', w: 450, d: 720, h: 520, whPerDay: 340, price: 1290 },
  { id: 'chest-75', type: 'chest', litres: 75, label: 'Chest fridge 75L', w: 480, d: 800, h: 560, whPerDay: 400, price: 1490 },
];

export const DEFAULT_FRIDGE: FridgeId = 'upright-65';

export function getFridge(id: string | undefined): Fridge | null {
  if (id === 'none') return null;
  return FRIDGES.find((f) => f.id === id) ?? FRIDGES.find((f) => f.id === DEFAULT_FRIDGE)!;
}

// ---------------------------------------------------------------------------
// Features (tick boxes)
// ---------------------------------------------------------------------------

export type FeatureId = 'table' | 'kitchen' | 'tank' | 'compressor';

/** `inBase` features are part of the Wagon Base Kit price; unticking them gives a credit. */
export const FEATURES: { id: FeatureId; label: string; sub: string; price: number; inBase: boolean }[] = [
  { id: 'table', label: 'Pull-out table', sub: 'Slides out the back, instant bench', price: 390, inBase: true },
  { id: 'compressor', label: 'Air compressor', sub: 'Built in, air outlet on the side panel', price: 690, inBase: true },
  { id: 'kitchen', label: 'Kitchen slide-out', sub: 'Stove + prep bench drawer', price: 790, inBase: false },
  { id: 'tank', label: 'Water tank', sub: 'Slimline tank under the drawers', price: 690, inBase: false },
];

/** What's ticked before the customer gets to the features step (matches our base wagon build). */
export const DEFAULT_FEATURES: FeatureId[] = ['table', 'compressor'];

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------

export interface Dims {
  width: number;
  arches: number;
  depth: number;
  height: number;
}

export const DIM_FIELDS: { key: keyof Dims; letter: string; label: string; help: string; min: number; max: number }[] = [
  { key: 'width', letter: 'A', label: 'Boot width', help: 'Widest point, wall to wall, just above the wheel arch humps', min: 900, max: 1800 },
  { key: 'arches', letter: 'B', label: 'Between the wheel arches', help: 'The gap between the two wheel arch humps, at floor level', min: 700, max: 1600 },
  { key: 'depth', letter: 'C', label: 'Floor length', help: 'Inside edge of the boot opening to the back of the rear seats (seats up)', min: 600, max: 2500 },
  { key: 'height', letter: 'D', label: 'Boot height', help: 'Boot floor to the roof lining', min: 600, max: 1500 },
];

export const DEFAULT_ARCHES = 1200;

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export interface QuestionOption {
  value: string;
  label: string;
  sub?: string;
  /** Heading to group options under */
  group?: string;
  /** Short reaction from the Bush Bound team once this is picked */
  says?: string;
}

export interface Question {
  id: 'vehicle' | 'dims' | 'use' | 'sleep' | 'fridge' | 'features' | 'power' | 'finish' | 'build' | 'electrical';
  title: string;
  help: string;
  multi?: boolean;
  /** Custom step rendered as a form instead of option buttons */
  form?: 'dims';
  options: QuestionOption[];
}

export const QUESTIONS: Question[] = [
  {
    id: 'vehicle',
    title: 'What are you driving?',
    help: 'Every kit is cut for your exact wagon. Pick the closest one, then we\'ll grab your measurements.',
    options: VEHICLES.map((v) => ({ value: v.id, label: v.short === 'your wagon' ? 'Something else' : v.short, sub: v.make === 'Other' ? 'We\'ll measure it up' : v.label })),
  },
  {
    id: 'dims',
    title: 'Measure your boot',
    help: 'Grab a tape measure. We\'ve filled in typical numbers, swap in yours and watch the model resize. Rough is fine, we confirm everything with our floor template.',
    form: 'dims',
    options: [],
  },
  {
    id: 'use',
    title: 'What\'s the trip?',
    help: 'This one drives most of the design. Be honest, most people overbuild for the trip they do once.',
    options: [
      { value: 'weekender', label: 'Weekends away', sub: '1 to 3 nights, mostly near town', says: 'Love it. Keep it light and simple, you\'ll use it more.' },
      { value: 'touring', label: 'Touring', sub: 'A week or more, campgrounds and stations', says: 'The sweet spot. Fridge access and a quick camp setup matter most here.' },
      { value: 'remote', label: 'Remote & off-grid', sub: 'Cape York, the Simpson, weeks between towns', says: 'Proper adventure. We\'ll make sure water and power can go the distance.' },
      { value: 'work', label: 'Work vehicle', sub: 'Tools, gear and site storage', says: 'Easy. Heavy-duty slides and lockable drawers for your gear.' },
    ],
  },
  {
    id: 'sleep',
    title: 'Sleeping in the back?',
    help: 'Sleeping inside means a bed extension over the folded 2nd row.',
    options: [
      { value: 'no', label: 'Nah, tent or swag', sub: 'Drawers only, max storage', says: 'Too easy. You keep the back seats and all the space.' },
      { value: 'sometimes', label: 'Sometimes', sub: 'Slatted pull-out bed extension', says: 'Slats it is. Floor space by day, a bed when the weather turns.' },
      { value: 'yes', label: 'Most nights', sub: 'Fixed full-length bed', says: 'A proper fixed bed, flush with the drawer deck. No setup at 9pm in the rain.' },
    ],
  },
  {
    id: 'fridge',
    title: 'Which fridge?',
    help: 'The Wagon Base Kit has an upright fridge in its own cabinet over the pull-out table. Drawer and chest fridges change the layout. Already got a fridge? Tick the box below and we\'ll leave it off your quote.',
    options: [
      ...FRIDGES.map((f) => ({
        value: f.id,
        label: f.label,
        group: f.type === 'upright' ? 'Upright (front-opening)' : f.type === 'drawer' ? 'Drawer fridge' : 'Chest fridge on a drop slide',
        sub: f.type === 'upright' ? 'Opens like a home fridge, at waist height' : f.type === 'drawer' ? 'Built into the drawer system' : 'Lid on top, slides out the back',
        says:
          f.type === 'upright'
            ? 'Our favourite. Opens like the one at home, no lifting a lid or leaning over a slide.'
            : f.type === 'drawer'
              ? 'Sleek. Sits flush in the drawers, perfect for drinks and day trips. Less room for a big shop.'
              : 'Chest fridges are the most efficient, the cold stays in when you open the lid. Needs a drop slide.',
      })),
      { value: 'none', label: 'No fridge', group: 'None', sub: 'Drawers right across', says: 'Fair enough. More drawer space for you.' },
    ],
  },
  {
    id: 'features',
    title: 'Tick your features',
    help: 'The pull-out table and built-in compressor are part of the Wagon Base Kit. Untick them to save, or add a kitchen or water tank.',
    multi: true,
    options: FEATURES.map((f) => ({ value: f.id, label: f.label, sub: f.sub })),
  },
  {
    id: 'power',
    title: 'What do you want to run?',
    help: 'Our standard power pack runs phones, laptops and lights. Pick everything you\'d use and we\'ll tell you if you need more, and where you can save.',
    multi: true,
    options: DEVICES.map((d) => ({ value: d.id, label: d.label, sub: d.base ? 'Covered by the standard power pack' : d.ac ? '240V, may need a bigger setup' : '12V, may need a bigger setup' })),
  },
  {
    id: 'finish',
    title: 'Budget or bling?',
    help: 'All our kits use the same structural materials. Finish level is what changes.',
    options: [
      { value: 'budget', label: 'Keep it lean', sub: 'Natural birch fronts, carpet top', says: 'Smart. Spend on the slides and the structure, the rest is cosmetic.' },
      { value: 'balanced', label: 'The Bush Bound look', sub: 'Forest green fronts, carpet top', says: 'Our signature finish. Green fronts, exposed birch edges, grey marine carpet.' },
      { value: 'premium', label: 'Go all out', sub: 'Green fronts + black hex-top deck', says: 'Full send. Hex-top is near bulletproof for gear sliding around.' },
    ],
  },
  {
    id: 'build',
    title: 'Who\'s building it?',
    help: 'Every kit is CNC cut, labelled and pre-drilled with an install floor template. You choose how hands-on you get.',
    options: [
      { value: 'diy', label: 'Flat pack DIY', sub: 'Shipped to you, build it in a weekend', says: 'Legend. Everything\'s numbered and the floor template stops you drilling into anything you shouldn\'t.' },
      { value: 'assembled', label: 'We assemble it', sub: 'Arrives built, you bolt it in', says: 'Good call if your weekends are already booked.' },
      { value: 'installed', label: 'We build & install', sub: 'Drop the car at our Gold Coast workshop', says: 'Too easy. Drop it off, pick it up ready to go.' },
    ],
  },
  {
    id: 'electrical',
    title: 'How about the 12V?',
    help: 'Our power pack adds 12V and USB sockets, a 240V outlet and a battery monitor, sized to what you picked. Who\'s wiring it?',
    options: [
      { value: 'installed', label: 'Power pack, Bush Bound installs it', sub: 'At our Gold Coast workshop, electrician sign-off', says: 'Best option. It\'s wired, tested and signed off before you leave.' },
      { value: 'diy', label: 'Power pack, send me the parts', sub: 'Labelled parts, your auto electrician fits it', says: 'No worries. The cabinetry comes pre-cut for cable runs and mounts.' },
      { value: 'none', label: 'No power for now', sub: 'Cabinets only, cable runs cut for later', says: 'All good. We still cut the cable runs so you can add it later.' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Kits and pricing (PLACEHOLDERS: confirm before launch)
// ---------------------------------------------------------------------------

export const BASE_KIT = {
  name: 'Wagon Base Kit',
  tagline: 'Evenly split drawers, an upright fridge cabinet, pull-out table and built-in air compressor.',
  /** Includes the upright fridge cabinet and the inBase features */
  base: 4480,
};

export const PRICING = {
  /** Credit when there's no upright fridge cabinet (drawer fridge or no fridge) */
  fridgeCabinet: 450,
  /** Chest fridge drop slide instead of the cabinet */
  chestSlide: 450,
  sleepSlats: 590,
  sleepFixed: 790,
  finishMultiplier: { budget: 0.92, balanced: 1, premium: 1.15 },
  build: { diy: 0, assembled: 1450, installed: 2450 },
};

/** What the base kit's power system covers (PLACEHOLDER specs: confirm with Luke). */
export const BASE_POWER = { batteryAh: 100, inverterW: 1600 };

export const ELECTRICAL_PRICING = {
  basePower: 2600,
  batteryPer100Ah: 1300,
  solarPer100W: 300,
  inverterUpgrade: { 2000: 350, 3000: 950 } as Record<number, number>,
  install: 1800,
};

export const FINISH_LABELS: Record<string, string> = {
  budget: 'Natural birch fronts',
  balanced: 'Forest green fronts',
  premium: 'Green fronts + black hex-top deck',
};

export const BUILD_LABELS: Record<string, string> = {
  diy: 'Flat pack DIY (shipped)',
  assembled: 'Assembled by Bush Bound',
  installed: 'Built & installed on the Gold Coast',
};
