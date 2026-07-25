from PIL import Image
import os

src = r"d:\FPT_SUM2026\moive-theater\movie-theater-fe\public\landing\hero-ref.png"
if not os.path.exists(src):
    src = r"d:\FPT_SUM2026\moive-theater\movie-theater-fe\movie-theater-fe\public\landing\hero-ref.png"

out_dir = r"d:\FPT_SUM2026\moive-theater\movie-theater-fe\public\landing"
os.makedirs(out_dir, exist_ok=True)

base = Image.open(src).convert("RGB")
w, h = base.size
print("src", w, h)

# Keep ONLY the theater/screen half — no logo, slogan, or CTAs
# Original UI lives roughly in left ~48%; take from 46% to right edge
x0 = int(w * 0.46)
crop = base.crop((x0, 0, w, h))
print("crop", crop.size)

out = os.path.join(out_dir, "hero-theater.png")
crop.save(out, format="PNG", optimize=True)

nested = r"d:\FPT_SUM2026\moive-theater\movie-theater-fe\movie-theater-fe\public\landing\hero-theater.png"
if os.path.isdir(os.path.dirname(nested)):
    crop.save(nested, format="PNG", optimize=True)

print("wrote", out, os.path.getsize(out))
