// Draws a garment onto a camera frame or photo, fitted to MediaPipe's 33 body landmarks.
//
// The garment is built from the body, not from a fixed image: the torso panel spans
// the shoulders and hips, and each sleeve follows its own upper arm and forearm, so
// the clothes move with the person. The finished garment is then shaded with the
// photo's own light and folds (soft-light blend) so it sits in the scene.

import type { Colourway, Product } from "./products";
import { patternTile, shade } from "./patterns";

export interface BodyPoint {
  x: number;
  y: number;
  visibility?: number;
}

interface V {
  x: number;
  y: number;
}

// Pose landmark indices.
const NOSE = 0;
const SHOULDER = [11, 12];
const ELBOW = [13, 14];
const WRIST = [15, 16];
const HIP = [23, 24];

const add = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: V, k: number): V => ({ x: a.x * k, y: a.y * k });
const len = (a: V) => Math.hypot(a.x, a.y);
const norm = (a: V): V => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
const lerp = (a: V, b: V, t: number): V => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const dot = (a: V, b: V) => a.x * b.x + a.y * b.y;

const LENGTH: Record<Product["style"], number> = { tee: 1.05, shirt: 1.12, hoodie: 1.1, jacket: 1.04, kurta: 1.85 };
const HEM_FLARE: Record<Product["style"], number> = { tee: 1.0, shirt: 1.02, hoodie: 1.08, jacket: 1.04, kurta: 1.18 };

export type FitResult = "ok" | "no-body" | "too-close";

export class GarmentRenderer {
  private layer = document.createElement("canvas");
  private shadeLayer = document.createElement("canvas");
  private tileKey = "";
  private tile: HTMLCanvasElement | null = null;

