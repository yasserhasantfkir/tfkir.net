# -*- coding: utf-8 -*-
"""
توليد صور PNG للموقع:
  • assets/img/og-cover.png         1200×630
  • assets/img/icon-192.png / icon-512.png
  • assets/img/apple-touch-icon.png 180×180
  • assets/img/favicon-32.png
  • assets/img/portrait-placeholder.png  بديل الصورة الشخصية

يشكّل العربية عبر arabic_reshaper + python-bidi (لا يحتاج libraqm).
"""
import os
import math
import re

import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = "/workspace/tfkir.net"
IMG = os.path.join(ROOT, "assets", "img")
FDIR = "/tmp/opencode/fonts/full"
os.makedirs(IMG, exist_ok=True)

F_AR = os.path.join(FDIR, "plex-ar-400.ttf")
F_AR_SEMI = os.path.join(FDIR, "plex-ar-600.ttf")
F_LAT = os.path.join(FDIR, "plex-latin-400.ttf")
F_LAT_SEMI = os.path.join(FDIR, "plex-latin-600.ttf")

TEAL = (52, 208, 184)
CYAN = (127, 215, 232)
BRASS = (217, 185, 106)
TEXT = (233, 237, 242)
SOFT = (195, 204, 214)
MUTED = (139, 151, 165)
FAINT = (93, 105, 117)

ARABIC_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]+")
_cache = {}


def F(path, size):
    k = (path, size)
    if k not in _cache:
        _cache[k] = ImageFont.truetype(path, size)
    return _cache[k]


def shape_ar(s):
    return get_display(arabic_reshaper.reshape(s))


def runs(text):
    """يقسّم النص إلى مقاطع عربية / غير عربية."""
    out, pos = [], 0
    for m in ARABIC_RE.finditer(text):
        if m.start() > pos:
            out.append(("lat", text[pos:m.start()]))
        out.append(("ar", m.group()))
        pos = m.end()
    if pos < len(text):
        out.append(("lat", text[pos:]))
    return out


def runs_rtl(text):
    """يعيد المقاطع مرتّبة بصريًا (يمين ← يسار)."""
    return runs(text)[::-1]


def measure(text, ar_font, lat_font):
    w = 0.0
    for kind, seg in runs(text):
        if not seg:
            continue
        f = ar_font if kind == "ar" else lat_font
        s = shape_ar(seg) if kind == "ar" else seg
        w += f.getlength(s)
    return w


def draw_rtl(img, xy, text, size, fill, ar_path=F_AR, lat_path=F_LAT, anchor="r"):
    """
    anchor: r | l | m  (على المحور الأفقي)، y = خط الأساس (baseline).
    يفترض سياقًا RTL: يبدأ النص من اليمين.
    """
    ar_f, lat_f = F(ar_path, size), F(lat_path, size)
    total = measure(text, ar_f, lat_f)
    x = xy[0] - total if anchor == "r" else (xy[0] - total / 2 if anchor == "m" else xy[0])
    d = ImageDraw.Draw(img)
    for kind, seg in runs_rtl(text):
        if not seg:
            continue
        f = ar_f if kind == "ar" else lat_f
        s = shape_ar(seg) if kind == "ar" else seg
        d.text((x, xy[1]), s, font=f, fill=fill, anchor="ls")
        x += f.getlength(s)
    return total


# ---------------------------------------------------------------- utils
def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def diagonal_gradient(size, stops):
    w, h = size
    small = Image.new("RGB", (64, 64))
    px = small.load()
    for y in range(64):
        for x in range(64):
            t = x / 63 * 0.5 + y / 63 * 0.5
            for i in range(len(stops) - 1):
                p0, c0 = stops[i]
                p1, c1 = stops[i + 1]
                if p0 <= t <= p1:
                    px[x, y] = lerp(c0, c1, (t - p0) / max(1e-6, p1 - p0))
                    break
            else:
                px[x, y] = stops[-1][1]
    return small.resize((w, h), Image.LANCZOS)


def radial(size, center, radius, color, alpha):
    w, h = size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    steps = 44
    for i in range(steps, 0, -1):
        t = i / steps
        r = radius * t
        a = int(alpha * (1 - t) ** 1.9)
        if a <= 0:
            continue
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (a,))
    return layer.filter(ImageFilter.GaussianBlur(radius * 0.06))


