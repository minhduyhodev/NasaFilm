from PIL import Image, ImageFilter, ImageDraw, ImageEnhance
import os

src = r"d:\FPT_SUM2026\moive-theater\movie-theater-fe\public\landing\hero-ref.png"
if not os.path.exists(src):
    src = r"d:\FPT_SUM2026\moive-theater\movie-theater-fe\movie-theater-fe\public\landing\hero-ref.png"

out = r"d:\FPT_SUM2026\moive-theater\movie-theater-fe\public\landing\hero-auth.png"

base = Image.open(src).convert("RGB")
w, h = base.size
print("size", w, h)

# Sample dark seat color from lower mid (no UI)
px = base.load()
samples = []
for y in range(int(h * 0.62), int(h * 0.88)):
    for x in range(int(w * 0.52), int(w * 0.72)):
        r, g, b = px[x, y]
        lum = r + g + b
        if 15 < lum < 140:
            samples.append((r, g, b))

fill = (
    tuple(sum(c[i] for c in samples) // len(samples) for i in range(3))
    if samples
    else (8, 7, 10)
)
print("fill", fill)

# Build fill with subtle dark texture from seats only
tex = base.crop((int(w * 0.55), int(h * 0.55), int(w * 0.78), h))
tex = tex.resize((w, h), Image.Resampling.BILINEAR)
tex = tex.filter(ImageFilter.GaussianBlur(radius=max(40, w // 40)))
tex = ImageEnhance.Brightness(tex).enhance(0.12)
tex = ImageEnhance.Color(tex).enhance(0.55)
solid = Image.new("RGB", (w, h), fill)
fill_layer = Image.blend(solid, tex, 0.35)

# HARD opaque cover for all UI copy regions (no soft bleed of glyphs)
mask = Image.new("L", (w, h), 0)
draw = ImageDraw.Draw(mask)

# Full left column through mid — kills logo/tagline/desc completely
draw.rectangle([0, 0, int(w * 0.48), int(h * 0.72)], fill=255)
# CTA buttons strip
draw.rectangle([0, int(h * 0.70), int(w * 0.46), int(h * 0.92)], fill=255)
# Extra safety over mid-left where slogan may sit when cover-scaled
draw.rectangle([0, int(h * 0.28), int(w * 0.52), int(h * 0.58)], fill=255)

# Soft feather ONLY on the right edge of the cover
edge = Image.new("L", (w, h), 0)
edge_draw = ImageDraw.Draw(edge)
feather_x0 = int(w * 0.40)
feather_x1 = int(w * 0.56)
for x in range(feather_x0, feather_x1):
    t = (x - feather_x0) / max(1, feather_x1 - feather_x0)
    # 255 at left of feather → 0 at right
    val = int(255 * (1 - t))
    edge_draw.line([(x, 0), (x, h)], fill=val)

# Combine: hard mask OR feather where hard is already 255 keep 255;
# where we need soft transition, use max(hard, feather) only for x>0.40
# Simpler: start from hard 255 left of 0.48, then linear falloff 0.48→0.58
mask2 = Image.new("L", (w, h), 0)
m2 = mask2.load()
cut0 = int(w * 0.48)
cut1 = int(w * 0.58)
for y in range(h):
    for x in range(w):
        if x <= cut0:
            # full cover on left, but leave bottom-right seats visible below buttons zone
            if y < int(h * 0.92):
                m2[x, y] = 255
            else:
                m2[x, y] = 180
        elif x < cut1:
            t = (x - cut0) / (cut1 - cut0)
            # Keep strong cover on upper/mid where text lives
            if y < int(h * 0.70):
                m2[x, y] = int(255 * (1 - t * 0.85))
            else:
                m2[x, y] = int(200 * (1 - t))

mask2 = mask2.filter(ImageFilter.GaussianBlur(radius=max(12, w // 120)))

cleaned = Image.composite(fill_layer, base, mask2)

# Final crush: any remaining bright/red UI pixels on left 50%
pxc = cleaned.load()
for y in range(0, int(h * 0.95)):
    for x in range(0, int(w * 0.50)):
        r, g, b = pxc[x, y]
        lum = r + g + b
        # bright lettering
        if lum > 55:
            pxc[x, y] = fill
            continue
        # red button remnants
        if r > 55 and r > g + 15 and r > b + 15:
            pxc[x, y] = fill

cleaned.save(out, format="PNG", optimize=True)
nested = r"d:\FPT_SUM2026\moive-theater\movie-theater-fe\movie-theater-fe\public\landing\hero-auth.png"
if os.path.isdir(os.path.dirname(nested)):
    cleaned.save(nested, format="PNG", optimize=True)

# verify
bright = 0
for y in range(0, int(h * 0.9)):
    for x in range(0, int(w * 0.48)):
        if sum(pxc[x, y]) > 70:
            bright += 1
print("left_bright_after", bright)
print("wrote", out, os.path.getsize(out))
