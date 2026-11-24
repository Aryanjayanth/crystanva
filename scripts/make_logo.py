# Turns the cream-background logo JPEG into transparent PNGs (full logo + crystal icon).
import numpy as np
from PIL import Image
src = Image.open("public/logo.jpeg").convert("RGB")
a = np.asarray(src).astype(float)
bg = np.median(a[20:80, 20:200].reshape(-1, 3), axis=0)
d = np.sqrt(((a - bg) ** 2).sum(axis=2))
alpha = np.clip((d - 10) / 40, 0, 1)
# un-premultiply against bg so edges don't carry a cream halo
al = np.maximum(alpha, 1e-3)[..., None]
rgb = np.clip((a - bg * (1 - alpha[..., None])) / al, 0, 255)
out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
img = Image.fromarray(out, "RGBA")
img.crop((300, 120, 1110, 600)).save("public/logo-full.png")
img.crop((570, 130, 835, 435)).save("public/crystal.png")
print(bg)
