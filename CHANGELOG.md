# SweetRun changelog

## 2026-09-28: Units follow-up (boil numbers, litres everywhere, log units)

What a sugarmaker sees:
- **Boil numbers that agree.** While boiling, "Syrup drawn" is what you drew and counted. The number beside it is now "Expected so far": what your pan should have made since you started, from its size and your sap Brix. A sentence under the jugs says how they compare ("Drawn is 0.9 gal ahead of what the pan makes in this time. Syrup left sweet in the pan from the last boil comes out in the first draws."). The jugs show the syrup drawn. The Season card says both.
- **Litres everywhere they belong.** Equipment's pump rate and tank size, the haul note, the RO what-if's evaporator rate and the custom pan note read in L and L/min in litre mode. They are still saved in gallons.
- **Switching units converts what you logged.** Every new sap, syrup, RO and evaporator entry, batch and boil remembers its unit. Switch between gallons and litres and every screen shows the right number in the new unit instead of relabelling it. Entries from before this update count as the unit SweetRun was set to when this update first opened (Settings says which).

Under the hood: entries gain an optional `u` ('GAL' or 'L'); one new key, `sg_units_legacy`, is taken once at start-up and carried by backups (a restore without it takes the backup's own `sg_units`). Nothing already stored is rewritten; screens read through `srReadLogs`/`srLogsInUnit`. The expected-syrup formula is unchanged (it was right; it measures something different from drawn). Diagnose still works in US gallons, as it says. Service worker `sweetrun-v44`. 756 tests.

## 2026-09-28: UI review (map plates, back bar, expired trial, French fit)

What a sugarmaker sees:
- **Line letters no longer pile up.** When mainlines are drawn from the tank outward, their A, B, C, D plates used to stack on the tank. Each plate now sits on its own line, at the free end, and moves along the line (or just beside it) to stay clear of the other plates, the map's buttons and the pins. Zoom in or out and they re-settle.
- **Back button.** Scroll down and a slim bar pins to the top with the back button and the screen's name; it no longer floats over fields and buttons. The back button sits in the same spot on every screen, photo or not.
- **Expired trial.** Get a Pass is the one orange button; a screen's own button (it would not save) steps down.
- **Tidier fit and finish.** The imagery credits have their own line under the Bush chips. French stage names fit their pills. Labels beside long values no longer break into three lines. "1 tree · 1 tap". Species read "Sugar maple" (Érable à sucre). The pump's name stays on the Watch map. Side-by-side number fields line up when one label wraps.

Under the hood: `srPlacePlates` (tested) places the plates in screen space after every zoom. No data key, shape or formula changed. Service worker `sweetrun-v43`. 708 tests.

## 2026-09-27: Terrain from LiDAR on the Bush (elevation, slope, aspect, water, trails)

What a sugarmaker sees:
- **Elevation heat map.** The Bush layers sheet has "Terrain from LiDAR": Elevation colours the ground by height from USGS 3DEP LiDAR, scaled to your own bush (for example 294 to 448 ft), with a legend in feet (metres in metric) and a colour strength slider. "Fit the colours to this view" rescales it where you are looking.
- **Slope and aspect.** Slope shows steepness in percent (0 to 5, 5 to 10, 10 to 15, 15 to 30, 30+), aspect shows which way each slope faces. Hillshade adds shaded relief. One coloured layer at a time, so the legend always matches.
- **Waterways and trails.** Streams and ponds from the USGS National Hydrography Dataset, recreational trails from the USGS National Map. Property lines keep their switch.
- **Tap to read the ground.** With a terrain layer on, tap open ground to see its height there. A tree's detail shows its LiDAR ground height. A mainline's detail shows its high end, low end, fall and average grade, whether the tank sits at the low end, and any rise that sap cannot cross on gravity or low spot where it can pool, with a profile of the ground along the line.
- **Offline.** Terrain layers need signal. Saving an area offline now keeps the terrain, water and trail layers that are on, and the sheet says when a layer needs signal.

Under the hood: one new preference key `sg_bush_terrain`; no data key or shape changed. Requests follow the documented ArcGIS REST API (3DEP ImageServer `exportImage` per 256 px tile with a `renderingRule`, `getSamples`; MapServer `export` and cached tiles); if a custom rendering is refused, the layer switches to the service's published function. The sandbox could not reach USGS, so the layers were verified against a stub that implements the documented semantics; the first open on a real device is the live check. Service worker `sweetrun-v40`. 674 tests.

## 2026-09-27: Fix pass 2 (gauge chain, keyboard, French numbers)

What a sugarmaker sees:
- **Gauges along a line.** A mainline can carry gauges between the pump and the far end (C1 at tree T022, C2 at T024, and so on). Read them on your walk and the line's detail shows the whole chain, pump to far end, with the drop across every stretch, and names the stretch that loses the vacuum: "Walk from C2 to C3. Vacuum holds to C2 at T024, then drops 5.7 in by C3 at T027. About 330 ft apart on the map." When the loss is shared along the line it says so instead. Tap any gauge in the chain to log it. Add, order and remove gauges under "Gauges along this line". Watch shows the same chain as one row.
- **Numbers in French read the Quebec way.** 1 000 gal, 2,5 %, 0,88 $. Type 2,5 or 2.5; both work. English is unchanged.
- **"Show as a table" under every chart**, for anyone who would rather read the numbers than the picture.
- **Keyboard.** On the Bush, tanks, pumps and the sugarhouse can be reached with Tab and opened with Enter; "Find a tree" (the search button beside "Watch the bush", or the side panel on a wide screen) reaches any tree by its tag. When one sheet is open over another, Escape closes only the top one, and focus goes back to what opened it, even on the map.
- **Boil.** While boiling, "Add a reading", "Draw off" and "End the boil" now sit above the readings chart, so they show without scrolling on a phone, an iPad and a laptop.
- During an expired trial the Season screen has one main button, Get a Pass.

Under the hood: new key `sg_line_gauges` (gauge positions only; their readings are ordinary `sg_readings` rows, and no existing key or shape changed); the leak localizer `srGaugeLocate` is tested. `sg_logs2` is parsed once per data change on each screen (Degree days re-read it twice a keystroke) and the season score is computed once per set of inputs (Diagnose re-scored on every keystroke). Service worker `sweetrun-v39`. 619 tests. app.js 823 KB (247 KB gzipped).

## 2026-09-27: Fix pass (French, accessibility, layout, speed)

What a sugarmaker sees:
- **All of it in French.** Every screen now has French, in the words Quebec producers use: eau d'érable, entaille, chalumeau, érablière, tubulure, maître-ligne, osmose, casseroles, soutirer, Cabane à sucre. Inches and feet read po and pi in French, and the default checklist jobs, spout names and fuel choices are translated too.
- **Keyboard and screen readers.** Watch's line plates are announced as buttons; pressing Enter opens the line and Escape returns to the plate. Every chart has a data table a screen reader can read, the Season chart reads out day by day with the arrow keys, and text fields show a clear amber ring when they have focus. The page tells the phone it is in French when it is, so it is read in a French voice.
- **Layout.** The greeting wraps instead of cutting off a name on small phones; on iPad portrait both columns now end close together; on a phone the Boil screen's evaporator is shorter so the numbers sit higher; checklists no longer show in capital letters.
- **Faster first open.** The offline copy downloads after the app has opened, not while it opens, and a first visit is no longer reloaded once the offline copy is ready.

Under the hood: service worker `sweetrun-v38`; looping animations pause when scrolled out of view, the evaporator steam no longer re-blurs every frame, loading shimmer moves by transform; axe-core finds no serious or critical issue on any screen; tests fail if any French string is missing or drops a placeholder. app.js 801 KB (241 KB gzipped; the French strings are 96 KB before compression).

## 2026-09-26: Run Sheet is the app (cutover)

What a sugarmaker sees:
- **The new design everywhere.** sweetrun.app/app now opens the Run Sheet design for everyone: Season, Bush, Log, Pumps and Sugar Shack, with Watch on iPad landscape and desktop. The old screens and the "Classic look" switch are gone.
- **Your data carries over.** Nothing about how entries, batches, pins, checklists or settings are stored changed. A season logged in the old app shows up in full.
- **New home screen icon, and the same mark inside the app.** The orange tile with the white maple leaf, on the home screen and beside the SweetRun name in the side nav, the greeting and Watch (the old Amber Glass mark is gone). New installs get it. A shortcut already on a phone may keep the old picture; that is only cosmetic. Do not delete the app to refresh the icon: on an iPhone a home screen app keeps its own data, and removing it removes that data. Make a backup (Sugar Shack, Backup and restore) before touching the shortcut.
- **Boil screen, rebuilt around a live boil.** A session clock, four numbers over the steam (pan temperature, last Brix, syrup drawn, syrup made so far), a chart of your readings against the draw-off temperature or the 66 to 67 Brix band, and one big "Add a reading" button with "Draw off" and "End the boil" under it. The last Brix of a boil goes on its syrup entry.
- **One yield benchmark.** Recap and Diagnose used to disagree about the same season (0.31 gal a tap was "Low" on one and "Strong" on the other). Every screen now grades syrup per tap against one range, 0.20 to 0.45 gal a tap as normal, from USDA NASS yields and extension trials. What your own system can reach is still shown, and the numbers themselves did not change. Damian confirmed this benchmark on 2026-09-26.
- **Fixes:** Watch's demo tag no longer covers a line's plate; Watch one line no longer cuts off the sugarhouse; Pumps on a wide screen lost an empty band; three headings and messages that showed the wrong words; small label clips on the Evaporator and Diagnose screens.
- **Works fully offline after one load**, header photos included.

Under the hood: classic code removed (app.js is 703 KB instead of 1.41 MB; app, index page and stylesheets together are 232 KB gzipped, against 307 KB for the old app), service worker `sweetrun-v36` clears every older cache, 539 tests.
