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

## What this PR ships (MVP)

1. **Questionnaire** with 10 steps: vehicle, trip type, sleeping, fridge, kitchen, water, what you want to power, finish, who builds it, 12V install.
2. **Live 3D preview** (three.js). Every answer that changes the layout updates the model straight away: drawers, fridge slide, kitchen drawer, under-drawer tank, side cabinets, battery bay, bed platform or infills, mattress, roof solar. "Open drawers" slides everything out. It's lazy-loaded (about 145KB gzipped) so the rest of the page stays fast, and it falls back cleanly if WebGL isn't available.
3. **Expert advice built in.** A "Bush Bound says" reaction to each answer, device tips (coffee machine → AeroPress, CPAP on DC, laptop on USB-C), and heads-ups from the layout (headroom with a fridge under the bed, tank size limits, remote water planning).
4. **12V sizing.** Daily Wh from the fridge and picked devices → battery Ah, solar W, DC-DC and inverter, mapped to our Victron parts list.
5. **Recommendation + indicative price.** Essentials / Touring / Expedition kit, plus add-ons, finish, build service and electrical.
6. **"Lock in your kit" form.** No payment yet. It saves to D1 (`quotes`, `vehicle_type = 'flatpack-kit'`, `status = 'kit-request'`), creates a Notion lead (Type = "Flatpack Kit"), emails Luke the full breakdown with a **Fusion parameters CSV attached**, and emails the customer a confirmation.
7. **Fusion starter.** `scripts/fusion/ApplyKitParams` reads that CSV into a parametric Fusion template's user parameters.

Everything you'd want to edit (vehicles and dimensions, questions, copy, devices, products, prices) is in `src/data/kit-builder.ts`. All the logic is in `src/lib/kit-builder/engine.ts`, which runs in the browser and again on the server, so the server never trusts the client's prices.

## Before launch: must do

- [ ] **Set real prices.** Everything in `KITS`, `PRICING` and `ELECTRICAL_PRICING` is a placeholder.
- [ ] **Check vehicle dimensions** in `VEHICLES` against our floor templates. They're approximate and only drive the preview, but they show on screen.
- [ ] **Check the parts list** in `planPower()` matches what we actually fit (battery brand, Bushman fridges).
- [ ] **Add a "Flatpack Kit" option** to the Notion Type select if the integration can't create it automatically.
- [ ] **Decide on lead times** to show on the success screen and in emails (currently "within 48 hours").

## Fusion: what's possible

There's no front-end version of Fusion a customer can design in. These are the realistic options, cheapest first:

1. **Parametric template + parameters CSV (in this PR).** Build one parametric Fusion template per wagon family, driven by user parameters (`drawer_length`, `drawer_count`, `fridge_bay_width`, `module_height`, `sleep_mode`...). Each order arrives with a CSV, you run the script, and the template snaps to their layout. Most of the 3D modelling is done in seconds, and the CNC toolpaths (CAM) can be set up to follow the parameters too. **Next step:** build the first template (200 Series is a good start) using the parameter names in `fusionParams` in the engine.
2. **Autodesk Platform Services Viewer.** Shows a real Fusion model in the browser (rotate and inspect, but not edit). Good for sending the customer their actual approved design. It needs an APS app and model translation. Moderate effort.
3. **Fusion Automation API (APS Design Automation for Fusion).** Runs a Fusion script in the cloud: send it parameters and get back an `.f3d`, STEP or DXF cut files with nobody touching it. It's the path to fully automated "order → cut files", but it's paid per run and more involved. Check current access and pricing before committing.

Our recommendation: stick with option 1 for now and keep the three.js preview as the customer-facing view. It's quick, free, and on brand. Look at option 3 once order volume justifies automating the CAD step.

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
- The preview is indicative only: it shows boxes, not joinery. The copy says so.
