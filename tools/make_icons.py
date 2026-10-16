# アプリアイコンを作る（方眼の上に、基準線と穴・軸の公差域、膜厚で重なった部分）。python tools/make_icons.py（Pillow が必要）
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'icons'
BG, GRID, WHITE, HOLE, SHAFT, OVER = (29, 92, 150), (50, 112, 168), (255, 255, 255), (170, 205, 240), (240, 160, 122), (255, 225, 210)

def draw(size, maskable=False):
    s = 4 * size  # 4 倍で描いて縮小（縁を滑らかにする）
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if maskable:
        d.rectangle([0, 0, s, s], fill=BG)
        k = 0.72  # 円形に切り抜かれても収まる大きさ
    else:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=s * 0.2, fill=BG)
        k = 1.0
    step = s / 8
    for i in range(1, 8):
        d.line([i * step, 0, i * step, s], fill=GRID, width=max(1, s // 256))
        d.line([0, i * step, s, i * step], fill=GRID, width=max(1, s // 256))
    if not maskable:
        mask = Image.new('L', (s, s), 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1], radius=s * 0.2, fill=255)
        im.putalpha(mask)
        d = ImageDraw.Draw(im)
    c = s / 2
    P = lambda x, y: (c + x * s * k, c + y * s * k)  # 中心からの比率で置く
    w = round(s * 0.022 * k)
    # 基準線
    d.line([P(-0.38, 0.14), P(0.38, 0.14)], fill=WHITE, width=w)
    # 穴の公差域（基準線から上）と、軸の公差域（膜厚で上に伸びた）
    d.rectangle([P(-0.28, -0.14), P(-0.04, 0.14)], fill=HOLE)
    d.rectangle([P(0.04, -0.26), P(0.28, 0.06)], fill=SHAFT)
    # 重なり（干渉）
    d.rectangle([P(-0.04, -0.14), P(0.04, 0.06)], fill=OVER)
    d.line([P(-0.28, -0.14), P(0.28, -0.14)], fill=OVER, width=round(w * 0.6))
    d.line([P(-0.28, 0.06), P(0.28, 0.06)], fill=OVER, width=round(w * 0.6))
    return im.resize((size, size), Image.LANCZOS)

OUT.mkdir(exist_ok=True)
draw(512).save(OUT / 'icon-512.png')
draw(192).save(OUT / 'icon-192.png')
draw(512, maskable=True).save(OUT / 'icon-maskable-512.png')
im = draw(180)
bg = Image.new('RGBA', im.size, BG + (255,)); bg.alpha_composite(im); bg.convert('RGB').save(OUT / 'apple-touch-icon.png')
