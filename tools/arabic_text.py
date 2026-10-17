# -*- coding: utf-8 -*-
"""
harfbuzz + fontTools + numpy
توليد نصوص عربية بتشكيل صحيح (وصل + تشكيل + ترتيب RTL) وتحويلها إلى مسار قابل للرسم.
يعمل بلا libraqm.
"""
import numpy as np
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

SS = 4  # supersampling


class FlattenPen(BasePen):
    """يحوّل مسارات الخط إلى مضلعات (polylines) مع تسطيح المنحنيات."""

    def __init__(self, glyphSet, steps=8):
        super().__init__(glyphSet)
        self.contours = []
        self._cur = []
        self.steps = steps

    def _moveTo(self, p):
        if len(self._cur) > 2:
            self.contours.append(self._cur)
        self._cur = [p]

    def _lineTo(self, p):
        self._cur.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self._cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            u = 1 - t
            x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0]
            y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
            self._cur.append((x, y))

    def _qCurveToOne(self, p1, p2):
        p0 = self._cur[-1]
        for i in range(1, self.steps + 1):
            t = i / self.steps
            u = 1 - t
            x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0]
            y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]
            self._cur.append((x, y))

    def _closePath(self):
        if len(self._cur) > 2:
            self.contours.append(self._cur)
        self._cur = []

    def done(self):
        if len(self._cur) > 2:
            self.contours.append(self._cur)
        self._cur = []
        return self.contours


class Font:
    def __init__(self, path, upem=None):
        self.path = path
        self.tt = TTFont(path, fontNumber=0, lazy=False)
        self.glyphset = self.tt.getGlyphSet()
        self.order = self.tt.getGlyphOrder()
        blob = hb.Blob.from_file_path(path)
        self.face = hb.Face(blob)
        self.upem = upem or self.face.upem
        self.hbfont = hb.Font(self.face)
        self.ascender = getattr(self.tt, "hhea", None)
        self._cache = {}

    def contours(self, gname):
        if gname not in self._cache:
            pen = FlattenPen(self.glyphset, steps=10)
            self.glyphset[gname].draw(pen)
            self._cache[gname] = pen.done()
        return self._cache[gname]

    def shape(self, text, size, direction="rtl", script="Arab", language="ar"):
        """يعيد (polygons, advance) بوحدات البكسل، مع أصل السطر عند (0,0)."""
        buf = hb.Buffer()
        buf.add_str(text)
        buf.direction = direction
        buf.script = script
        buf.language = language
        hb.shape(self.hbfont, buf, {"kern": True, "liga": True})
        scale = size / self.upem
        polys = []
        pen_x = 0.0
        pen_y = 0.0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            gname = self.order[info.codepoint]
            dx = (pen_x + pos.x_offset) * scale
            dy = (pen_y + pos.y_offset) * scale
            for c in self.contours(gname):
                polys.append([(dx + px * scale, dy - py * scale) for (px, py) in c])
            pen_x += pos.x_advance
            pen_y += pos.y_advance
        return polys, pen_x * scale

    def measure(self, text, size):
        return self.shape(text, size)[1]


