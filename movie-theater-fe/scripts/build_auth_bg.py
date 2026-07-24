"""Build theater crop with soft left alpha fade for cosmic blend."""
from PIL import Image
import os

ROOT = r"d:\FPT_SUM2026\moive-theater\movie-theater-fe"
src = os.path.join(ROOT, "public", "landing", "hero-ref.png")
if not os.path.exists(src):
    src = os.path.join(ROOT, "movie-theater-fe", "public", "landing", "hero-ref.png")

out_dir = os.path.join(ROOT, "public", "landing")
os.makedirs(out_dir, exist_ok=True)

base = Image.open(src).convert("RGBA")
w, h = base.size
print("src", w, h)

# Theater/screen half — start earlier so screen glow is preserved
x0 = int(w * 0.42)
crop = base.crop((x0, 0, w, h))
cw, ch = crop.size
print("crop", cw, ch)

# Soft left alpha ramp so photo dissolves into cosmic field
pixels = crop.load()
fade = int(cw * 0.42)
for x in range(fade):
    a = int(255 * (x / max(fade - 1, 1)) ** 1.15)
    for y in range(ch):
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, a)

out = os.path.join(out_dir, "hero-theater.png")
crop.save(out, format="PNG", optimize=True)

nested = os.path.join(ROOT, "movie-theater-fe", "public", "landing", "hero-theater.png")
if os.path.isdir(os.path.dirname(nested)):
    crop.save(nested, format="PNG", optimize=True)

print("wrote", out, os.path.getsize(out))