  /**
   * Draws `product` in `colour` onto `ctx`, which already holds `frame`.
   * Landmarks are normalised (0..1). With `splitX`, the garment is drawn only to
   * the right of that x, for a before/after comparison.
   */
  render(
    ctx: CanvasRenderingContext2D,
    frame: CanvasImageSource,
    lm: BodyPoint[],
    product: Product,
    colour: Colourway,
    splitX: number | null = null,
  ): FitResult {
    const { width: w, height: h } = ctx.canvas;
    const P = (i: number): V => ({ x: lm[i].x * w, y: lm[i].y * h });
    const vis = (i: number) => lm[i].visibility ?? 1;

    if (vis(SHOULDER[0]) < 0.5 || vis(SHOULDER[1]) < 0.5) return "no-body";
    const s = SHOULDER.map(P);
    const sw = len(sub(s[0], s[1]));
    if (sw < w * 0.06) return "no-body";
    if (sw > w * 0.75) return "too-close";

    // Body frame: `across` runs shoulder to shoulder, `down` runs towards the hips.
    const mid = lerp(s[0], s[1], 0.5);
    const across = norm(sub(s[0], s[1]));
    let down: V = { x: -across.y, y: across.x };
    const hipsVisible = vis(HIP[0]) > 0.5 && vis(HIP[1]) > 0.5;
    const hips = HIP.map(P);
    const hipMid = lerp(hips[0], hips[1], 0.5);
    const towardBody = hipsVisible ? sub(hipMid, mid) : sub(mid, P(NOSE));
    if (dot(down, towardBody) < 0) down = mul(down, -1);

    let torso = hipsVisible ? dot(sub(hipMid, mid), down) : sw * 1.3;
    torso = Math.min(Math.max(torso, sw * 0.9), sw * 1.8);
    const hipW = hipsVisible ? Math.max(len(sub(hips[0], hips[1])) * 1.35, sw * 0.95) : sw * 1.0;

    const style = product.style;
    const at = (base: V, a: number, d: number) => add(base, add(mul(across, a), mul(down, d)));

    // Key points of the torso panel (index 0 = landmark 11's side, 1 = landmark 12's side).
    const sideSign = [1, -1];
    const outerShoulder = s.map((p, k) => at(p, sideSign[k] * sw * 0.2, -sw * 0.06));
    const neck = sideSign.map((k) => at(mid, k * sw * (style === "hoodie" ? 0.2 : 0.16), -sw * 0.14));
    const dipDepth = { tee: 0.04, shirt: 0.1, hoodie: 0.06, jacket: 0.16, kurta: 0.05 }[style];
    const neckDip = at(mid, 0, sw * dipDepth);
    const armpit = outerShoulder.map((p, k) => at(p, -sideSign[k] * sw * 0.08, torso * 0.4));
    const hemHalf = (Math.max(hipW, sw * 1.18) * HEM_FLARE[style]) / 2;
    const hemY = torso * LENGTH[style];
    const hem = sideSign.map((k) => at(mid, k * hemHalf, hemY));
    const waist = sideSign.map((k) => at(mid, k * Math.max(hipW, sw * 1.12) * 0.5, torso * 0.7));

    const torsoPath = new Path2D();
    torsoPath.moveTo(neck[0].x, neck[0].y);
    torsoPath.lineTo(outerShoulder[0].x, outerShoulder[0].y);
    torsoPath.lineTo(armpit[0].x, armpit[0].y);
    torsoPath.quadraticCurveTo(waist[0].x, waist[0].y, hem[0].x, hem[0].y);
    torsoPath.lineTo(hem[1].x, hem[1].y);
    torsoPath.quadraticCurveTo(waist[1].x, waist[1].y, armpit[1].x, armpit[1].y);
    torsoPath.lineTo(outerShoulder[1].x, outerShoulder[1].y);
    torsoPath.lineTo(neck[1].x, neck[1].y);
    torsoPath.quadraticCurveTo(neckDip.x, neckDip.y, neck[0].x, neck[0].y);
    torsoPath.closePath();

    // Sleeves follow the arm: root at the armhole, then elbow, then (long sleeves) wrist.
    const sleevePaths = [0, 1].map((k) => {
      const joint = s[k];
      let elbow = P(ELBOW[k]);
      if (vis(ELBOW[k]) < 0.4) elbow = at(joint, sideSign[k] * sw * 0.15, sw * 0.9);
      let wrist = P(WRIST[k]);
      if (vis(WRIST[k]) < 0.4) wrist = add(elbow, mul(sub(elbow, joint), 0.95));
      const root = lerp(outerShoulder[k], armpit[k], 0.5);
      const spine: { p: V; width: number }[] =
        product.sleeve === "short"
          ? [{ p: lerp(joint, elbow, style === "tee" ? 0.5 : 0.55), width: sw * 0.34 }]
          : [
              { p: elbow, width: sw * 0.27 },
              { p: wrist, width: sw * 0.21 },
            ];
      return sleevePath(outerShoulder[k], armpit[k], root, spine);
    });

    // ---------- paint the garment on its own layer ----------
    const L = this.layer;
    if (L.width !== w || L.height !== h) {
      L.width = w;
      L.height = h;
      this.shadeLayer.width = w;
      this.shadeLayer.height = h;
    }
    const g = L.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    g.clearRect(0, 0, w, h);

    const fabric = this.fabric(g, product, colour, sw, across);

    if (style === "hoodie") {
      // Hood resting on the back of the neck, drawn first so the body overlaps it.
      g.fillStyle = shade(colour.hex, -0.08);
      g.beginPath();
      g.ellipse(mid.x, at(mid, 0, -sw * 0.1).y, sw * 0.34, sw * 0.2, Math.atan2(across.y, across.x), 0, Math.PI * 2);
      g.fill();
    }

    g.fillStyle = fabric;
    g.fill(torsoPath);
    for (const sp of sleevePaths) g.fill(sp);

    // Seams where the sleeves meet the body.
    g.strokeStyle = "rgba(0,0,0,0.18)";
    g.lineWidth = Math.max(1, sw * 0.008);
    for (const sp of sleevePaths) g.stroke(sp);

    this.details(g, product, colour, { mid, across, down, sw, torso, neck, neckDip, hemY, hemHalf, at });

    // Rounded body: darker towards the sides, lighter down the middle.
    g.globalCompositeOperation = "source-atop";
    const left = at(mid, sw * 0.9, 0);
    const right = at(mid, -sw * 0.9, 0);
    const side = g.createLinearGradient(left.x, left.y, right.x, right.y);
    side.addColorStop(0, "rgba(0,0,0,0.28)");
    side.addColorStop(0.3, "rgba(0,0,0,0.04)");
    side.addColorStop(0.5, "rgba(255,255,255,0.05)");
    side.addColorStop(0.7, "rgba(0,0,0,0.04)");
    side.addColorStop(1, "rgba(0,0,0,0.28)");
    g.fillStyle = side;
    g.fillRect(0, 0, w, h);

    // Borrow the photo's light and folds: soft-light the original pixels under the garment.
    const t = this.shadeLayer.getContext("2d")!;
    t.globalCompositeOperation = "source-over";
    t.clearRect(0, 0, w, h);
    t.drawImage(frame, 0, 0, w, h);
    t.globalCompositeOperation = "destination-in";
    t.drawImage(L, 0, 0);
    g.globalCompositeOperation = "soft-light";
    g.globalAlpha = 0.22;
    g.drawImage(this.shadeLayer, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";

    // ---------- composite onto the frame ----------
    ctx.save();
    if (splitX !== null) {
      ctx.beginPath();
      ctx.rect(splitX, 0, w - splitX, h);
      ctx.clip();
    }
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = sw * 0.04;
    ctx.drawImage(L, 0, 0);
    ctx.restore();
    return "ok";
  }

  private fabric(g: CanvasRenderingContext2D, product: Product, colour: Colourway, sw: number, across: V) {
    const key = `${product.pattern}|${colour.hex}|${colour.accent}`;
    if (key !== this.tileKey) {
      this.tile = patternTile(product.pattern, colour.hex, colour.accent);
      this.tileKey = key;
    }
    const pattern = g.createPattern(this.tile!, "repeat")!;
    // Scale the repeat to the body and rotate it with the shoulders.
    const repeat = { solid: 0.25, stripes: 0.16, checks: 0.3, dots: 0.18 }[product.pattern];
    const k = (sw * repeat) / 64;
    const angle = Math.atan2(across.y, across.x);
    pattern.setTransform(new DOMMatrix().rotateSelf(0, 0, (angle * 180) / Math.PI).scaleSelf(k, k));
    return pattern;
  }

  private details(
    g: CanvasRenderingContext2D,
    product: Product,
    colour: Colourway,
    f: {
      mid: V;
      across: V;
      down: V;
      sw: number;
      torso: number;
      neck: V[];
      neckDip: V;
      hemY: number;
      hemHalf: number;
      at: (base: V, a: number, d: number) => V;
    },
  ) {
    const { mid, sw, torso, neck, neckDip, hemY, at } = f;
    const dark = shade(colour.hex, -0.18);
    const line = (a: V, b: V, width: number, color: string) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    };
    const dotAt = (p: V, r: number, color: string) => {
      g.fillStyle = color;
      g.beginPath();
      g.arc(p.x, p.y, r, 0, Math.PI * 2);
      g.fill();
    };
    const neckline = () => {
      const p = new Path2D();
      p.moveTo(neck[1].x, neck[1].y);
      p.quadraticCurveTo(neckDip.x, neckDip.y, neck[0].x, neck[0].y);
      return p;
    };

    switch (product.style) {
      case "tee": {
        g.strokeStyle = dark;
        g.lineWidth = sw * 0.035;
        g.stroke(neckline());
        break;
      }
      case "shirt": {
        // Collar points, placket and buttons.
        g.fillStyle = shade(colour.hex, -0.06);
        for (const k of [0, 1]) {
          const sgn = k === 0 ? 1 : -1;
          g.beginPath();
          g.moveTo(neck[k].x, neck[k].y);
          const tip = at(mid, sgn * sw * 0.07, sw * 0.16);
          const outer = at(mid, sgn * sw * 0.22, sw * 0.02);
          g.lineTo(outer.x, outer.y);
          g.lineTo(tip.x, tip.y);
          g.lineTo(neckDip.x, neckDip.y);
          g.closePath();
          g.fill();
          g.strokeStyle = "rgba(0,0,0,0.2)";
          g.lineWidth = sw * 0.006;
          g.stroke();
        }
        line(neckDip, at(mid, 0, hemY - sw * 0.02), sw * 0.012, "rgba(0,0,0,0.22)");
        for (let i = 1; i <= 5; i++) dotAt(at(mid, sw * 0.012, sw * 0.12 + ((hemY - sw * 0.2) * i) / 5), sw * 0.012, "#f4f1ea");
        break;
      }
      case "hoodie": {
        g.strokeStyle = dark;
        g.lineWidth = sw * 0.05;
        g.stroke(neckline());
        for (const sgn of [1, -1]) {
          line(at(mid, sgn * sw * 0.06, sw * 0.06), at(mid, sgn * sw * 0.08, sw * 0.42), sw * 0.012, "#f4f1ea");
        }
        // Kangaroo pocket.
        const tl = at(mid, sw * 0.32, hemY - torso * 0.42);
        const tr = at(mid, -sw * 0.32, hemY - torso * 0.42);
        const br = at(mid, -sw * 0.42, hemY - sw * 0.08);
        const bl = at(mid, sw * 0.42, hemY - sw * 0.08);
        g.fillStyle = shade(colour.hex, -0.05);
        g.strokeStyle = "rgba(0,0,0,0.2)";
        g.lineWidth = sw * 0.008;
        g.beginPath();
        g.moveTo(tl.x, tl.y);
        g.lineTo(tr.x, tr.y);
        g.lineTo(br.x, br.y);
        g.lineTo(bl.x, bl.y);
        g.closePath();
        g.fill();
        g.stroke();
        line(at(mid, 0, hemY - sw * 0.1), at(mid, 0, hemY - sw * 0.02), sw * 0.07, colour.accent);
        break;
      }
      case "kurta": {
        // Mandarin collar band and a short placket in the accent colour.
        g.strokeStyle = colour.accent;
        g.lineWidth = sw * 0.05;
        g.stroke(neckline());
        line(neckDip, at(mid, 0, torso * 0.45), sw * 0.03, colour.accent);
        for (let i = 0; i < 4; i++) dotAt(at(mid, 0, sw * 0.12 + i * torso * 0.09), sw * 0.014, shade(colour.accent, -0.2));
        // Embroidered border at the hem.
        line(at(mid, f.hemHalf * 0.98, hemY - sw * 0.06), at(mid, -f.hemHalf * 0.98, hemY - sw * 0.06), sw * 0.04, colour.accent);
        break;
      }
      case "jacket": {
        // Open front: cut a gap down the middle so the clothes underneath show.
        g.save();
        g.globalCompositeOperation = "destination-out";
        g.beginPath();
        const top = neckDip;
        const bl = at(mid, sw * 0.09, hemY + sw * 0.02);
        const br = at(mid, -sw * 0.09, hemY + sw * 0.02);
        g.moveTo(top.x, top.y - sw * 0.02);
        g.lineTo(bl.x, bl.y);
        g.lineTo(br.x, br.y);
        g.closePath();
        g.fill();
        g.restore();
        // Collar, chest pocket flaps, waistband and copper stitching.
        g.strokeStyle = shade(colour.hex, -0.12);
        g.lineWidth = sw * 0.06;
        g.stroke(neckline());
        for (const sgn of [1, -1]) {
          const a = at(mid, sgn * sw * 0.18, sw * 0.32);
          const b = at(mid, sgn * sw * 0.42, sw * 0.3);
          line(a, b, sw * 0.07, shade(colour.hex, -0.08));
          dotAt(lerp(a, b, 0.5), sw * 0.016, colour.accent);
          line(at(mid, sgn * sw * 0.12, sw * 0.2), at(mid, sgn * sw * 0.14, hemY - sw * 0.1), sw * 0.008, colour.accent);
        }
        line(at(mid, f.hemHalf, hemY - sw * 0.06), at(mid, sw * 0.1, hemY - sw * 0.06), sw * 0.08, shade(colour.hex, -0.06));
        line(at(mid, -sw * 0.1, hemY - sw * 0.06), at(mid, -f.hemHalf, hemY - sw * 0.06), sw * 0.08, shade(colour.hex, -0.06));
        break;
      }
    }
  }
}

/** Outline of a sleeve from the armhole (outer shoulder → armpit) along the arm. */
function sleevePath(shoulder: V, armpit: V, root: V, spine: { p: V; width: number }[]) {
  const pts = [root, ...spine.map((s) => s.p)];
  const sideA: V[] = [shoulder];
  const sideB: V[] = [armpit];
  // Keep the sleeve's outer edge on the shoulder side of the arm.
  const outward = sub(shoulder, armpit);
  for (let i = 1; i < pts.length; i++) {
    const dir = norm(sub(pts[i], pts[i - 1]));
    let n: V = { x: -dir.y, y: dir.x };
    if (dot(n, outward) < 0) n = mul(n, -1);
    const half = spine[i - 1].width / 2;
    sideA.push(add(pts[i], mul(n, half)));
    sideB.push(sub(pts[i], mul(n, half)));
  }
  const path = new Path2D();
  path.moveTo(sideA[0].x, sideA[0].y);
  for (const p of sideA.slice(1)) path.lineTo(p.x, p.y);
  for (const p of sideB.slice(1).reverse()) path.lineTo(p.x, p.y);
  path.lineTo(sideB[0].x, sideB[0].y);
  path.closePath();
  return path;
}
