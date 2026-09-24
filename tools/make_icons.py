# -*- coding: utf-8 -*-
"""Sinh logo, biểu tượng và ảnh chia sẻ mạng xã hội từ tệp logo gốc.

    pip install pillow fonttools brotli && python3 tools/make_icons.py

Nguồn: src/brand/logo-lsn.webp (logo gốc, nền trong suốt), assets/img/hero.webp, phông Be Vietnam Pro.
Kết quả trong assets/img/: logo-lsn.webp (đầu trang, chân trang), favicon-32.png,
icon-192.png, icon-512.png (trong suốt), apple-touch-icon.png (nền trắng, iOS không hỗ trợ nền trong suốt)
và og-image.jpg (1200×630, ảnh hiển thị khi chia sẻ liên kết).
"""
import io
import os
import sys
import unicodedata

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data import FIRM  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "brand", "logo-lsn.webp")
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


def og_image(logo):
    W, H, navy, gold = 1200, 630, (4, 27, 45), (227, 192, 141)
    hero = Image.open(os.path.join(OUT, "hero.webp")).convert("RGB")
    hero = hero.resize((round(hero.width * H / hero.height), H), Image.LANCZOS).crop((20, 0, 20 + W, H))
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
    x = text((tx, y0 + 26), "LSN", font(700, 50), gold, 6)
    text((x + 14, y0 + 26), "LAW FIRM", font(500, 50), (241, 223, 194), 6)
    text((tx + 2, y0 + 92), FIRM["slogan"].upper(), font(500, 15), (205, 182, 144), 2.2)
    d.rectangle((x0, 300, x0 + 88, 301), fill=gold)
    text((x0, 326), FIRM["legal_name"].replace("Công Ty", "Công ty"), font(600, 36), (255, 255, 255))
    text((x0, 380), "Tư vấn & tranh tụng tại TP. Hồ Chí Minh", font(400, 25), (196, 204, 216))
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
    og_image(logo)
    print("Đã sinh logo, biểu tượng và ảnh chia sẻ trong assets/img/.")


if __name__ == "__main__":
    main()
