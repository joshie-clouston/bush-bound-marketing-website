// Flat pack kit builder data: vehicles, questions, devices, products and pricing.
//
// Everything a non-developer might want to tweak lives in this file.
// Vehicle measurements are approximate cargo dimensions used for the 3D preview only.
// The final design is always cut to the customer's floor template.
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
  | 'compressor'
  | 'coffee'
  | 'kettle'
  | 'ebike';

export interface Device {
  id: DeviceId;
  label: string;
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
  { id: 'phones', label: 'Phones & head torches', whPerDay: 25, watts: 20, ac: false },
  { id: 'lights', label: 'Camp lights', whPerDay: 40, watts: 30, ac: false },
  { id: 'laptop', label: 'Laptop', whPerDay: 150, watts: 100, ac: false, tip: 'Skip the inverter for laptops. A 100W USB-C outlet charges most of them straight off 12V with no conversion losses.' },
  { id: 'camera', label: 'Camera or drone batteries', whPerDay: 80, watts: 60, ac: false },
  { id: 'starlink', label: 'Starlink', whPerDay: 300, watts: 45, ac: false, tip: 'Starlink Mini runs off 12V and pulls around 25 to 40W. Leave it on all day and it\'s your biggest load after the fridge, so we size the battery for it.' },
  { id: 'cpap', label: 'CPAP machine', whPerDay: 300, watts: 60, ac: false, tip: 'Run your CPAP off a 12V DC converter, not the inverter. It roughly halves the draw. Turning the humidifier off saves even more.' },
  { id: 'compressor', label: 'Tyre compressor', whPerDay: 30, watts: 450, ac: false, tip: 'Compressors pull 30A+ for a few minutes. We run a heavy-gauge Anderson plug at the back so it doesn\'t cook your accessory socket.' },
  { id: 'coffee', label: 'Coffee machine', whPerDay: 120, watts: 1400, ac: true, tip: 'Real talk: a 240V coffee machine pulls about 1,400W. That means a 2,000W inverter, a 200Ah+ battery and heavier cabling, easily $2k+ extra for a flat white. An AeroPress or stovetop on the gas makes a ripper coffee for under $80 and uses zero amps.', link: { label: 'Check out the AeroPress', href: 'https://aeropress.com/' } },
  { id: 'kettle', label: 'Kettle or induction cooktop', whPerDay: 500, watts: 2200, ac: true, tip: 'Electric kettles and induction cooktops are the hungriest thing you can run off-grid (2,000W+). A butane stove or Jetboil does the same job for a fraction of the cost and weight.' },
  { id: 'ebike', label: 'E-bike or power tool charging', whPerDay: 500, watts: 250, ac: true, tip: 'E-bike batteries are big (500Wh+). Charge them while you drive through the DC-DC and your house battery stays topped up for the fridge.' },
];

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export interface QuestionOption {
  value: string;
  label: string;
  sub?: string;
  /** Short reaction from the Bush Bound team once this is picked */
  says?: string;
}

export interface Question {
  id: 'vehicle' | 'use' | 'sleep' | 'fridge' | 'kitchen' | 'water' | 'power' | 'finish' | 'build' | 'electrical';
  title: string;
  help: string;
  multi?: boolean;
  options: QuestionOption[];
}

