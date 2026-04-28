# Quote form: postcode / suburb lookup

**Date:** 2026-04-28
**Status:** Approved
**Owner:** Josh

## Goal

Capture every quote lead's location (suburb, state, postcode) so Luke knows where customers are coming from — local Gold Coast, interstate, or unservicable.

## Decisions

- **Data source:** Static AU postcode dataset (matthewproctor/australian_postcodes, MIT). Stripped to `{ postcode, suburb, state }` and shipped as a static JSON asset. No third-party API, no key, no rate limits, no runtime failure modes.
- **Form placement:** Step 3 (final details), not step 1. By step 3 the customer has invested 2 minutes — sunk-cost commitment minimises drop-off from one extra required field.
- **Required:** Yes. Won't submit unless a valid suggestion is selected.
- **UI pattern:** Vanilla TS combobox with type-ahead. No new library.
- **Storage:** Three separate D1 columns (`suburb`, `state`, `postcode`) — not one combined string — so future analytics can filter by state or postcode range.

## User flow

1. On step 3 of the quote form, user sees a new field labelled "Postcode / suburb *" above the existing "Anything specific" textarea.
2. User types either a postcode (digits) or suburb name (letters).
3. A dropdown shows matching `Suburb, STATE postcode` options filtered by prefix (postcode prefix or suburb prefix depending on first character).
4. User clicks or keyboard-selects (↑ ↓ Enter) one option. Input fills with the canonical string e.g. `Burleigh Heads, QLD 4220`.
5. Hidden inputs `suburb`, `state`, `postcode` are populated.
6. If the user tries to submit without selecting a valid suggestion (e.g. typed free text), client-side validation blocks submit and shows an inline error.
7. On submit, the three values are sent to `/api/quote` with the rest of the step 3 payload.

## Data flow

```
Browser
  └─ first focus on postcode field
       └─ fetch /data/au-postcodes.json (lazy, cached)
  └─ user types → in-memory filter → render top N matches
  └─ select → populate visible input + 3 hidden inputs
  └─ submit → POST /api/quote with { suburb, state, postcode, ... }

API route (/api/quote, step 3)
  └─ validate postcode (/^\d{4}$/) and state (enum: NSW|VIC|QLD|WA|SA|TAS|ACT|NT)
  └─ reject 400 if missing or invalid
  └─ UPDATE quotes SET ..., suburb=?, state=?, postcode=?, status='complete'
  └─ Send Resend staff notification with "Location: Burleigh Heads, QLD 4220" near top
```

## Components

### 1. Postcode dataset (`public/data/au-postcodes.json`)

- Source: matthewproctor/australian_postcodes
- Strip to `{ postcode: string, suburb: string, state: string }[]`
- Deduplicate (some entries duplicate across delivery types)
- ~80KB gzipped after stripping
- Generation: one-off script committed at `scripts/build-postcodes.ts`, run manually to refresh. Output committed.

### 2. Postcode combobox (inline in `src/pages/quote.astro`)

Embedded directly in the quote page script (not a separate component) since it's only used here. Behaviour:

- Lazy-fetch dataset on first focus of the input
- Filter logic: if first char is digit → match postcodes by `startsWith`; else → match suburbs by case-insensitive `startsWith`
- Show max 8 results
- Keyboard nav: ↑ ↓ moves highlight, Enter selects, Esc closes
- Click outside closes dropdown
- Selecting fills `#postcode-input` (visible) and `#suburb`, `#state`, `#postcode` (hidden)
- Validation: if `#postcode` hidden value is empty when user clicks Submit, prevent default and surface an inline error message under the field

### 3. D1 schema migration (`drizzle/migrations/0002_location.sql`)

```sql
ALTER TABLE quotes ADD COLUMN suburb TEXT;
ALTER TABLE quotes ADD COLUMN state TEXT;
ALTER TABLE quotes ADD COLUMN postcode TEXT;
```

Apply with `wrangler d1 migrations apply bushbound-db --remote` and `--local`.

### 4. API route (`src/pages/api/quote.ts`)

Step 3 handler changes:

- Read `suburb`, `state`, `postcode` from body
- Validate `postcode` matches `/^\d{4}$/` and `state` ∈ the 8 AU codes
- Return `400 { error: 'Invalid location' }` if either fails
- Add the three values to the existing `UPDATE quotes ...` SQL
- Pass a new `Location` row into `staffNotificationHtml` between `Email` and `Vehicle`: `['Location', \`${suburb}, ${state} ${postcode}\`]`

Legacy fallback path: thread the same three columns through the legacy `INSERT` so it doesn't break (use `null` if absent).

## Error handling

| Scenario | Behaviour |
|---|---|
| Dataset fetch fails | Field remains usable as plain text input but submit is blocked with "Couldn't load suburb list — please refresh and try again" |
| User types free text and tries to submit | Inline error: "Please select a suburb from the list" |
| API returns 400 (invalid location) | Existing error message UI shows |
| Migration not applied in prod | Step 3 submissions error out (acceptable: deploy migration before deploying form) |

## Out of scope

- Distance-from-Gold-Coast calculation (can be added later from postcode lat/long)
- Suburb-based pricing tiers
- International addresses (this is an AU-only business)
- Auto-detecting location from IP

## Test plan

- [ ] Type `4220` → see Burleigh Heads, Burleigh Waters, Miami appear
- [ ] Type `burl` → see Burleigh Heads, Burleigh Waters appear
- [ ] Keyboard nav (↑ ↓ Enter) selects correctly
- [ ] Click outside closes dropdown
- [ ] Submit without selecting → inline error, no API call
- [ ] Submit with valid selection → DB row has suburb/state/postcode populated
- [ ] Staff email shows the Location row in the right position
- [ ] Mobile: numeric keypad appears when typing digits first
- [ ] Page weight increase from lazy-loaded dataset is < 100KB gzipped
- [ ] Existing quote flow (no regression on steps 1, 2)
