"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/products";
import { GarmentArt } from "./GarmentArt";
import { Price } from "./Price";
import { useStore } from "./StoreProvider";

export function ProductCard({ product }: { product: Product }) {
  const { openTryOn } = useStore();
  const [colourIdx, setColourIdx] = useState(0);
  const colour = product.colours[colourIdx];
  return (
    <article className="card">
      <Link href={`/product/${product.id}/`} className="card__media">
        {product.tag && <span className="card__tag">{product.tag}</span>}
        <GarmentArt product={product} colour={colour} />
      </Link>
      <div className="card__body">
        <Link href={`/product/${product.id}/`} className="card__name">
          {product.name}
        </Link>
        <div className="card__meta">
          <span className="rating">★ {product.rating.toFixed(1)}</span>
          <span className="muted">({product.reviews.toLocaleString("en-IN")})</span>
          <span className="muted">· {product.fit}</span>
        </div>
        <div className="swatch-row" role="group" aria-label="Colours">
          {product.colours.map((c, i) => (
            <button
              key={c.name}
              type="button"
              className="swatch"
              aria-pressed={i === colourIdx}
              aria-label={c.name}
              title={c.name}
              style={{ background: `linear-gradient(135deg, ${c.hex} 55%, ${c.accent} 55%)` }}
              onClick={() => setColourIdx(i)}
            />
          ))}
        </div>
        <div className="card__foot">
          <Price price={product.price} mrp={product.mrp} />
          <button type="button" className="btn btn--ar" onClick={() => openTryOn(product.id, colourIdx)}>
            Try on
          </button>
        </div>
      </div>
    </article>
  );
}
