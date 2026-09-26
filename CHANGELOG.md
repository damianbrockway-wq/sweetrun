# SweetRun changelog

## 2026-09-26: Run Sheet is the app (cutover)

What a sugarmaker sees:
- **The new design everywhere.** sweetrun.app/app now opens the Run Sheet design for everyone: Season, Bush, Log, Pumps and Sugar Shack, with Watch on iPad landscape and desktop. The old screens and the "Classic look" switch are gone.
- **Your data carries over.** Nothing about how entries, batches, pins, checklists or settings are stored changed. A season logged in the old app shows up in full.
- **New home screen icon.** The orange tile with the white maple leaf. New installs get it. A shortcut already on a phone may keep the old picture; that is only cosmetic. Do not delete the app to refresh the icon: on an iPhone a home screen app keeps its own data, and removing it removes that data. Make a backup (Sugar Shack, Backup and restore) before touching the shortcut.
- **Boil screen, rebuilt around a live boil.** A session clock, four numbers over the steam (pan temperature, last Brix, syrup drawn, syrup made so far), a chart of your readings against the draw-off temperature or the 66 to 67 Brix band, and one big "Add a reading" button with "Draw off" and "End the boil" under it. The last Brix of a boil goes on its syrup entry.
- **One yield benchmark.** Recap and Diagnose used to disagree about the same season (0.31 gal a tap was "Low" on one and "Strong" on the other). Every screen now grades syrup per tap against one range, 0.20 to 0.45 gal a tap as normal, from USDA NASS yields and extension trials. What your own system can reach is still shown, and the numbers themselves did not change.
- **Fixes:** Watch's demo tag no longer covers a line's plate; Watch one line no longer cuts off the sugarhouse; Pumps on a wide screen lost an empty band; three headings and messages that showed the wrong words; small label clips on the Evaporator and Diagnose screens.
- **Works fully offline after one load**, header photos included.

Under the hood: classic code removed (app.js is 703 KB instead of 1.41 MB; app, index page and stylesheets together are 232 KB gzipped, against 307 KB for the old app), service worker `sweetrun-v36` clears every older cache, 532 tests.
