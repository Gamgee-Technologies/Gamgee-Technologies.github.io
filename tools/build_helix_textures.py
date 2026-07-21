#!/usr/bin/env python3
"""Bake the helix photo textures.

The helix renders each dog photo onto a small plane roughly 55 CSS px wide, so
the full-size source JPGs (~500x375, 2.7 MB total) were being thrown away by a
runtime downscale into a 128x96 canvas. This bakes the same white frame the
renderer used to draw at runtime directly into 160x120 WebP files, which drops
the payload to ~176 KB and removes 50 canvas + CanvasTexture uploads from the
main thread.

Usage: python tools/build_helix_textures.py
"""

from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "helix"
OUT = SRC / "tex"

# Power-of-two so WebGL1 can mipmap without three.js rescaling each texture at
# runtime. The plane is ~3x minified on screen, so the mip chain is what keeps
# the thin white frame from aliasing.
#
# The frame is uneven in texture space on purpose. The plane is PHOTO_W/PHOTO_H
# = 1.253 times wider than it is tall, so a border that reads as equal thickness
# on screen needs BORDER_Y = 1.253 * BORDER_X. Keep this in step with PHOTO_W /
# PHOTO_H in index.html — changing SEAM there changes this ratio.
SIZE = 128
BORDER_X = 6
PLANE_ASPECT = 1.253
BORDER_Y = round(BORDER_X * PLANE_ASPECT)
QUALITY = 82


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    names = sorted(p.name for p in SRC.glob("dog_*.jpg"))
    if not names:
        raise SystemExit(f"no dog_*.jpg found in {SRC}")

    manifest, total = [], 0
    for name in names:
        src = Image.open(SRC / name).convert("RGB")
        canvas = Image.new("RGB", (SIZE, SIZE), (255, 255, 255))
        # Stretch to fill the framed area, exactly as framedTex() did.
        inner = src.resize((SIZE - 2 * BORDER_X, SIZE - 2 * BORDER_Y), Image.LANCZOS)
        canvas.paste(inner, (BORDER_X, BORDER_Y))

        out_name = Path(name).with_suffix(".webp").name
        dest = OUT / out_name
        canvas.save(dest, "WEBP", quality=QUALITY, method=6)
        total += dest.stat().st_size
        manifest.append(out_name)

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"wrote {len(manifest)} textures -> {OUT}")
    print(f"total {total/1024:.0f} KB, avg {total/len(manifest)/1024:.1f} KB")


if __name__ == "__main__":
    main()
