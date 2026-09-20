# SweetRun — Asset Bible
**Kept by Stencil ("Sten"). Read before any asset work. Update after every session.**

---

## 1. Tokens

| Token | Hex | Use |
|---|---|---|
| Green dark | #1a3d2b | brand base, nav |
| Green deep | #0B1F14 / #12301F | dark backgrounds, icon bg |
| Green mid | #2d6a4f | accents on light |
| Amber | #d4831a | CTA, syrup |
| Amber light | #f4a44a / #eb9a33 | syrup highlights |
| Amber pale | #f6b45e | glass leaf top-light |
| Teal | #2dd4a7 | app accent, sap/fresh |
| App background | #07090f | the app's near-black canvas |
| App card | #0d1521 | card surfaces in-app |
| Cream | #fdf8f0 | marketing site background |

Assets for the **app** must sit on #07090f / #0d1521. Assets for the **marketing site** sit on cream #fdf8f0. Forbidden: purple, neon, any red except error states.

## 2. Style law

**Two committed tiers (Sept 19, 2026, chosen by Damian from a 9-plate exploration):**

**Tier 1 — "Amber Stamp" pictograms (in-app symbols, empty states, spot marks).** One solid amber-gold (#EB9A33) silhouette per subject, no outline, no gradients, warm slightly rounded geometry, on deep forest green (#12301F). Teal (#2DD4A7) reserved for sap drops only — it's the shared accent that makes the family rhyme. Every mark must read at 48px and survive 32. Canonical family sheet: `refs/pictogram-family-sheet.png`. Generation recipe: Recraft V4.1, model_type "vector", colors ["#EB9A33","#2DD4A7","#12301F"], prompt pattern "Minimal solid pictogram, square, no text, no border, no frame … one solid amber-gold silhouette … warm slightly rounded geometry … premium wayfinding mark, instantly readable at 32 pixels."

**Tier 2 — "Amber Glass" (app icon, hero art, large marketing spots only).** Dimensional syrup-glass material, backlit warmth, deep green ground. Proven for the icon; fails at small sizes — never use below ~200px.

Forbids (both tiers): emoji-style faces, thick black outlines, white backgrounds, stock art, card-suit-generic trees (a SweetRun tree is unmistakably maple), purple/neon. Rejected in exploration: woodcut engraving (beautiful but Damian wants symbols), loose geometric vector (went abstract).

## 3. Character sheets

*(none yet — Damian creates characters often; sheets go here as they're born)*

**The Amber Glass leaf-and-drop** is the brand mark, not a character: canonical render is `refs/amber-glass-leaf-1024.png` (also `/tmp` master from Sept 19 session; final crops live at repo root as icon-512.png etc.).

## 4. Ledger

| Date | Asset | Files | Origin |
|---|---|---|---|
| 2026-09-19 | App icon "Amber Glass" | icon-512.png, icon-192.png, icon-512-maskable.png, apple-touch-icon.png, favicon.* | Generated — Recraft V4.1 via Higgsfield (prompt: dimensional maple leaf in polished amber glass, golden syrup drop falling from stem, dark green bg; palette hexes passed as colors[]), graded to brand green with PIL. Disclosed. |
| 2026-09-19 | Legacy flat vector mark | icon-source.svg | Handmade SVG (leaf path from original favicon). Superseded but kept. |
| 2026-09-19 | Amber Stamp pictogram set v1 (7) | brand/assets/picto-*.svg (tiled source) + picto-*.png (512px transparent, chroma-keyed — USE THESE in the app) | Generated — Recraft V4.1 vector via Higgsfield (Tier 1 recipe above). SVGs carry a baked green tile; the PNGs are keyed transparent so marks sit directly on app cards. In-app verified at 110/64/44 on #07090f/#0d1521, bare and as rounded green chips (chip = CSS: bg #12301F, radius ~18px). Mock: refs/in-app-mock.png. Disclosed. |

## 5. Wishlist (next assets, from Damian)

- [x] Maple tree — picto-tree-leafcrown.svg (primary) + picto-tree-broad.svg (variant)
- [x] Sap bucket — picto-bucket.svg
- [x] Tubing lines — picto-tubing.svg
- [x] Evaporator — picto-evaporator.svg · Sugarhouse — picto-sugarhouse.svg · Jug — picto-jug.svg
- [ ] Wire pictograms into app empty states + landing page (integration pass)
- [ ] Possible additions: R/O machine, hydrometer, barrel, storage tank, degree-day/thermometer, filter press
- [ ] In-app UI icon audit — current icons are hand-drawn Lucide-style SVG strokes in app.jsx (this is the right approach; extend, don't replace with raster)
- [ ] Possible mascot character (TBD with Damian — he's not happy with current in-app characters, calls them "a step above emojis")

## 5b. Hand-cut marks (v2 — the shipping set)

`brand/assets/marks/mark-{tree,bucket,tubing,evaporator,jug,sugarhouse}.svg` — HANDMADE SVG on a shared 48×48 grid, `currentColor` body + teal #2DD4A7 reserved for sap drops. Amber #EB9A33 on dark surfaces, deep-green ink #12301F on cream/white — set via CSS color. The tree's crown is the app icon's own leaf path (brand consistency); its rooted foot is deliberate and distinguishes it from the icon mark. Verified at 120/64/32 on dark and cream. The generated pictogram set (picto-*) is KEPT as fallback/reference per Damian. ~4KB total for all six.

**Map tree marker (in app code, not an asset file):** `_sbTreeSvg` in app.jsx/app.js was recut Sept 19 — proper faceted maple leaf points + a #07090f dark rim (2.8 stroke, 4.2 trunk halo) so markers pop off green satellite canopy. Health-color parametrization unchanged. Service worker at sweetrun-v13.

**Color rules (Damian, Sept 19):** marks must look good alone AND contrast with any ground — hence the two colorways + rim on map markers. The app's data palette (blue/purple/gold/red/green stats like the break-even card) is its own layer that Damian likes as-is; marks never borrow data colors, so they can sit beside them without competing.

## 6. Environment notes

- Higgsfield model of record: `recraft_v4_1` (vector type for flat, standard for Amber Glass material). Balance was ~2,390 credits on Ultra as of Sept 19.
- Sandbox proxy blocks the generation CDN — route downloads through the built-in browser (canvas → base64, oversized results save to tool-results files). SVGs come via web_fetch as text.
- Other Sept 19 icon candidates ("The Pour", "Liquid Gold", "Sugar Veins", glass-brooch leaf, flat vector SVG) remain in the Higgsfield gallery — good og-image / seasonal material.