export const QUESTIONS: Question[] = [
  {
    id: 'vehicle',
    title: 'What are you driving?',
    help: 'Every kit is cut for your exact wagon. Pick the closest one and we confirm the rest with our floor template.',
    options: VEHICLES.map((v) => ({ value: v.id, label: v.short === 'your wagon' ? 'Something else' : v.short, sub: v.make === 'Other' ? 'We\'ll measure it up' : v.label })),
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
    help: 'Sleeping inside means a platform over the folded 2nd row. It changes drawer height and headroom.',
    options: [
      { value: 'no', label: 'Nah, tent or swag', sub: 'Drawers only, max storage', says: 'Too easy. You keep the back seats and all the space.' },
      { value: 'sometimes', label: 'Sometimes', sub: 'Removable infill panels', says: 'Removable infills it is. Floor space by day, a bed when the weather turns.' },
      { value: 'yes', label: 'Most nights', sub: 'Fixed full-length bed', says: 'A proper fixed bed, flush with the drawer deck. No setup at 9pm in the rain.' },
    ],
  },
  {
    id: 'fridge',
    title: 'Running a fridge?',
    help: 'A fridge on a drop-down slide is the most-used part of any fit-out. Size matters for layout.',
    options: [
      { value: 'none', label: 'No fridge', sub: 'Esky or nothing', says: 'Fair enough. More drawer space for you.' },
      { value: 'small', label: '40 to 50L', sub: 'Weekends, a couple', says: 'Good size for most wagons. Leaves room for a decent drawer beside it.' },
      { value: 'large', label: '60L+ or dual zone', sub: 'Long trips, families', says: 'Big fridge, big trips. We\'ll give it a heavy-duty slide.' },
    ],
  },
  {
    id: 'kitchen',
    title: 'Slide-out kitchen?',
    help: 'A drawer that slides out the back with a cooktop and prep space. Cook dinner standing up, out of the wind.',
    options: [
      { value: 'yes', label: 'Yes please', sub: 'Stove + prep bench drawer', says: 'Best upgrade there is. Dinner\'s on in two minutes.' },
      { value: 'no', label: 'No thanks', sub: 'I\'ll use a camp table', says: 'Keeps the cost down and gives you another storage drawer.' },
    ],
  },
  {
    id: 'water',
    title: 'How do you carry water?',
    help: 'Water is heavy (1kg a litre). Where it sits affects handling and payload.',
    options: [
      { value: 'none', label: 'Bottles are fine', sub: 'Short trips', says: 'Easy. We can always add a tank later.' },
      { value: 'jerry', label: 'Jerry cans', sub: 'Cheap and flexible', says: 'Jerries are hard to beat for flexibility. We\'ll leave room for them.' },
      { value: 'tank', label: 'Built-in tank', sub: 'Slimline tank under the drawers', says: 'Under-drawer tank keeps the weight low and centred, best place for it.' },
    ],
  },
  {
    id: 'power',
    title: 'What do you want to run?',
    help: 'Pick everything you\'d like to power. We\'ll size the battery and solar, and tell you where you can save.',
    multi: true,
    options: DEVICES.map((d) => ({ value: d.id, label: d.label, sub: d.ac ? '240V' : '12V / USB' })),
  },
  {
    id: 'finish',
    title: 'Budget or bling?',
    help: 'All our kits use the same structural materials. Finish level is what changes.',
    options: [
      { value: 'budget', label: 'Keep it lean', sub: 'Clear-sealed birch ply', says: 'Smart. Spend on the slides and the structure, the rest is cosmetic.' },
      { value: 'balanced', label: 'Best value', sub: 'Hand-lacquered birch ply', says: 'Our most popular finish. Looks great and wipes clean.' },
      { value: 'premium', label: 'Go all out', sub: 'Black hex-top + side cabinets', says: 'Full send. Hard-wearing hex-top surfaces and extra side storage.' },
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
    help: 'Based on what you picked, we\'ll recommend a system. Our electrician can install it, or we send the parts list.',
    options: [
      { value: 'installed', label: 'Bush Bound installs it', sub: 'Qualified electrician sign-off', says: 'Best option. It\'s wired, tested and signed off before you leave.' },
      { value: 'diy', label: 'Send me the parts', sub: 'Our recommended kit, you fit it', says: 'No worries. The cabinetry comes pre-cut for cable runs and mounts.' },
      { value: 'none', label: 'Skip it for now', sub: 'Add power later', says: 'All good. We still cut the cable runs so you can add it later.' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Kits and pricing (PLACEHOLDERS: confirm before launch)
// ---------------------------------------------------------------------------

export type KitTier = 'essentials' | 'touring' | 'expedition';

export const KITS: Record<KitTier, { name: string; tagline: string; base: number }> = {
  essentials: { name: 'Essentials Kit', tagline: 'Drawers and a flat deck. Get your gear sorted.', base: 2450 },
  touring: { name: 'Touring Kit', tagline: 'Fridge slide or kitchen drawer for proper trips.', base: 3450 },
  expedition: { name: 'Expedition Kit', tagline: 'Fridge, kitchen, water and power. Built to live out of.', base: 4950 },
};

export const PRICING = {
  sleepInfill: 590,
  sleepFixed: 790,
  sideCabinets: 890,
  waterTank: 690,
  finishMultiplier: { budget: 0.9, balanced: 1, premium: 1.2 },
  build: { diy: 0, assembled: 1450, installed: 2450 },
};

export const ELECTRICAL_PRICING = {
  batteryKit: { 100: 2200, 200: 3600, 300: 5200, 400: 6600 } as Record<number, number>,
  solarPer100W: 300,
  inverter: { 1600: 900, 2000: 1200, 3000: 1800 } as Record<number, number>,
  install: 1800,
  installInverter: 400,
};

export const FINISH_LABELS: Record<string, string> = {
  budget: 'Clear-sealed birch ply',
  balanced: 'Hand-lacquered birch ply',
  premium: 'Black hex-top with lacquered birch',
};

export const BUILD_LABELS: Record<string, string> = {
  diy: 'Flat pack DIY (shipped)',
  assembled: 'Assembled by Bush Bound',
  installed: 'Built & installed on the Gold Coast',
};
