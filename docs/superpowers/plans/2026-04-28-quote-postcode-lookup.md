# Quote Postcode/Suburb Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a required postcode + suburb autocomplete field to step 3 of the quote form, persist suburb/state/postcode to D1, and surface location in Luke's notification email.

**Architecture:** Static AU postcode dataset (matthewproctor/australian_postcodes) bundled as `/public/data/au-postcodes.json`. Vanilla TS combobox in step 3 of `quote.astro` lazy-loads the dataset on first focus. Three new D1 columns. API route validates and persists. Resend staff email shows a Location row.

**Tech Stack:** Astro 5, Cloudflare Workers + D1, Resend, vanilla TypeScript (no new runtime deps).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `scripts/build-postcodes.ts` | Create | One-off script to download + strip the AU postcode dataset to `public/data/au-postcodes.json` |
| `public/data/au-postcodes.json` | Create | The bundled dataset (committed) |
| `drizzle/migrations/0002_location.sql` | Create | D1 migration adding `suburb`, `state`, `postcode` columns to `quotes` |
| `package.json` | Modify | Add migration to `db:migrate:local` and `db:migrate:remote` scripts; add `db:build-postcodes` script |
| `src/pages/api/quote.ts` | Modify | Validate location, persist to D1, add Location row to staff email |
| `src/pages/quote.astro` | Modify | Add postcode field markup + combobox JS to step 3 |

---

## Task 1: Generate the AU postcode dataset

**Files:**
- Create: `scripts/build-postcodes.ts`
- Create: `public/data/au-postcodes.json`
- Modify: `package.json`

The matthewproctor dataset includes ~18k entries with delivery type variants and PO boxes. We strip to `{ postcode, suburb, state }`, drop PO boxes, dedupe, and sort.

- [ ] **Step 1: Create the build script**

Create `scripts/build-postcodes.ts`:

```typescript
// One-off script to fetch the AU postcode dataset and strip it
// down to { postcode, suburb, state } for use in the quote form.
//
// Source: https://github.com/matthewproctor/australian_postcodes (MIT)
// Run: npx tsx scripts/build-postcodes.ts

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_URL = 'https://raw.githubusercontent.com/matthewproctor/australian_postcodes/master/australian_postcodes.json';
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
    const suburb = e.locality
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
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
```

- [ ] **Step 2: Add the npm script and run it**

Edit `package.json` — add to `scripts`:

```json
"db:build-postcodes": "npx tsx scripts/build-postcodes.ts"
```

Run:

```bash
npm run db:build-postcodes
```

Expected output (numbers may vary):
```
Fetching https://raw.githubusercontent.com/matthewproctor/australian_postcodes/master/australian_postcodes.json...
Got 18000 raw entries
Writing 16000 entries to /.../public/data/au-postcodes.json
Done.
```

- [ ] **Step 3: Verify the output**

```bash
ls -lh public/data/au-postcodes.json
node -e "const d = require('./public/data/au-postcodes.json'); console.log('count:', d.length); console.log('sample:', d.find(e => e.postcode === '4220'));"
```

Expected:
- File exists, ~600KB-1MB
- Count > 10,000
- Sample shows entries for postcode 4220 (e.g. `{ postcode: '4220', suburb: 'Burleigh Heads', state: 'QLD' }`)

- [ ] **Step 4: Commit**

```bash
git add scripts/build-postcodes.ts public/data/au-postcodes.json package.json
git commit -m "Add AU postcode dataset for quote form lookup"
```

---

## Task 2: D1 migration for location columns

**Files:**
- Create: `drizzle/migrations/0002_location.sql`
- Modify: `package.json`

- [ ] **Step 1: Create the migration**

Create `drizzle/migrations/0002_location.sql`:

```sql
ALTER TABLE quotes ADD COLUMN suburb TEXT;
ALTER TABLE quotes ADD COLUMN state TEXT;
ALTER TABLE quotes ADD COLUMN postcode TEXT;
```

- [ ] **Step 2: Update npm migration scripts**

Edit `package.json` — append the new migration to both `db:migrate:local` and `db:migrate:remote`:

