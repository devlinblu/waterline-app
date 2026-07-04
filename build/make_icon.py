#!/usr/bin/env python3
"""Generate the Waterline app icon: a macOS-style squircle with a sky/water
horizon, a crisp waterline, and subtle wave crests."""
import math
from PIL import Image, ImageDraw, ImageFilter

S = 1024
pad = 88
x0, y0, x1, y1 = pad, pad, S - pad, S - pad
radius = 200
wl = int(y0 + (y1 - y0) * 0.42)  # waterline near upper-middle


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


img = Image.new("RGBA", (S, S), (0, 0, 0, 0))

# --- soft drop shadow ---
shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle(
    [x0, y0 + 20, x1, y1 + 20], radius=radius, fill=(6, 26, 42, 110))
shadow = shadow.filter(ImageFilter.GaussianBlur(26))
img = Image.alpha_composite(img, shadow)

# --- icon content, drawn full then clipped to the squircle ---
content = Image.new("RGBA", (S, S), (0, 0, 0, 0))
cd = ImageDraw.Draw(content)

sky_top, sky_bot = (238, 244, 247), (214, 231, 238)
for y in range(y0, wl):
    t = (y - y0) / max(1, (wl - y0))
    cd.line([(x0, y), (x1, y)], fill=lerp(sky_top, sky_bot, t) + (255,))

water_top, water_bot = (40, 138, 174), (10, 56, 88)
for y in range(wl, y1):
    t = (y - wl) / max(1, (y1 - wl))
    cd.line([(x0, y), (x1, y)], fill=lerp(water_top, water_bot, t) + (255,))

# crisp waterline: subtle dark seam + bright highlight just below
cd.line([(x0, wl), (x1, wl)], fill=(9, 52, 80, 230), width=4)
cd.line([(x0, wl + 5), (x1, wl + 5)], fill=(236, 248, 252, 210), width=3)

# subtle wave crests
waves = [(wl + 95, 90, 12, 0.0), (wl + 185, 65, 16, 1.1), (wl + 285, 45, 20, 2.2)]
for yy, alpha, amp, ph in waves:
    pts = [(x, yy + amp * math.sin(x / 64.0 + ph)) for x in range(x0, x1 + 1, 3)]
    cd.line(pts, fill=(232, 246, 251, alpha), width=6)

# clip to squircle
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=255)
content.putalpha(mask)

# faint top sheen for depth
sheen = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(sheen).rounded_rectangle(
    [x0, y0, x1, wl], radius=radius, fill=(255, 255, 255, 26))
sm = Image.new("L", (S, S), 0)
ImageDraw.Draw(sm).rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=255)
sheen.putalpha(Image.composite(sheen.split()[3], Image.new("L", (S, S), 0), sm))

img = Image.alpha_composite(img, content)
img = Image.alpha_composite(img, sheen)

out = "/Users/devlin/Downloads/waterline-app/build/icon_1024.png"
img.save(out)
print("saved", out, img.size)