def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def draw_monogram(img, box, fg, size):
    """يرسم حرف «ت» الحقيقي بخط IBM Plex Sans Arabic داخل box."""
    x, y, w, h = box
    f = F(F_AR_SEMI, int(size))
    s = shape_ar("\u062a")
    tmp = Image.new("RGBA", (int(size * 2), int(size * 2.4)), (0, 0, 0, 0))
    td = ImageDraw.Draw(tmp)
    td.text((tmp.width // 2, int(size * 1.9)), s, font=f, fill=fg, anchor="mm")
    bb = tmp.getbbox()
    if not bb:
        return
    crop = tmp.crop(bb)
    scale = min(w / crop.width, h / crop.height)
    nw, nh = max(1, int(crop.width * scale)), max(1, int(crop.height * scale))
    crop = crop.resize((nw, nh), Image.LANCZOS)
    img.alpha_composite(crop, (int(x + (w - nw) / 2), int(y + (h - nh) / 2)))


# ---------------------------------------------------------------- OG cover
def build_og():
    W, H = 1200, 630
    base = diagonal_gradient((W, H), [(0.0, (7, 11, 16)), (0.55, (10, 17, 25)), (1.0, (13, 22, 32))]).convert("RGBA")
    base.alpha_composite(radial((W, H), (1000, 40), 640, TEAL, 92))
    base.alpha_composite(radial((W, H), (60, 610), 540, BRASS, 68))
    base.alpha_composite(radial((W, H), (620, 720), 700, (45, 120, 170), 62))

    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, W, 72):
        gd.line([(x, 0), (x, H)], fill=(255, 255, 255, 13), width=1)
    for y in range(0, H, 72):
        gd.line([(0, y), (W, y)], fill=(255, 255, 255, 13), width=1)
    base.alpha_composite(grid)

    ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    cx, cy, r = 962, 248, 148
    for i in range(0, 360, 8):
        a = math.radians(i)
        px, py = cx + r * math.cos(a), cy + r * math.sin(a)
        rd.ellipse([px - 2.3, py - 2.3, px + 2.3, py + 2.3], fill=lerp(TEAL, BRASS, i / 360) + (120,))
    rd.ellipse([cx - 194, cy - 194, cx + 194, cy + 194], outline=(255, 255, 255, 20), width=1)
    base.alpha_composite(ring)

    wave = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wave)
    pts, x = [], -20
    while x <= 604:
        k = (x % 300) / 300
        y = 516.0
        if 0.30 < k < 0.44:
            y -= 26 * math.sin((k - 0.30) / 0.14 * math.pi)
        elif 0.48 < k < 0.66:
            t = (k - 0.48) / 0.18
            y -= 36 * math.sin(t * math.pi) + 13 * math.sin(t * math.pi * 2)
        pts.append((x, y))
        x += 3
    wd.line(pts, fill=TEAL + (110,), width=2, joint="curve")
    base.alpha_composite(wave)

    d = ImageDraw.Draw(base)
    chip = diagonal_gradient((74, 74), [(0.0, TEAL), (0.5, CYAN), (1.0, BRASS)]).convert("RGBA")
    base.paste(chip, (78, 82), rounded_mask((74, 74), 21))
    draw_monogram(base, (78 + 15, 82 + 14, 44, 44), (4, 16, 14, 255), 64)

    d.text((188, 119), "TAFKIR  ·  TFKIR.NET", font=F(F_LAT_SEMI, 20), fill=MUTED, anchor="lm")

    draw_rtl(base, (1122, 296), "الدكتور ياسر حسن", 82, TEXT + (255,), F_AR_SEMI, F_LAT_SEMI)
    draw_rtl(base, (1122, 386), "الطب، والفكرة التي تسبقه", 50, TEAL + (255,), F_AR_SEMI, F_LAT_SEMI)
    draw_rtl(base, (1122, 444), "التفكير الطبي · الأفكار والمقالات · المشاريع · المحاضرات", 27, SOFT + (255,))

    chips = ["التفكير الطبي", "أفكار ومقالات", "مشاريع", "محاضرات"]
    cols = [TEAL, BRASS, CYAN, BRASS]
    f_chip = F(F_AR, 21)
    lat_chip = F(F_LAT, 21)
    x = 1122
    for label, col in zip(chips, cols):
        w = int(measure(label, f_chip, lat_chip)) + 46
        x -= w
        rrect = Image.new("RGBA", (w, 50), (0, 0, 0, 0))
        ImageDraw.Draw(rrect).rounded_rectangle([0, 0, w - 1, 49], radius=25,
                                                fill=(255, 255, 255, 14), outline=col + (105,), width=1)
        base.alpha_composite(rrect, (x, 486))
        draw_rtl(base, (x + w - 23, 520), label, 21, SOFT + (255,))
        x -= 12

    d.line([(78, 572), (1122, 572)], fill=(255, 255, 255, 28), width=1)
    d.text((1122, 584), "tfkir.net", font=F(F_LAT, 20), fill=FAINT, anchor="rm")

    base.convert("RGB").save(os.path.join(IMG, "og-cover.png"), "PNG", optimize=True)
    print("  ✓ og-cover.png  1200×630")