def rasterize(size, polys, color, offset=(0, 0), ss=SS):
    """يعيد صورة RGBA شفافة تحوي المضلعات (تعبئة nonzero winding)."""
    from PIL import Image, ImageDraw

    W, H = size
    if not polys:
        return Image.new("RGBA", (W, H), (0, 0, 0, 0))

    xs = [p[0] for poly in polys for p in poly]
    ys = [p[1] for poly in polys for p in poly]
    ox, oy = float(offset[0]), float(offset[1])

    minx = max(0, int(np.floor(min(xs) + ox)) - 2)
    maxx = min(W, int(np.ceil(max(xs) + ox)) + 2)
    miny = max(0, int(np.floor(min(ys) + oy)) - 2)
    maxy = min(H, int(np.ceil(max(ys) + oy)) + 2)
    bw, bh = maxx - minx, maxy - miny
    if bw <= 0 or bh <= 0:
        return Image.new("RGBA", (W, H), (0, 0, 0, 0))

    x0 = minx * ss
    y0 = miny * ss
    gw, gh = bw * ss, bh * ss
    acc = np.zeros((gh, gw), dtype=np.int32)

    for poly in polys:
        pts = [(x * ss + x0, y * ss + y0) for (x, y) in poly]
        n = len(pts)
        for i in range(n):
            ax, ay = pts[i]
            bx, by = pts[(i + 1) % n]
            if ay == by:
                continue
            if ay < by:
                sign, ya, yb, xa, xb = 1, ay, by, ax, bx
            else:
                sign, ya, yb, xa, xb = -1, by, ay, bx, ax
            rows = np.arange(int(np.floor(ya)), int(np.ceil(yb)))
            rows = rows[(rows >= 0) & (rows < gh)]
            if rows.size == 0:
                continue
            t = (rows - ya) / (by - ay)
            xint = np.floor(xa + (xb - xa) * t).astype(np.int64)
            xint = np.clip(xint, 0, gw - 1)
            np.add.at(acc, (rows, xint), sign)
            nxt = np.clip(xint + 1, 0, gw - 1)
            np.add.at(acc, (rows, nxt), -sign)

    cov = np.cumsum(acc, axis=1)
    mask = (cov != 0).astype(np.float32)
    mask = mask.reshape(bh, ss, bw, ss).mean(axis=(1, 3))
    alpha = np.clip(mask * 255, 0, 255).astype(np.uint8)

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rectangle([minx, miny, maxx - 1, maxy - 1], fill=color)
    a = Image.new("L", (W, H), 0)
    a.paste(Image.fromarray(alpha, "L"), (minx, miny))
    layer.putalpha(a)
    return layer


def text_layer(W, H, draw_fn):
    """
    draw_fn(fn, mask, offset) — يرسم ملوّنًا فوق قناع رمادي.
    يعيد صورة RGBA.
    """
    from PIL import Image

    mask = Image.new("L", (W, H), 0)
    draw_fn(lambda polys, off: mask.alpha_composite(
        _mask_from(mask, polys, off)), None)
    return mask


def _mask_from(base, polys, off):
    from PIL import Image
    W, H = base.size
    m = rasterize((W, H), polys, (255, 255, 255, 255), off)
    out = base.copy()
    out.alpha_composite(m)
    return out


def draw_text(canvas, font, xy, text, size, fill, anchor="ra", direction="rtl"):
    """
    يرسم نصًا عربيًا (أو لاتينيًا) على canvas PIL.
    anchor: مبني على نموذج "ra" (يمين/أسفل) مثل Pillow.
    """
    from PIL import Image, ImageDraw

    W, H = canvas.size
    direction = "ltr" if all(ord(c) < 0x0590 for c in text) else direction
    polys, adv = font.shape(text, size, direction=direction,
                            script="Arab" if direction == "rtl" else "Latn",
                            language="ar" if direction == "rtl" else "en")
    if not polys:
        return 0
    xs = [p[0] for poly in polys for p in poly]
    ys = [p[1] for poly in polys for p in poly]
    bx0, bx1 = min(xs), max(xs)
    by0, by1 = min(ys), max(ys)
    tw, th = bx1 - bx0, by1 - by0

    ax, ay = anchor[0], anchor[1]
    if ax == "r":
        x = -bx0
    elif ax == "m":
        x = -(bx0 + bx1) / 2
    else:
        x = -bx1
    if ay == "a":      # ascender
        y = -by0
    elif ay == "m":
        y = -(by0 + by1) / 2
    elif ay == "s":    # baseline
        y = 0
    else:              # descender
        y = -by1

    ox, oy = xy[0] + x, xy[1] + y
    layer = rasterize((W, H), polys, fill, (ox, oy))
    canvas.alpha_composite(layer)
    return adv