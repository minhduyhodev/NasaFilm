"""Generate a visible cosmic nebula plate for auth left background."""
from PIL import Image, ImageFilter, ImageDraw, ImageEnhance
import random
import math
import os

ROOT = r"d:\FPT_SUM2026\moive-theater\movie-theater-fe"
out_dir = os.path.join(ROOT, "public", "landing")
os.makedirs(out_dir, exist_ok=True)

W, H = 1600, 1200
rng = random.Random(42)

img = Image.new("RGB", (W, H), (2, 1, 8))
px = img.load()

# Base deep space noise
for y in range(H):
    for x in range(0, W, 2):
        n = rng.randint(0, 12)
        c = (2 + n, 1 + n // 2, 8 + n)
        px[x, y] = c
        if x + 1 < W:
            px[x + 1, y] = c

img = img.filter(ImageFilter.GaussianBlur(8))

# Layered nebula blobs
overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay, "RGBA")

blobs = [
    # magenta / rose lower-mid
    (int(W * 0.28), int(H * 0.62), int(W * 0.55), (140, 40, 80, 90)),
    (int(W * 0.18), int(H * 0.72), int(W * 0.4), (110, 30, 70, 70)),
    # cool blue upper-left
    (int(W * 0.12), int(H * 0.28), int(W * 0.5), (40, 70, 140, 85)),
    (int(W * 0.22), int(H * 0.18), int(W * 0.35), (50, 90, 160, 55)),
    # violet bridge toward screen
    (int(W * 0.48), int(H * 0.4), int(W * 0.42), (80, 50, 120, 50)),
    # soft screen-light hint on right of plate
    (int(W * 0.78), int(H * 0.34), int(W * 0.45), (200, 210, 230, 40)),
    # warm seat echo
    (int(W * 0.4), int(H * 0.88), int(W * 0.35), (90, 35, 45, 45)),
]

for cx, cy, rad, color in blobs:
    for i in range(6, 0, -1):
        r = int(rad * (i / 6))
        a = int(color[3] * (i / 6) * 0.55)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color[:3], a))

overlay = overlay.filter(ImageFilter.GaussianBlur(48))
img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

# Stars
draw = ImageDraw.Draw(img)
for _ in range(280):
    x = rng.randint(0, W - 1)
    y = rng.randint(0, H - 1)
    # denser on left 70%
    if x > W * 0.78 and rng.random() > 0.35:
        continue
    bright = rng.randint(140, 255)
    size = 1 if rng.random() > 0.12 else 2
    col = (bright, bright, min(255, bright + 10))
    draw.ellipse([x, y, x + size, y + size], fill=col)
    if size > 1 and rng.random() > 0.6:
        draw.point((x - 1, y), fill=(bright // 2, bright // 2, bright // 2))

img = ImageEnhance.Contrast(img).enhance(1.15)
img = ImageEnhance.Color(img).enhance(1.25)

out = os.path.join(out_dir, "cosmos-auth.png")
img.save(out, format="PNG", optimize=True)
nested = os.path.join(ROOT, "movie-theater-fe", "public", "landing", "cosmos-auth.png")
if os.path.isdir(os.path.dirname(nested)):
    img.save(nested, format="PNG", optimize=True)
print("wrote", out, os.path.getsize(out))
