# -*- coding: utf-8 -*-
"""Sinh toàn bộ hình ảnh thương hiệu từ ảnh gốc.

    pip install pillow numpy opencv-python-headless fonttools brotli
    python3 tools/make_images.py

Nguồn (thư mục src/, không xuất bản):
    src/brand/logo-lsn.webp         Logo gốc, nền trong suốt
    src/brand/goc/hero.webp         Ảnh banner gốc (còn biển tường kiểu cũ)
    src/brand/goc/dich-vu/*.webp    Ảnh gốc 8 lĩnh vực

Kết quả trong assets/img/:
    logo-lsn.webp, favicon-32.png, icon-192.png, icon-512.png, apple-touch-icon.png
    hero.webp          Banner: xoá biển tường cũ, gắn biển mới (logo + chữ Be Vietnam Pro)
    dich-vu/*.webp     Ảnh lĩnh vực chỉnh cùng một tông navy – vàng đồng, viền chỉ vàng
    og-image.jpg       Ảnh chia sẻ liên kết 1200×630, dựng từ banner mới
"""
import glob
import io
import os
import sys
import unicodedata

import cv2
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data import FIRM  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "brand", "logo-lsn.webp")
GOC = os.path.join(ROOT, "src", "brand", "goc")
NAVY, GOLD = (4, 27, 46), (227, 192, 141)
OUT = os.path.join(ROOT, "assets", "img")


def square(im):
    im = im.crop(im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
    side = max(im.size)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2))
    return sq


def fit(logo, size, pad=0.0, bg=(0, 0, 0, 0)):
    inner = round(size * (1 - 2 * pad))
    canvas = Image.new("RGBA", (size, size), bg)
    mark = logo.resize((inner, inner), Image.LANCZOS)
    off = (size - inner) // 2
    canvas.paste(mark, (off, off), mark)
    return canvas


def font(weight, size):
    """Be Vietnam Pro tự lưu trữ (woff2, tách latin/vietnamese) gộp lại thành một phông cho Pillow."""
    from fontTools.merge import Merger
    from fontTools.ttLib import TTFont
    bufs = []
    for sub in ("latin", "vietnamese"):
        f = TTFont(os.path.join(ROOT, "assets", "fonts", f"be-vietnam-pro-{weight}-normal-{sub}.woff2"))
        f.flavor = None
        b = io.BytesIO()
        f.save(b)
        b.seek(0)
        bufs.append(b)
    out = io.BytesIO()
    Merger().merge(bufs).save(out)
    out.seek(0)
    return ImageFont.truetype(out, size)


def clean_wall(img):
    """Xoá biển chữ cũ trên tường đá: ánh sáng nền nội suy từ vùng đá sạch, vân đá ghép từ các ô đá thật."""
    img = img.astype(np.float32)
    H, W = img.shape[:2]
    mask = np.zeros((H, W), np.float32)
    for x0, y0, x1, y1 in [(955, 120, 1266, 294), (965, 266, 1262, 352), (905, 358, 1336, 434)]:
        mask[y0:y1, x0:x1] = 1
    out = img.copy()
    ya, yb = 356, 437  # nẹp gỗ bên trái tường: nội suy theo chiều dọc
    for x in range(862, 906):
        for y in range(ya + 1, yb):
            t = (y - ya) / (yb - ya)
            out[y, x] = img[ya, x] * (1 - t) + img[yb, x] * t
    wall = np.zeros((H, W), np.float32)
    wall[0:470, 906:W] = 1
    w = wall * (1 - mask)
    low, filled = np.zeros_like(img), np.zeros((H, W), bool)
    for sig in (12, 24, 48, 96, 192):
        den = cv2.GaussianBlur(w, (0, 0), sig)
        est = cv2.GaussianBlur(img * w[..., None], (0, 0), sig) / np.maximum(den, 1e-6)[..., None]
        take = (den > .25) & ~filled
        low[take] = est[take]
        filled |= den > .25
    low[~filled] = est[~filled]
    low = cv2.GaussianBlur(low, (0, 0), 14)
    hp = img - cv2.GaussianBlur(img, (0, 0), 3)
    src = cv2.erode(w, np.ones((9, 9))) > 0
    ys, xs = np.where(src[:470])
    rng, B = np.random.default_rng(3), 36
    tex = np.zeros_like(img)
    for y in range(110, 440, B):
        for x in range(900, W, B):
            for _ in range(200):
                i = rng.integers(len(ys))
                sy, sx = ys[i], xs[i]
                if sy + B < 470 and sx + B < W and src[sy:sy + B, sx:sx + B].all():
                    break
            h, ww = min(B, H - y), min(B, W - x)
            tex[y:y + h, x:x + ww] = hp[sy:sy + h, sx:sx + ww]
    mb = cv2.GaussianBlur(mask, (0, 0), 5)[..., None]
    return np.clip(out * (1 - mb) + (low + tex) * mb, 0, 255).astype(np.uint8)


