import { useId } from "react";
import type { Colourway, Product } from "@/lib/products";

// Flat-lay product artwork drawn from the product data, so the demo needs no photography.
// Swap for real product photos in a client build.

const HEM: Record<Product["style"], number> = { tee: 168, shirt: 182, hoodie: 178, jacket: 170, kurta: 214 };
const HEM_HALF: Record<Product["style"], number> = { tee: 44, shirt: 45, hoodie: 48, jacket: 46, kurta: 54 };

function darken(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function GarmentArt({ product, colour }: { product: Pick<Product, "style" | "sleeve" | "pattern">; colour: Colourway }) {
  const id = useId().replace(/:/g, "");
  const fill = `fab-${id}`;
  const shadeId = `shd-${id}`;
  const { style, sleeve, pattern } = product;
  const hem = HEM[style];
  const half = HEM_HALF[style];
  const neckW = style === "hoodie" ? 20 : 16;
  const dip = { tee: 30, shirt: 38, hoodie: 32, jacket: 44, kurta: 30 }[style];

  const torso = `M ${100 - neckW} 22 L 56 34 L 62 82 Q 58 130 ${100 - half} ${hem} L ${100 + half} ${hem} Q 142 130 138 82 L 144 34 L ${100 + neckW} 22 Q 100 ${dip} ${100 - neckW} 22 Z`;
  const sleeveR =
    sleeve === "short"
      ? "M 144 34 L 176 62 L 160 82 L 138 80 Z"
      : "M 144 34 L 182 150 L 164 154 L 138 82 Z";
  const sleeveL =
    sleeve === "short"
      ? "M 56 34 L 24 62 L 40 82 L 62 80 Z"
      : "M 56 34 L 18 150 L 36 154 L 62 82 Z";
  const edge = darken(colour.hex, 0.22);

  return (
    <svg viewBox="0 0 200 230" role="img" aria-hidden="true">
      <defs>
        {pattern === "stripes" && (
          <pattern id={fill} width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill={colour.hex} />
            <rect y="6" width="12" height="4" fill={colour.accent} />
          </pattern>
        )}
        {pattern === "checks" && (
          <pattern id={fill} width="22" height="22" patternUnits="userSpaceOnUse">
            <rect width="22" height="22" fill={colour.hex} />
            <rect y="2" width="22" height="5" fill={colour.accent} opacity="0.55" />
            <rect x="2" width="5" height="22" fill={colour.accent} opacity="0.55" />
            <rect y="14" width="22" height="1.5" fill={colour.accent} opacity="0.4" />
            <rect x="14" width="1.5" height="22" fill={colour.accent} opacity="0.4" />
          </pattern>
        )}
        {pattern === "dots" && (
          <pattern id={fill} width="14" height="14" patternUnits="userSpaceOnUse">
            <rect width="14" height="14" fill={colour.hex} />
            <circle cx="3.5" cy="3.5" r="1.6" fill={colour.accent} />
            <circle cx="10.5" cy="10.5" r="1.6" fill={colour.accent} />
          </pattern>
        )}
        <linearGradient id={shadeId} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.16" />
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      {style === "hoodie" && <ellipse cx="100" cy="22" rx="30" ry="16" fill={darken(colour.hex, 0.1)} />}
      {[sleeveL, sleeveR, torso].map((d) => (
        <g key={d}>
          <path d={d} fill={pattern === "solid" ? colour.hex : `url(#${fill})`} stroke={edge} strokeWidth="1" strokeLinejoin="round" />
          <path d={d} fill={`url(#${shadeId})`} />
        </g>
      ))}
      {style === "tee" && <path d={`M ${100 - neckW} 22 Q 100 ${dip} ${100 + neckW} 22`} fill="none" stroke={edge} strokeWidth="4" />}
      {style === "shirt" && (
        <g>
          <path d="M 84 22 L 74 34 L 94 46 L 100 38 Z" fill={darken(colour.hex, 0.06)} stroke={edge} strokeWidth="0.8" />
          <path d="M 116 22 L 126 34 L 106 46 L 100 38 Z" fill={darken(colour.hex, 0.06)} stroke={edge} strokeWidth="0.8" />
          <line x1="100" y1="40" x2="100" y2={hem - 2} stroke={edge} strokeWidth="1.2" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx="102" cy={56 + i * ((hem - 70) / 4)} r="1.8" fill="#f4f1ea" />
          ))}
        </g>
      )}
      {style === "hoodie" && (
        <g>
          <path d={`M ${100 - neckW} 22 Q 100 ${dip} ${100 + neckW} 22`} fill="none" stroke={edge} strokeWidth="5" />
          <line x1="94" y1="30" x2="92" y2="62" stroke="#f4f1ea" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="106" y1="30" x2="108" y2="62" stroke="#f4f1ea" strokeWidth="1.6" strokeLinecap="round" />
          <path d={`M 72 ${hem - 52} L 128 ${hem - 52} L 138 ${hem - 12} L 62 ${hem - 12} Z`} fill={darken(colour.hex, 0.05)} stroke={edge} strokeWidth="1" />
          <rect x={56} y={hem - 10} width={88} height={10} fill={darken(colour.hex, 0.12)} />
        </g>
      )}
      {style === "kurta" && (
        <g>
          <path d={`M ${100 - neckW} 22 Q 100 ${dip} ${100 + neckW} 22`} fill="none" stroke={colour.accent} strokeWidth="5" />
          <line x1="100" y1="29" x2="100" y2="88" stroke={colour.accent} strokeWidth="3" />
          {[0, 1, 2, 3].map((i) => (
            <circle key={i} cx="100" cy={38 + i * 14} r="1.8" fill={darken(colour.accent, 0.25)} />
          ))}
          <rect x={100 - half + 2} y={hem - 12} width={half * 2 - 4} height={5} fill={colour.accent} />
        </g>
      )}
      {style === "jacket" && (
        <g>
          <path d={`M 100 ${dip - 2} L 92 ${hem} L 108 ${hem} Z`} fill="var(--card-bg, #f4ecef)" />
          <path d={`M ${100 - neckW} 22 Q 100 ${dip} ${100 + neckW} 22`} fill="none" stroke={darken(colour.hex, 0.12)} strokeWidth="6" />
          {[-1, 1].map((sgn) => (
            <g key={sgn}>
              <rect x={sgn < 0 ? 64 : 114} y="60" width="22" height="8" rx="2" fill={darken(colour.hex, 0.08)} />
              <circle cx={sgn < 0 ? 75 : 125} cy="64" r="2" fill={colour.accent} />
              <line x1={100 + sgn * 12} y1="48" x2={100 + sgn * 14} y2={hem - 12} stroke={colour.accent} strokeWidth="0.8" strokeDasharray="2 2" />
            </g>
          ))}
          <rect x={100 - half} y={hem - 10} width={half - 8} height={10} fill={darken(colour.hex, 0.06)} />
          <rect x={108} y={hem - 10} width={half - 8} height={10} fill={darken(colour.hex, 0.06)} />
        </g>
      )}
    </svg>
  );
}
