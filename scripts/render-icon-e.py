#!/usr/bin/env python3
"""Home screen icon E (Damian's own): orange tile, white outline maple leaf.

Source: brand/icon-options/sweetrun-icon-E-1024.png, already cropped full-bleed
for iOS masking. Writes app/icons/:
  icon-e-192.png, icon-e-512.png            manifest "any"
  icon-e-512-maskable.png                   manifest "maskable": the leaf sits
                                            inside Android's safe circle (radius
                                            40% of the tile) at 38%, and the
                                            padding extends the tile's own
                                            gradient (edge colours plus the fitted
                                            linear slope), feathered at the seam
  apple-touch-icon-e-180.png                iOS home screen
  favicon-e-32.png                          browser tab (the glossy tile reads at 32)
  mark-e-<size>@<n>x.png                    the in-app brand mark (side nav, greeting,
                                            Watch header) at its exact CSS size, 30 px,
                                            1x to 3x, so the browser never resamples it
  favicon-e-16.png                          flat version: at 16 px the gloss and glow
                                            blur the outline into mush, so this one is
                                            the leaf outline, thickened, white on a
                                            flat mid-tile orange
Run: python3 scripts/render-icon-e.py   (needs numpy, scipy, Pillow)
"""
import os, numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'brand/icon-options/sweetrun-icon-E-1024.png')
OUT = os.path.join(ROOT, 'app/icons')
os.makedirs(OUT, exist_ok=True)
src = Image.open(SRC).convert('RGB')
A = np.asarray(src).astype(np.float64)
S = A.shape[0]

def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)

for name, size in [('icon-e-512.png', 512), ('icon-e-192.png', 192), ('apple-touch-icon-e-180.png', 180),
                   ('favicon-e-32.png', 32)]:
    save(src, name, size)

# In-app brand mark: exact pixel sizes for RsBrandMark (30 px and 34 px CSS).
for css in (30,):
    for n in (1, 2, 3):
        save(src, f'mark-e-{css}@{n}x.png', css * n)

# ── Leaf mask (shared by the flat favicon and the maskable) ──
mx, mn = A.max(-1), A.min(-1)
white = (mn > 200) & (mx - mn < 45)
lab, n = ndimage.label(white)
sizes = ndimage.sum(white, lab, range(1, n + 1))
leaf = np.isin(lab, 1 + np.nonzero(sizes > 2000)[0])
# Flat 16 px favicon: thicken the outline so it survives box downsampling, then
# sharpen the coverage ramp so edges land on whole pixels.
thick = ndimage.binary_dilation(leaf, iterations=14)
cov = np.asarray(Image.fromarray((thick * 255).astype(np.uint8)).resize((16, 16), Image.BOX)).astype(np.float64) / 255
cov = np.clip((cov - 0.18) / 0.5, 0, 1)[..., None]
flat = np.array([214, 98, 30]) * (1 - cov) + np.array([255, 250, 244]) * cov
Image.fromarray(flat.astype(np.uint8)).save(os.path.join(OUT, 'favicon-e-16.png'), optimize=True)

# ── Maskable ──
ys, xs = np.nonzero(leaf)
best = None                                   # smallest circle holding the leaf (grid search)
for cx in range(int(S * .44), int(S * .56), 2):
    for cy in range(int(S * .44), int(S * .58), 2):
        r = np.sqrt((xs - cx) ** 2 + (ys - cy) ** 2).max()
        if best is None or r < best[0]: best = (r, cx, cy)
R, CX, CY = best
k = (0.38 * S) / R                            # leaf radius -> 38% of the tile (safe zone is 40%)
ox, oy = S / 2 - CX * k, S / 2 - CY * k

# Background model: a linear fit of colour on (x, y) over pixels away from the leaf and its glow.
bg = ~ndimage.binary_dilation(leaf, iterations=40)
yy, xx = np.nonzero(bg)
X = np.stack([np.ones_like(xx), xx, yy], 1).astype(np.float64)
coef = np.linalg.lstsq(X, A[yy, xx], rcond=None)[0]          # 3 x 3
fit = lambda u, v: coef[0] + u[..., None] * coef[1] + v[..., None] * coef[2]
# The tile with the leaf and its glow painted out (normalised convolution of the
# background pixels), so extending an edge never drags the stem or glow outward.
w = ndimage.gaussian_filter(bg.astype(np.float64), 30)
plate = np.stack([ndimage.gaussian_filter(A[..., c] * bg, 30) for c in range(3)], -1) / np.maximum(w, 1e-6)[..., None]
plate = np.where(bg[..., None], A, plate)
blur = np.stack([ndimage.gaussian_filter(plate[..., c], 24) for c in range(3)], -1)

Y, Xc = np.mgrid[0:S, 0:S].astype(np.float64)
u, v = (Xc - ox) / k, (Y - oy) / k                            # canvas -> source coordinates
inset = 20.0
uc, vc = np.clip(u, inset, S - 1 - inset), np.clip(v, inset, S - 1 - inset)
ext = ndimage.map_coordinates(blur, [np.repeat(vc[..., None], 3, -1), np.repeat(uc[..., None], 3, -1),
                                     np.broadcast_to(np.arange(3), vc.shape + (3,))], order=1)
ext = ext + fit(u, v) - fit(uc, vc)
inside = (u >= 0) & (u <= S - 1) & (v >= 0) & (v <= S - 1)
smp = ndimage.map_coordinates(A, [np.repeat(np.clip(v, 0, S - 1)[..., None], 3, -1), np.repeat(np.clip(u, 0, S - 1)[..., None], 3, -1),
                                  np.broadcast_to(np.arange(3), v.shape + (3,))], order=1)
edge = np.minimum.reduce([u, v, S - 1 - u, S - 1 - v]) * k   # canvas px inside the placed tile
alpha = np.clip(edge / 28.0, 0, 1)[..., None] * inside[..., None]
out = np.clip(smp * alpha + ext * (1 - alpha), 0, 255).astype(np.uint8)
m = Image.fromarray(out)
save(m, 'icon-e-512-maskable.png', 512)
if os.environ.get('REVIEW'): m.save(os.environ['REVIEW'])       # full-size copy for review; not published
print('leaf radius %.3f of tile -> 0.380; scale %.3f; centre (%d,%d)' % (R / S, k, CX, CY))
