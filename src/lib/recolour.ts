// Recolours the clothes a person is already wearing, using the segmenter's clothes mask.
//
// Each clothes pixel keeps its own brightness relative to the garment's average, so the
// real folds, shadows and lighting stay; only the colour and print change to the product.
// Skin, hair and arms in front of the body are separate classes, so they stay untouched.

import type { Colourway, Pattern } from "./products";
import { patternTile } from "./patterns";
import type { ClothesMask } from "./segmenter";

export class Recolourer {
  private maskSmall = document.createElement("canvas");
  private maskFull = document.createElement("canvas");
  private fabric = document.createElement("canvas");
  private fabricKey = "";
  private fabricData: ImageData | null = null;

  /**
   * Repaints the clothes in `ctx` (which holds the original frame) as `colour`/`pattern`.
   * Returns the share of the frame covered by clothes, so the UI can prompt when none are found.
   */
  render(
    ctx: CanvasRenderingContext2D,
    mask: ClothesMask,
    pattern: Pattern,
    colour: Colourway,
    splitX: number | null = null,
  ): number {
    const { width: w, height: h } = ctx.canvas;

    // Upscale the 256×256 confidence mask to frame size; the canvas resize smooths its edges.
    const small = this.maskSmall;
    if (small.width !== mask.width || small.height !== mask.height) {
      small.width = mask.width;
      small.height = mask.height;
    }
    const sctx = small.getContext("2d")!;
    const mImg = sctx.createImageData(mask.width, mask.height);
    for (let i = 0; i < mask.data.length; i++) mImg.data[i * 4 + 3] = mask.data[i] * 255;
    sctx.putImageData(mImg, 0, 0);
    const full = this.maskFull;
    if (full.width !== w || full.height !== h) {
      full.width = w;
      full.height = h;
    }
    const fctx = full.getContext("2d", { willReadFrequently: true })!;
    fctx.clearRect(0, 0, w, h);
    fctx.imageSmoothingQuality = "high";
    fctx.drawImage(small, 0, 0, w, h);
    const alpha = fctx.getImageData(0, 0, w, h).data;

    const fabric = this.fabricLayer(w, h, pattern, colour).data;
    const frame = ctx.getImageData(0, 0, w, h);
    const px = frame.data;

    // Average brightness of the clothes, so each pixel's shading is measured against it.
    let sum = 0;
    let count = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (alpha[i + 3] > 160) {
        sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        count++;
      }
    }
    const coverage = count / (w * h);
    if (count < 200) return coverage;
    const mean = Math.max(sum / count, 12);

    const startX = splitX === null ? 0 : Math.max(0, Math.floor(splitX));
    for (let y = 0; y < h; y++) {
      for (let x = startX; x < w; x++) {
        const i = (y * w + x) * 4;
        const a = alpha[i + 3] / 255;
        if (a < 0.02) continue;
        const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        // Gentle curve keeps contrast in folds without blowing out highlights.
        const s = Math.min(1.7, Math.max(0.22, Math.pow(lum / mean, 0.85)));
        const k = a * 0.96;
        px[i] = px[i] * (1 - k) + Math.min(255, fabric[i] * s) * k;
        px[i + 1] = px[i + 1] * (1 - k) + Math.min(255, fabric[i + 1] * s) * k;
        px[i + 2] = px[i + 2] * (1 - k) + Math.min(255, fabric[i + 2] * s) * k;
      }
    }
    ctx.putImageData(frame, 0, 0);
    return coverage;
  }

  private fabricLayer(w: number, h: number, pattern: Pattern, colour: Colourway) {
    const key = `${w}x${h}|${pattern}|${colour.hex}|${colour.accent}`;
    if (key === this.fabricKey && this.fabricData) return this.fabricData;
    const c = this.fabric;
    c.width = w;
    c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true })!;
    const tile = patternTile(pattern, colour.hex, colour.accent);
    const p = g.createPattern(tile, "repeat")!;
    // Repeat size relative to the frame, roughly matching real fabric on a torso.
    const repeat = { solid: 0.08, stripes: 0.05, checks: 0.1, dots: 0.06 }[pattern];
    const k = (w * repeat) / tile.width;
    p.setTransform(new DOMMatrix().scaleSelf(k, k));
    g.fillStyle = p;
    g.fillRect(0, 0, w, h);
    this.fabricKey = key;
    this.fabricData = g.getImageData(0, 0, w, h);
    return this.fabricData;
  }
}
