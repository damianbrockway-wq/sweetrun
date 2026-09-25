#!/usr/bin/env python3
"""Render the Run Sheet home screen icon set from one square SVG.

    python3 scripts/render-icons.py            # option D (the live choice)
    python3 scripts/render-icons.py B          # switch to option B

Reads brand/icon-options/sweetrun-icon-<X>.svg and writes app/icons/:
  icon-<x>-192.png, icon-<x>-512.png, icon-<x>-512-maskable.png,
  apple-touch-icon-<x>-180.png, favicon-<x>-32.png, favicon-<x>.svg
The option letter is in every file name so a switch never collides with a
year-long immutable cache. After switching, update the file names in
app/look.js and app/manifest.webmanifest, and bump CACHE in app/sw.js.

Needs Python Playwright with Chromium (it renders the SVG exactly as a browser
does). Both source SVGs are full-bleed squares with the leaf inside the central
66%, so they are already maskable-safe (the 80% safe circle)."""
import re, sys, pathlib
from playwright.sync_api import sync_playwright

opt = (sys.argv[1] if len(sys.argv) > 1 else 'D').upper()
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'brand' / 'icon-options' / f'sweetrun-icon-{opt}.svg').read_text()
# Strip the provenance <metadata> block for the shipped favicon (keeps it ~2 KB).
clean = re.sub(r'<metadata>.*?</metadata>', '', src, flags=re.S)
clean = re.sub(r'\s+xmlns:c2pa="[^"]*"', '', clean)
out = root / 'app' / 'icons'
out.mkdir(parents=True, exist_ok=True)
x = opt.lower()
(out / f'favicon-{x}.svg').write_text(clean)
sizes = {f'icon-{x}-192.png': 192, f'icon-{x}-512.png': 512, f'icon-{x}-512-maskable.png': 512,
         f'apple-touch-icon-{x}-180.png': 180, f'favicon-{x}-32.png': 32}
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, n in sizes.items():
        pg = b.new_page(viewport={'width': n, 'height': n}, device_scale_factor=1)
        svg = re.sub(r'width="1024" height="1024"', f'width="{n}" height="{n}"', clean, count=1)
        pg.set_content(f'<html><body style="margin:0;background:#000">{svg}</body></html>')
        pg.screenshot(path=str(out / name), clip={'x': 0, 'y': 0, 'width': n, 'height': n})
        pg.close()
    b.close()
print('wrote', ', '.join(sorted(sizes)), f'favicon-{x}.svg')
