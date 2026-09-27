# SweetRun changelog

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
