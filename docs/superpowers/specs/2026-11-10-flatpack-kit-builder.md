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

An options-first builder: customers pick what they want, watch it build in 3D and get a price **range** before asking for an official quote.

1. **Steps** (kept deliberately simple):
   - **Intro:** the wagon base kit in 3D with Open/Close, and a Start button. Returning visitors can resume or start fresh.
   - **Pick your fridge:** upright 65L, upright 85L, or drawer fridge 30L. There's an "I already have this fridge" tickbox.
   - **Add options:** sliding bed, pull-out table (from the bottom of the left drawer), foldable table storage (the Bush Bound table in its hinged cubby).
   - **Summary and quote form:** the vehicle is picked in the form. "Start over" is available throughout.
   - **Not asked yet:** 12V, 240V, finish and who builds it. The code is still there (`HIDDEN_QUESTIONS` in `src/data/kit-builder.ts`), and the quote form's notes prompt covers them for now.
2. **3D preview** in the Bush Bound look: black honeycomb birch ply with birch edges, laminate on the drawer fronts and fridge cabinet sides, and carpet tops for installed builds. **Open** slides the drawers out as open trays, swings the upright fridge door and the table cubby door, sets up the Bush Bound table beside the car, slides the pull-out bed out and unfolds the mattress. **Close** reverses it all.
3. **No public pricing.** Prices live only in `src/lib/kit-builder/pricing.server.ts`, which runs on the server. The page asks `/api/kit-estimate` for a bracket: under $5k, $5k to $10k, $10k to $15k, $15k to $30k, $30k to $50k, or $50k+. The builder shows nothing more precise than that. The full itemised internal price goes only to the staff email. A production build check confirms no prices are in the client JavaScript.
4. **"Get an official quote"** form: D1 (`quotes`), Notion lead, staff email (picks, internal pricing, and the bracket the customer saw), and a customer confirmation with the bracket.

Browser-side option names and copy live in `src/data/kit-builder.ts` (no prices in there).

## Before launch: must do

- [ ] **Set real prices** in `src/lib/kit-builder/pricing.server.ts`. They're placeholders. Never move them into a file a page imports.
- [ ] **Exact fridge models** to replace the guessed sizes in `FRIDGES`.
- [ ] **Vehicle measurements** in `VEHICLES`. These now drive the layout directly, since customers no longer enter them.
- [ ] **Where the air compressor goes.** It's been taken out of the builder until we know its real spot.
- [ ] **12V/240V sizing questions** (what they want to run) for the next phase.
- [ ] **Add a "Flatpack Kit" option** to the Notion Type select if the integration can't create it.

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