# ---------------------------------------------------------------- icons
def build_icon(size, name, bleed=False):
    grad = diagonal_gradient((size, size), [(0.0, TEAL), (0.5, CYAN), (1.0, BRASS)]).convert("RGBA")
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    if bleed:
        bg = diagonal_gradient((size, size), [(0.0, (14, 44, 50)), (0.6, (12, 24, 34)), (1.0, (28, 24, 15))]).convert("RGBA")
        layer.alpha_composite(bg)
        d.ellipse([size * .07, size * .07, size * .93, size * .93], outline=(255, 255, 255, 26), width=max(1, size // 88))
        d.ellipse([size * .13, size * .13, size * .87, size * .87], outline=TEAL + (72,), width=max(1, size // 110))
        draw_monogram(layer, (size * .22, size * .24, size * .56, size * .52), TEAL + (245,), int(size * .56))
        img = layer
    else:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        img.paste(grad, (0, 0), rounded_mask((size, size), int(size * 0.225)))
        draw_monogram(img, (size * .22, size * .24, size * .56, size * .52), (4, 16, 14, 255), int(size * .56))
    img.save(os.path.join(IMG, name), "PNG", optimize=True)
    print(f"  ✓ {name}  {size}×{size}")


build_og()
build_icon(192, "icon-192.png")
build_icon(512, "icon-512.png")
build_icon(180, "apple-touch-icon.png", bleed=True)
build_icon(32, "favicon-32.png")
print("done")

# ---------------------------------------------------------------- favicon.svg
def build_favicon_svg():
    """يصدّر حرف «ت» من الخط كمسار SVG دقيق (بدون اعتماد على خطوط خارجية)."""
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    import arabic_reshaper as _ar

    tt = TTFont(F_AR_SEMI)
    gs = tt.getGlyphSet()
    upem = tt["head"].unitsPerEm
    code = _ar.reshape("ت")
    from fontTools.ttLib.tables._c_m_a_p import table__c_m_a_p
    cmap = tt.getBestCmap()
    gname = cmap.get(ord(code[0]))
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}")
    gs[gname].draw(pen)
    path = pen.getCommands()

    VB = 128
    scale = 96 / upem          # الحرف يملأ 96 من 128
    tx, ty = (VB - 96) / 2, (VB - 96) / 2 + 26

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VB} {VB}" width="{VB}" height="{VB}" role="img" aria-label="تفكير">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#34d0b8"/>
      <stop offset=".45" stop-color="#7fd7e8"/>
      <stop offset="1" stop-color="#d9b96a"/>
    </linearGradient>
  </defs>
  <rect width="{VB}" height="{VB}" rx="30" fill="url(#g)"/>
  <g transform="translate({tx:.1f} {ty:.1f}) scale({scale:.4f})">
    <path d="{path}" fill="#04100e"/>
  </g>
</svg>
'''
    with open(os.path.join(ROOT, "favicon.svg"), "w", encoding="utf-8") as fh:
        fh.write(svg)
    print("  ✓ favicon.svg")


build_favicon_svg()