def hero(logo, xc=1076):
    base = cv2.cvtColor(cv2.imread(os.path.join(GOC, "hero.webp")), cv2.COLOR_BGR2RGB)
    img = Image.fromarray(clean_wall(base)).convert("RGBA")
    W, H = img.size
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    for s, f, y, sp in [("CÔNG TY LUẬT TNHH", font(500, 15), 294, 5), ("LUẬT SƯ NAM", font(700, 42), 322, 4),
                        ("UY TÍN · CHUYÊN NGHIỆP · HIỆU QUẢ", font(500, 12.5), 400, 2.4)]:
        s = unicodedata.normalize("NFC", s)
        x = xc - (sum(d.textlength(ch, font=f) for ch in s) + sp * (len(s) - 1)) / 2
        for ch in s:
            d.text((x, y), ch, font=f, fill=255)
            x += d.textlength(ch, font=f) + sp
    black = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    # Chữ nổi cách tường: bóng đổ, cạnh dày tối, mặt chữ vàng đồng chuyển sắc
    img = Image.composite(black, img, ImageChops.offset(m, 5, 7).filter(ImageFilter.GaussianBlur(5)).point(lambda v: int(v * .75)))
    img = Image.composite(Image.new("RGBA", (W, H), (92, 64, 30, 255)), img, ImageChops.offset(m, 1, 2))
    t = np.linspace(0, 1, H)[:, None, None]
    face = (np.array([246, 226, 184]) * (1 - t) + np.array([196, 150, 88]) * t) * np.ones((1, W, 1))
    face = Image.fromarray(np.dstack([face.astype(np.uint8), np.full((H, W), 255, np.uint8)]), "RGBA")
    img = Image.composite(face, img, m)
    # Logo gắn tường: bóng đổ và dịu màu trắng theo ánh sáng phòng
    size, lx, ly = 128, int(xc - 64), 140
    mark = logo.resize((size, size), Image.LANCZOS)
    a = mark.getchannel("A")
    sh = Image.new("L", (W, H), 0)
    sh.paste(a, (lx + 6, ly + 9))
    img = Image.composite(black, img, sh.filter(ImageFilter.GaussianBlur(7)).point(lambda v: int(v * .8)))
    arr = np.array(mark).astype(np.float32)
    arr[..., :3] *= np.array([.86, .82, .76])
    img.alpha_composite(Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA"), (lx, ly))
    img.convert("RGB").save(os.path.join(OUT, "hero.webp"), "WEBP", quality=86, method=6)


def services():
    """Ảnh 8 lĩnh vực: cùng tông navy – vàng đồng (duotone), bóng tối phía dưới, viền chỉ vàng."""
    stops = np.array([0, 1 / 3, 2 / 3, 1])
    table = [(.012, .12, .62, .97), (.08, .2, .52, .9), (.16, .29, .38, .77)]
    for f in sorted(glob.glob(os.path.join(GOC, "dich-vu", "*.webp"))):
        im = np.array(Image.open(f).convert("RGB").resize((600, 300), Image.LANCZOS)).astype(np.float32) / 255
        lum = np.clip((im @ np.array([.3, .59, .11]) - .5) * 1.05 + .5, 0, 1)
        out = np.dstack([np.interp(lum, stops, tv) for tv in table])
        H, W = lum.shape
        y = np.linspace(0, 1, H)[:, None]
        shade = np.clip((y - .45) / .55, 0, 1) * .55
        out = out * (1 - shade[..., None]) + np.array(NAVY) / 255 * shade[..., None]
        yy, xx = np.mgrid[0:H, 0:W]
        glow = np.clip(1 - np.hypot((xx - .8 * W) / (1.2 * W), (yy - .1 * H) / (.9 * H)) / .6, 0, 1) * .18
        out = out * (1 - glow[..., None]) + np.array(GOLD) / 255 * glow[..., None]
        img = Image.fromarray((out * 255).clip(0, 255).astype(np.uint8)).convert("RGBA")
        frame = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(frame).rectangle((12, 12, W - 13, H - 13), outline=GOLD + (115,), width=1)
        img.alpha_composite(frame)
        img.convert("RGB").save(os.path.join(OUT, "dich-vu", os.path.basename(f)), "WEBP", quality=84, method=6)


def og_image(logo):
    W, H, navy, gold = 1200, 630, (4, 27, 45), (227, 192, 141)
    hero = Image.open(os.path.join(OUT, "hero.webp")).convert("RGB")
    hero = hero.resize((round(hero.width * H / hero.height), H), Image.LANCZOS).crop((70, 0, 70 + W, H))
    # Lớp phủ navy: đặc ở nửa trái, nhạt dần sang ảnh
    ramp = Image.linear_gradient("L").rotate(90).resize((W, H))
    mask = ramp.point(lambda v: 255 if v * W / 255 < 470 else max(31, int(255 * max(0, (780 - v * W / 255) / 310) ** 1.3)))
    img = Image.composite(Image.new("RGB", (W, H), navy), hero, mask)
    d = ImageDraw.Draw(img)

    def text(xy, s, f, fill, spacing=0):
        x, y = xy
        for ch in unicodedata.normalize("NFC", s):
            d.text((x, y), ch, font=f, fill=fill)
            x += d.textlength(ch, font=f) + spacing
        return x

    size, x0, y0 = 132, 72, 118
    mark = logo.resize((size, size), Image.LANCZOS)
    img.paste(mark, (x0 - 4, y0), mark)
    tx = x0 + size + 18
    text((tx + 2, y0 + 22), "CÔNG TY LUẬT TNHH", font(500, 18), (205, 182, 144), 4.5)
    text((tx, y0 + 50), "LUẬT SƯ NAM", font(700, 48), gold, 4)
    d.rectangle((x0, 300, x0 + 88, 301), fill=gold)
    text((x0, 326), "Tư vấn & tranh tụng tại TP. Hồ Chí Minh", font(600, 34), (255, 255, 255))
    text((x0, 380), FIRM["slogan"], font(400, 25), (196, 204, 216))
    label, bf = f'Hotline {FIRM["phone"]}', font(600, 23)
    d.rounded_rectangle((x0, 448, x0 + d.textlength(label, font=bf) + 48, 506), radius=4, fill=(114, 1, 21), outline=gold)
    text((x0 + 24, 462), label, bf, (255, 255, 255))
    img.save(os.path.join(OUT, "og-image.jpg"), quality=88, optimize=True, progressive=True)


def main():
    logo = square(Image.open(SRC).convert("RGBA"))
    fit(logo, 160).save(os.path.join(OUT, "logo-lsn.webp"), "WEBP", quality=90, method=6)
    fit(logo, 32).save(os.path.join(OUT, "favicon-32.png"), optimize=True)
    fit(logo, 192, .04).save(os.path.join(OUT, "icon-192.png"), optimize=True)
    fit(logo, 512, .04).save(os.path.join(OUT, "icon-512.png"), optimize=True)
    fit(logo, 180, .08, (255, 255, 255, 255)).convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"), optimize=True)
    hero(logo)
    services()
    og_image(logo)
    print("Đã sinh logo, biểu tượng, banner, ảnh lĩnh vực và ảnh chia sẻ trong assets/img/.")


if __name__ == "__main__":
    main()