```json
"db:migrate:local": "npx wrangler d1 execute bushbound-db --local --file=drizzle/migrations/0000_initial.sql && npx wrangler d1 execute bushbound-db --local --file=drizzle/migrations/0001_utm_tracking.sql && npx wrangler d1 execute bushbound-db --local --file=drizzle/migrations/0002_location.sql",
"db:migrate:remote": "npx wrangler d1 execute bushbound-db --remote --file=drizzle/migrations/0000_initial.sql && npx wrangler d1 execute bushbound-db --remote --file=drizzle/migrations/0001_utm_tracking.sql && npx wrangler d1 execute bushbound-db --remote --file=drizzle/migrations/0002_location.sql"
```

- [ ] **Step 3: Apply the migration locally**

```bash
npx wrangler d1 execute bushbound-db --local --file=drizzle/migrations/0002_location.sql
```

Expected: succeeds. (Earlier `ALTER TABLE`s in `0000`/`0001` may "fail" on a fresh apply because they ran already — that's why we run only the new file directly here.)

If the local DB doesn't exist yet, run `npm run db:migrate:local` first.

- [ ] **Step 4: Verify the schema**

```bash
npx wrangler d1 execute bushbound-db --local --command="PRAGMA table_info(quotes);"
```

Expected: output includes rows for `suburb`, `state`, `postcode` (all `TEXT`, nullable).

- [ ] **Step 5: Commit**

```bash
git add drizzle/migrations/0002_location.sql package.json
git commit -m "Add D1 migration for quote location columns"
```

---

## Task 3: API route validates and persists location

**Files:**
- Modify: `src/pages/api/quote.ts`

The step 3 handler currently reads `{ leadId, message, referral, name, email, phone, vehicle, serviceType, budget, timeline }`. We add `suburb`, `state`, `postcode`, validate them, persist them, and surface a Location row in the staff email.

- [ ] **Step 1: Add validation helper at the top of the file**

In `src/pages/api/quote.ts`, after the imports (after line 3), add:

```typescript
const AU_STATES = new Set(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']);

function validateLocation(body: Record<string, string>): { ok: true } | { ok: false; error: string } {
  const { suburb, state, postcode } = body;
  if (!suburb || !state || !postcode) return { ok: false, error: 'Location is required' };
  if (!/^\d{4}$/.test(postcode)) return { ok: false, error: 'Invalid postcode' };
  if (!AU_STATES.has(state)) return { ok: false, error: 'Invalid state' };
  return { ok: true };
}
```

- [ ] **Step 2: Wire validation into the step 3 handler**

In `src/pages/api/quote.ts`, find the step 3 block (currently starts at `if (step === '3')` near line 52). Replace the destructuring line:

```typescript
const { leadId, message, referral, name, email, phone, vehicle, serviceType, budget, timeline } = body;
```

with:

```typescript
const { leadId, message, referral, name, email, phone, vehicle, serviceType, budget, timeline, suburb, state, postcode } = body;

const locationCheck = validateLocation(body);
if (!locationCheck.ok) {
  return new Response(JSON.stringify({ error: locationCheck.error }), { status: 400, headers: { 'Content-Type': 'application/json' } });
}
```

- [ ] **Step 3: Persist the new columns**

In the same step 3 block, replace the existing UPDATE:

```typescript
await runtime.env.DB.prepare(
  `UPDATE quotes SET message = ?, referral = ?, status = 'complete' WHERE id = ?`
).bind(message || null, referral || null, parseInt(leadId)).run();
```

with:

```typescript
await runtime.env.DB.prepare(
  `UPDATE quotes SET message = ?, referral = ?, suburb = ?, state = ?, postcode = ?, status = 'complete' WHERE id = ?`
).bind(message || null, referral || null, suburb, state, postcode, parseInt(leadId)).run();
```

- [ ] **Step 4: Add Location row to the staff notification email**

In the same step 3 block, find the `staffNotificationHtml([...])` call (around lines 83-94). Add a new Location row right after the Email row:

```typescript
html: staffNotificationHtml([
  ['Name', name],
  ['Phone', phone || 'Not provided'],
  ['Email', email],
  ['Location', `${suburb}, ${state} ${postcode}`],
  ['Vehicle', vehicle || 'Not provided'],
  ['Budget', budget || 'Not specified'],
  ['Timeline', timeline || 'Not specified'],
  ['What they want', serviceType || 'Not specified'],
  ['Notes', message || 'None'],
  ['Heard about us via', referral || 'Not specified'],
  ['UTM', [utm_source, utm_medium, utm_campaign].filter(Boolean).join(' / ') || 'Direct'],
]),
```

- [ ] **Step 5: Thread location through the legacy fallback**

The legacy fallback path at the bottom of the file (after the `if (step === '3')` block, around lines 113-125) does an `INSERT` that doesn't reference the new columns. The `quotes` table allows nulls on those columns, so old payloads still work — but we should at least accept and store them if present.

Replace:

```typescript
const { name, email, phone, vehicleType, vehicleModel, serviceType, message, referral, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = body;
```

with:

```typescript
const { name, email, phone, vehicleType, vehicleModel, serviceType, message, referral, utm_source, utm_medium, utm_campaign, utm_term, utm_content, suburb: legacySuburb, state: legacyState, postcode: legacyPostcode } = body;
```

Then replace the INSERT:

```typescript
await runtime.env.DB.prepare(
  `INSERT INTO quotes (name, email, phone, vehicle_type, vehicle_model, service_type, message, referral, status, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'complete', ?, ?, ?, ?, ?, ?)`
).bind(name, email, phone || null, vehicleType || null, vehicleModel || null, serviceType || null, message || null, referral || null, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, Date.now()).run();
```

with:

```typescript
await runtime.env.DB.prepare(
  `INSERT INTO quotes (name, email, phone, vehicle_type, vehicle_model, service_type, message, referral, status, suburb, state, postcode, utm_source, utm_medium, utm_campaign, utm_term, utm_content, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'complete', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
).bind(name, email, phone || null, vehicleType || null, vehicleModel || null, serviceType || null, message || null, referral || null, legacySuburb || null, legacyState || null, legacyPostcode || null, utm_source || null, utm_medium || null, utm_campaign || null, utm_term || null, utm_content || null, Date.now()).run();
```

- [ ] **Step 6: Type-check and commit**

```bash
npx astro check
```

Expected: 0 errors. (Warnings about unrelated files are fine — focus on `src/pages/api/quote.ts`.)

```bash
git add src/pages/api/quote.ts
git commit -m "Validate and persist quote location (suburb/state/postcode)"
```

---

## Task 4: Add postcode field markup to step 3 of the quote form

**Files:**
- Modify: `src/pages/quote.astro`

We add the visible input + dropdown container + three hidden inputs (suburb, state, postcode) above the existing "Anything specific you want us to know?" textarea in step 3.

- [ ] **Step 1: Add the markup to step 3**

In `src/pages/quote.astro`, find the step 3 div (currently `<div id="step-3" class="hidden space-y-5">` around line 181). Insert this new field block immediately after the `<p class="text-xs ...">Step 3 of 3...</p>` line and before the existing `<div>` containing the message textarea:

```astro
              <div>
                <label for="postcode-input" class="block text-sm font-semibold text-charcoal mb-1.5">Postcode / suburb *</label>
                <div class="relative">
                  <input
                    type="text"
                    id="postcode-input"
                    autocomplete="off"
                    inputmode="text"
                    required
                    class="w-full px-4 py-3 rounded-md border border-stone-dark/20 bg-stone/30 text-charcoal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
                    placeholder="Type a postcode or suburb"
                  />
                  <ul
                    id="postcode-results"
                    class="hidden absolute z-10 left-0 right-0 mt-1 max-h-64 overflow-auto bg-white border border-stone-dark/20 rounded-md shadow-lg"
                  ></ul>
                </div>
                <p id="postcode-error" class="hidden mt-1.5 text-sm text-red-600">Please select a suburb from the list</p>
                <input type="hidden" id="suburb" name="suburb" />
                <input type="hidden" id="state" name="state" />
                <input type="hidden" id="postcode" name="postcode" />
              </div>
```

- [ ] **Step 2: Verify the markup compiles**

```bash
npx astro check
```

Expected: 0 errors.

- [ ] **Step 3: Visual smoke test in the dev server**

```bash
npm run dev
```

In a browser, navigate to `http://localhost:4321/quote`, click through to step 3. Confirm the new "Postcode / suburb *" field appears above the message textarea. The field is non-functional at this stage (no JS yet) — that's expected.

Stop the dev server (Ctrl+C).

- [ ] **Step 4: Commit**

```bash
git add src/pages/quote.astro
git commit -m "Add postcode field markup to quote step 3"
```

---

## Task 5: Combobox JavaScript for the postcode field

**Files:**
- Modify: `src/pages/quote.astro`

Vanilla TS combobox: lazy-fetches the dataset on first focus, filters on input, renders top 8 matches, supports keyboard nav, populates hidden fields on selection, blocks submit if no valid selection.

- [ ] **Step 1: Add the combobox script to the quote page**

In `src/pages/quote.astro`, find the closing `</script>` tag at the end of the existing script block (around line 491). Insert the following block immediately before that closing `</script>`:

```typescript
    // Postcode / suburb combobox
    type Postcode = { postcode: string; suburb: string; state: string };

    const postcodeInput = document.getElementById('postcode-input') as HTMLInputElement;
    const postcodeResults = document.getElementById('postcode-results') as HTMLUListElement;
    const postcodeError = document.getElementById('postcode-error') as HTMLParagraphElement;
    const suburbHidden = document.getElementById('suburb') as HTMLInputElement;
    const stateHidden = document.getElementById('state') as HTMLInputElement;
    const postcodeHidden = document.getElementById('postcode') as HTMLInputElement;

    let postcodeData: Postcode[] | null = null;
    let postcodeFetchPromise: Promise<Postcode[]> | null = null;
    let highlightedIndex = -1;
    let currentMatches: Postcode[] = [];

    async function loadPostcodes(): Promise<Postcode[]> {
      if (postcodeData) return postcodeData;
      if (postcodeFetchPromise) return postcodeFetchPromise;
      postcodeFetchPromise = fetch('/data/au-postcodes.json')
        .then((r) => {
          if (!r.ok) throw new Error('Failed to load postcodes');
          return r.json() as Promise<Postcode[]>;
        })
        .then((data) => {
          postcodeData = data;
          return data;
        });
      return postcodeFetchPromise;
    }

    function clearSelection() {
      suburbHidden.value = '';
      stateHidden.value = '';
      postcodeHidden.value = '';
    }

    function renderResults(matches: Postcode[]) {
      currentMatches = matches;
      highlightedIndex = -1;
      if (matches.length === 0) {
        postcodeResults.classList.add('hidden');
        postcodeResults.innerHTML = '';
        return;
      }
      postcodeResults.innerHTML = matches
        .map(
          (m, i) =>
            `<li data-index="${i}" class="px-4 py-2 cursor-pointer text-sm text-charcoal hover:bg-primary/10">${m.suburb}, ${m.state} ${m.postcode}</li>`
        )
        .join('');
      postcodeResults.classList.remove('hidden');
    }

    function filterMatches(query: string): Postcode[] {
      if (!postcodeData || query.length === 0) return [];
      const q = query.trim().toLowerCase();
      const isDigit = /^\d/.test(q);
      const filtered = postcodeData
        .filter((e) =>
          isDigit
            ? e.postcode.startsWith(q)
            : e.suburb.toLowerCase().startsWith(q)
        )
        .slice(0, 8);
      return filtered;
    }

    function selectMatch(match: Postcode) {
      postcodeInput.value = `${match.suburb}, ${match.state} ${match.postcode}`;
      suburbHidden.value = match.suburb;
      stateHidden.value = match.state;
      postcodeHidden.value = match.postcode;
      postcodeResults.classList.add('hidden');
      postcodeError.classList.add('hidden');
      highlightedIndex = -1;
    }

    function highlight(i: number) {
      const items = postcodeResults.querySelectorAll('li');
      items.forEach((el, idx) => {
        if (idx === i) el.classList.add('bg-primary/10');
        else el.classList.remove('bg-primary/10');
      });
      highlightedIndex = i;
      const target = items[i] as HTMLElement | undefined;
      target?.scrollIntoView({ block: 'nearest' });
    }

    postcodeInput?.addEventListener('focus', () => {
      loadPostcodes().catch(() => {
        postcodeError.textContent = "Couldn't load suburb list — please refresh and try again";
        postcodeError.classList.remove('hidden');
      });
    });

    postcodeInput?.addEventListener('input', async () => {
      clearSelection();
      postcodeError.classList.add('hidden');
      try {
        await loadPostcodes();
      } catch {
        return;
      }
      renderResults(filterMatches(postcodeInput.value));
    });

    postcodeInput?.addEventListener('keydown', (e) => {
      if (postcodeResults.classList.contains('hidden')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlight(Math.min(highlightedIndex + 1, currentMatches.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlight(Math.max(highlightedIndex - 1, 0));
      } else if (e.key === 'Enter') {
        if (highlightedIndex >= 0 && currentMatches[highlightedIndex]) {
          e.preventDefault();
          selectMatch(currentMatches[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        postcodeResults.classList.add('hidden');
      }
    });

    postcodeResults?.addEventListener('mousedown', (e) => {
      const li = (e.target as HTMLElement).closest('li');
      if (!li) return;
      const idx = parseInt(li.getAttribute('data-index') || '-1', 10);
      const match = currentMatches[idx];
      if (match) {
        e.preventDefault(); // keep focus
        selectMatch(match);
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target !== postcodeInput && !postcodeResults.contains(e.target as Node)) {
        postcodeResults.classList.add('hidden');
      }
    });
```

- [ ] **Step 2: Block submit if no valid selection**

In the same `src/pages/quote.astro` script block, find the submit handler (currently `form?.addEventListener('submit', async (e) => {` around line 403). Immediately after `e.preventDefault();` (the first line inside the handler), insert:

```typescript
      // Validate location selection
      if (!postcodeHidden.value || !suburbHidden.value || !stateHidden.value) {
        postcodeError.textContent = 'Please select a suburb from the list';
        postcodeError.classList.remove('hidden');
        postcodeInput.focus();
        return;
      }
```

- [ ] **Step 3: Include location in the submit payload**

In the same submit handler, find the `body: JSON.stringify({...})` block (around lines 429-442) inside the fetch. Add three new fields right after `referral`:

```typescript
            referral: formData.get('referral') || '',
            suburb: suburbHidden.value,
            state: stateHidden.value,
            postcode: postcodeHidden.value,
            ...utm,
```

- [ ] **Step 4: Type-check**

```bash
npx astro check
```

Expected: 0 errors.

- [ ] **Step 5: Manual end-to-end test in the dev server**

```bash
npm run dev
```

In a browser at `http://localhost:4321/quote`:

1. Fill out step 1 with valid name/email/phone/vehicle, click Next.
2. On step 2, pick a budget + timeline + a few features. Click Next.
3. On step 3, click into the postcode field. Type `4220` — confirm dropdown shows Burleigh Heads, Burleigh Waters, Miami.
4. Type `burl` — confirm dropdown shows Burleigh Heads, Burleigh Waters.
5. Use ↓ arrow to highlight, Enter to select. Confirm input fills with `Burleigh Heads, QLD 4220`.
6. Click outside the field — dropdown closes.
7. Try clicking Submit without selecting (clear the field first, type random text) — confirm inline error appears and form does NOT submit.
8. Re-select a valid suburb, then Submit. Confirm success screen.

- [ ] **Step 6: Confirm DB row has the location**

```bash
npx wrangler d1 execute bushbound-db --local --command="SELECT id, name, suburb, state, postcode FROM quotes ORDER BY id DESC LIMIT 1;"
```

Expected: most recent row shows the suburb/state/postcode values you just submitted.

Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/pages/quote.astro
git commit -m "Wire up postcode/suburb combobox with validation and submission"
```

---

## Task 6: Build check, deploy migration, deploy site

**Files:** none modified

- [ ] **Step 1: Full build check**

```bash
npm run build
```

Expected: completes with 0 errors. (Build = `wrangler types && astro check && astro build`.)

- [ ] **Step 2: Apply the migration to remote D1**

```bash
npx wrangler d1 execute bushbound-db --remote --file=drizzle/migrations/0002_location.sql
```

Expected: succeeds. Confirms with row count and bytes written.

- [ ] **Step 3: Verify remote schema**

```bash
npx wrangler d1 execute bushbound-db --remote --command="PRAGMA table_info(quotes);"
```

Expected: output includes `suburb`, `state`, `postcode` columns.

- [ ] **Step 4: Push to deploy via Cloudflare Git integration**

```bash
git push origin main
```

Cloudflare's native Git integration auto-deploys. Wait ~2 min, then confirm at https://bushbound.au/quote that step 3 has the new field.

- [ ] **Step 5: Production smoke test**

Submit a real test quote on production with your own contact details. Confirm:
- Form submits successfully
- Confirmation email arrives
- Luke's notification email shows the Location row
- Database row has suburb/state/postcode populated:
  ```bash
  npx wrangler d1 execute bushbound-db --remote --command="SELECT id, name, suburb, state, postcode, created_at FROM quotes ORDER BY id DESC LIMIT 1;"
  ```

---

## Done

The quote form now captures location (suburb + state + postcode) on every completed lead, validated against the canonical AU postcode dataset, surfaced in Luke's email notification, and stored as separate D1 columns ready for future analytics.
