// SERVER ONLY. Kit builder pricing.
//
// Never import this from a page <script>, a component or anything else that ships to the
// browser: the whole point is that competitors can't read our prices out of the site's
// JavaScript. Customers only ever see a price bracket (see BRACKETS), returned by
// /api/kit-estimate. Exact figures only go to the staff email.
//
// ALL FIGURES ARE PLACEHOLDERS: confirm with Luke before launch.

import { getFridge, type FridgeId, type StorageId, type FinishId } from '@/data/kit-builder';
import { carpetOn, chestOnSlide, storage, wants12, wants240, wantsPower, type KitAnswers } from '@/lib/kit-builder/engine';

const PRICES = {
  baseKit: 3950, // drawers + upright fridge cabinet, black honeycomb
  fridgeCabinet: 450, // credit when there's no upright cabinet
  chestSlide: 450,
  chestFixedBase: 150,
  storage: { bed: 690, pullout: 450, cubby: 390 } as Record<StorageId, number>, // cabinetry only
  mattress: 390, // folding mattress for the sliding bed (placeholder)
  campTable: 290, // Bush Bound folding table for the cubby (placeholder)
  finish: { hex: 0, green: 350, timber: 450 } as Record<FinishId, number>,
  carpet: 390,
  build: { diy: 0, assembled: 1450, installed: 2450 },
  fridges: {
    'upright-65': 1490,
    'upright-85': 1790,
    'drawer-30': 1190,
  } as Record<FridgeId, number>,
  power12: 2200, // battery, DC-DC, 12V/USB sockets, monitor
  power240: 900, // inverter + outlet (needs the battery side of power12)
  electricalBuild: { diy: 0, assembled: 600, installed: 1800 },
};

export const BRACKETS = [
  { max: 5000, label: 'Under $5k' },
  { max: 10000, label: '$5k to $10k' },
  { max: 15000, label: '$10k to $15k' },
  { max: 30000, label: '$15k to $30k' },
  { max: 50000, label: '$30k to $50k' },
  { max: Infinity, label: '$50k+' },
];

export interface PricedLine {
  label: string;
  amount: number;
}

/** Exact internal quote. Staff email only. */
export function priceKit(answers: KitAnswers): { lines: PricedLine[]; total: number } {
    const fridge = getFridge(answers.fridge);
  const store = storage(answers);
  const lines: PricedLine[] = [{ label: 'Wagon Base Kit', amount: PRICES.baseKit }];

  if (fridge?.type === 'chest') {
    lines.push(chestOnSlide(answers)
      ? { label: 'Chest fridge slide (instead of cabinet)', amount: PRICES.chestSlide - PRICES.fridgeCabinet }
      : { label: 'Fixed chest fridge base (instead of cabinet)', amount: PRICES.chestFixedBase - PRICES.fridgeCabinet });
  }
  if (fridge?.type === 'drawer') lines.push({ label: 'Drawer fridge column (no cabinet)', amount: -PRICES.fridgeCabinet });
  if (!fridge) lines.push({ label: 'No fridge cabinet', amount: -PRICES.fridgeCabinet });
  const names: Record<StorageId, string> = { bed: 'Sliding bed', pullout: 'Pull-out table', cubby: 'Foldable table storage' };
  for (const id of store) lines.push({ label: names[id], amount: PRICES.storage[id] });
  if (store.has('bed') && !answers.ownBedding) lines.push({ label: 'Folding mattress', amount: PRICES.mattress });
  if (store.has('cubby') && !answers.ownTable) lines.push({ label: 'Bush Bound folding table', amount: PRICES.campTable });
  const finish = answers.finish ?? 'hex';
  if (PRICES.finish[finish]) lines.push({ label: `Finish: ${finish}`, amount: PRICES.finish[finish] });
  if (carpetOn(answers)) lines.push({ label: 'Carpet-lined tops', amount: PRICES.carpet });
  const build = answers.build ?? 'diy';
  if (PRICES.build[build]) lines.push({ label: `Cabinetry: ${build}`, amount: PRICES.build[build] });
  if (fridge && !answers.ownFridge) lines.push({ label: fridge.label, amount: PRICES.fridges[fridge.id] });
  if (wants12(answers) || wants240(answers)) lines.push({ label: '12V system (battery, charging, sockets, monitor)', amount: PRICES.power12 });
  if (wants240(answers)) lines.push({ label: 'Inverter + 240V outlet', amount: PRICES.power240 });
  if (wantsPower(answers)) {
    const eb = answers.electricalBuild ?? 'diy';
    if (PRICES.electricalBuild[eb]) lines.push({ label: `Electrical: ${eb}`, amount: PRICES.electricalBuild[eb] });
  }

  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}

/** The only pricing information that leaves the server for customers. */
export function priceBracket(answers: KitAnswers): string {
  const { total } = priceKit(answers);
  return BRACKETS.find((b) => total < b.max)!.label;
}
