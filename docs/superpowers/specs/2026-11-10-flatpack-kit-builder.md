# Flat pack kit builder: assessment and MVP

**Date:** 2026-11-10
**Page:** `/build-your-kit`

## The opportunity

Wagons (80, 100, 200, 300 Series, Prados, Patrols, Everest, MU-X) are most of our fit-out work. A flat pack DIY kit opens that up to people who can't get to the Gold Coast or don't want to pay for workshop labour. Our build and install service and our 12V work become add-ons.

Why people pay for a kit instead of doing it from scratch:

- **Design.** Weeks of measuring and sketching, and they still get it wrong. We design it in 3D.
- **Cutting.** A panel saw or circular saw gives rough edges and joins that don't line up. Ours are CNC cut, numbered and pre-drilled.
- **Materials.** Picking ply, slides and hardware is guesswork for them. Ours are already dialled in.
- **Floor mounting.** Drilling the floor blind risks fuel tanks, brake lines and wiring. Our vehicle-specific floor template takes the risk out. This is the strongest point and should be front and centre in marketing.

## Design IP: what we never expose

**Decision:** nothing customer-facing exposes our Fusion files or lets someone reverse engineer a Bush Bound design.

- The 3D preview is a **stylised look-alike** built from simple boxes in the browser: green fronts, birch edges, finger-pull notches, paddle latches, carpet tops, a fridge tower, side panels with fittings. It's generated from rounded, approximate proportions (`src/lib/kit-builder/engine.ts`), **not** from Fusion. No CAD, STEP, GLTF or STL file is loaded or served, and there's no export button.
- Customer-facing copy never states panel, drawer or cut dimensions. It describes what's in the layout and why.
- Nothing Fusion-related goes in the order flow. The staff email is a plain summary of the customer's answers and add-ons. Luke designs from that in Fusion as normal.
- `engine.ts` ships to the browser, so it must never contain real CAD dimensions, joinery or cut lists. There's a warning at the top of the file.

## What this PR ships (MVP)

1. **Questionnaire**, 10 steps: vehicle, **boot measurements**, trip type, sleeping, **fridge**, **features**, what you want to power, finish, who builds it, 12V install.
2. **Measurements.** Boot width, width between the wheel arches (defaults to 1,200mm), depth from the start of the boot to the rear seats, and boot height. They're prefilled with typical numbers for the chosen vehicle. The model resizes as they type, and the four measurements are drawn on it as labelled dimension lines (with a "Hide sizes" toggle). Only the customer's own measurements appear, never our cabinet dimensions.
3. **Even split.** The space between the arches is divided into equal columns: two, or three on wide boots (1,500mm+ between the arches).
4. **Fridge choice**, grouped by type:
   - **Upright** 50/65/85L: front-opening, in its own cabinet over the pull-out table, like our 80 Series base build. The door swings open in the preview.
   - **Drawer fridge** 30/50L: built into the right-hand column.
   - **Chest fridge** 40/60/75L: on a drop slide in the right-hand column.
   - **No fridge.**

   Sizes, power draw and prices are **guesses**: swap in the exact models in `FRIDGES`.
5. **Features (tick boxes):** pull-out table and air compressor (ticked by default, matching the base build), kitchen slide-out, water tank. With an upright fridge, the table lives in the cabinet under it, next to the compressor hatch. Otherwise it's a slim slide under the first column's top.
6. **Live 3D preview** in the Bush Bound look: green fronts with birch edges, finger-pull notches, paddle latches, carpet tops, side panels with 12V/USB/240V sockets, monitor, switch and air coupler (when the side panels are wide enough), plus bed slats or a fixed bed, tank and solar.
7. **Expert advice**: device tips, fridge fit warnings (too wide for an even split, too tall for the boot), single-bed-beside-the-fridge, headroom, tank size, remote water planning.
8. **Power, base kit first**: only recommends upgrades when the picked fridge and devices need them.
9. **Recommendation + indicative price**, including the fridge as an optional "we can supply" line.
10. **"Lock in your kit" form**: D1 (`quotes`), Notion lead, staff summary email (includes the customer's measurements) and customer confirmation.

Everything you'd want to edit is in `src/data/kit-builder.ts`. The server rebuilds the recommendation from the answers, so it never trusts prices sent from the browser.

## Before launch: must do

- [ ] **Set real prices.** `BASE_KIT`, `PRICING` and `ELECTRICAL_PRICING` are placeholders.
- [ ] **Confirm the base power spec** (`BASE_POWER`: battery Ah and inverter W). It decides when an upgrade gets recommended.
- [ ] **Send the exact fridge models** to replace the guessed `FRIDGES` list (sizes, Wh/day, prices).
- [ ] **Sanity-check the typical vehicle sizes** in `VEHICLES` used to prefill the measurements step.
- [ ] **Add a "Flatpack Kit" option** to the Notion Type select if the integration can't create it.
- [ ] **Decide on lead times** for the success screen and emails (currently "within 48 hours").

## Next phases

**Phase 2: real checkout**
- Stripe Checkout for a deposit (say $500, or 30%) at "Lock in", with the balance invoiced when the design is approved. Stripe Checkout and webhooks work fine on Cloudflare Workers using `fetch`, no Node SDK needed.
- A dedicated `kit_orders` table (answers JSON, recommendation JSON, Stripe session or payment IDs, status: `requested → deposit_paid → design_sent → approved → cutting → shipped`). **This needs a numbered migration and `db:migrate:remote` before push**, per CLAUDE.md.
- Freight quote by postcode (flat rate by zone to start).

**Phase 3: AI advisor**
- A "talk it through" chat on the page using Claude through a Worker endpoint. It would use the same engine as a tool (it can set answers and the model updates live) and our FAQ and product data as context. Customers ask things like "will a 75L fridge fit beside drawers in my GU?" in plain English.
- Photo upload of the cargo area (R2 storage) so the AI and Luke can spot aftermarket gear, cargo barriers or a dual battery already fitted.

**Phase 4: more kits and upsells**
- Recommended product links (AeroPress, Bushman fridges, Victron) with affiliate tracking or sold as add-ons.
- Utes and canopies, Troopy, vans.

## Known gaps

- The local D1 has drifted from production (no `status`, `wishlist` or `budget` columns locally), so quote and kit submissions log a D1 error in `npm run dev`. That's not new. Production has those columns. A baseline migration to bring the migration history in line with prod would fix local dev.
- The preview is deliberately indicative: simple boxes, no joinery, not to scale. The copy says so.
