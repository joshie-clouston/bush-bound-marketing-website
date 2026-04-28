// One-off script to fetch the AU postcode dataset and strip it
// down to { postcode, suburb, state } for use in the quote form.
//
// Source: https://github.com/matthewproctor/australian_postcodes (MIT)
// Run: npx tsx scripts/build-postcodes.ts

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_URL = 'https://raw.githubusercontent.com/matthewproctor/australianpostcodes/master/australian_postcodes.json';
const OUTPUT_PATH = join(process.cwd(), 'public', 'data', 'au-postcodes.json');

type SourceEntry = {
  postcode: string;
  locality: string;
  state: string;
  type?: string;
  status?: string;
};

type OutputEntry = {
  postcode: string;
  suburb: string;
  state: string;
};

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s|-)/g)
    .map((part) => {
      if (/^[\s-]$/.test(part) || part.length === 0) return part;
      // Mc / Mac prefix: capitalise the letter after as well
      if (/^mc[a-z]/.test(part)) return 'Mc' + part[2].toUpperCase() + part.slice(3);
      if (/^mac[a-z]{2,}/.test(part)) return 'Mac' + part[3].toUpperCase() + part.slice(4);
      return part[0].toUpperCase() + part.slice(1);
    })
    .join('');
}

async function main() {
  console.log(`Fetching ${SOURCE_URL}...`);
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = (await res.json()) as SourceEntry[];
  console.log(`Got ${raw.length} raw entries`);

  // Drop PO boxes and LVR entries, keep delivery areas only
  const filtered = raw.filter((e) => {
    if (!e.postcode || !e.locality || !e.state) return false;
    if (e.type && ['Post Office Boxes', 'LVR'].includes(e.type)) return false;
    return true;
  });

  // Dedupe by `${suburb}|${state}|${postcode}`, normalise suburb to Title Case
  const seen = new Set<string>();
  const out: OutputEntry[] = [];
  for (const e of filtered) {
    const suburb = toTitleCase(e.locality);
    const key = `${suburb}|${e.state}|${e.postcode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ postcode: e.postcode, suburb, state: e.state });
  }

  // Sort by postcode then suburb for deterministic output
  out.sort((a, b) =>
    a.postcode === b.postcode ? a.suburb.localeCompare(b.suburb) : a.postcode.localeCompare(b.postcode)
  );

  console.log(`Writing ${out.length} entries to ${OUTPUT_PATH}`);
  mkdirSync(join(process.cwd(), 'public', 'data'), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(out));
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
