import type { Pattern } from "./products";

/** Draws one tile of a fabric pattern. Used by the try-on as a repeating canvas pattern. */
export function patternTile(pattern: Pattern, hex: string, accent: string, size = 64): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = hex;
  g.fillRect(0, 0, size, size);
  g.fillStyle = accent;
  switch (pattern) {
    case "stripes":
      g.fillRect(0, size * 0.55, size, size * 0.3);
      break;
    case "checks":
      g.globalAlpha = 0.55;
      g.fillRect(0, size * 0.1, size, size * 0.22);
      g.fillRect(size * 0.1, 0, size * 0.22, size);
      g.globalAlpha = 0.35;
      g.fillRect(0, size * 0.62, size, size * 0.06);
      g.fillRect(size * 0.62, 0, size * 0.06, size);
      g.globalAlpha = 1;
      break;
    case "dots":
      for (const [x, y] of [
        [0.25, 0.25],
        [0.75, 0.75],
      ]) {
        g.beginPath();
        g.arc(x * size, y * size, size * 0.09, 0, Math.PI * 2);
        g.fill();
      }
      break;
    case "solid":
      // A faint weave so solid fabric doesn't look like flat paint.
      g.globalAlpha = 0.05;
      g.fillStyle = "#000";
      for (let i = 0; i < size; i += 4) g.fillRect(0, i, size, 1);
      g.globalAlpha = 1;
      break;
  }
  return c;
}

export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + 255 * amount)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
