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

1. **Questionnaire** with 10 steps: vehicle, trip type, sleeping, fridge, kitchen, water, what you want to power, finish, who builds it, 12V install.
2. **Live 3D preview of the Wagon Base Kit**, modelled on our 80 Series base layout:
   - big drawer on the left, with the Bush Bound badge
   - fridge tower (drop slide) over a second drawer and the air compressor door on the right
   - 12V/USB sockets and a 240V outlet on the left panel; battery monitor, switch and air coupler on the right
   - grey carpet tops

   Answers then change the model: kitchen drawer, slatted bed extension or fixed bed + mattress, under-drawer tank, no-fridge (the tower becomes a full-height drawer), finish (birch, forest green, or green with hex-top), and roof solar if needed. "Open drawers" slides it all out. It's lazy-loaded and falls back cleanly without WebGL.
3. **Expert advice built in.** A "Bush Bound says" reaction to each answer, device tips (coffee machine → AeroPress, CPAP on DC), and layout heads-ups (single bed beside the fridge tower, headroom, tank size, remote water planning).
4. **Power, base kit first.** The base kit covers phones, laptops, lights and the compressor. It only recommends upgrades (bigger battery, solar, bigger inverter) when what the customer picks needs them, and says so when it doesn't.
5. **Recommendation + indicative price.** Wagon Base Kit + add-ons, finish, build service and electrical.
6. **"Lock in your kit" form.** No payment yet. Saves to D1 (`quotes`, `vehicle_type = 'flatpack-kit'`, `status = 'kit-request'`), creates a Notion lead (Type = "Flatpack Kit"), emails Luke a summary and the customer a confirmation.

Everything you'd want to edit (vehicles, questions, copy, devices, base power spec, prices) is in `src/data/kit-builder.ts`. The server rebuilds the recommendation from the answers, so it never trusts prices sent from the browser.

## Before launch: must do

- [ ] **Set real prices.** `BASE_KIT`, `PRICING` and `ELECTRICAL_PRICING` are placeholders.
- [ ] **Confirm the base power spec** (`BASE_POWER`: battery Ah and inverter W). It decides when an upgrade gets recommended.
- [ ] **Sanity-check vehicle sizes** in `VEHICLES`. They're rough and only set the preview's proportions.
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
