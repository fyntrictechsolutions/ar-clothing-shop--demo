"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";
import { GarmentArt } from "./GarmentArt";
import { Price } from "./Price";
import { useStore } from "./StoreProvider";

export function ProductDetail({ product }: { product: Product }) {
  const [colourIdx, setColourIdx] = useState(0);
  const [size, setSize] = useState<string | null>(null);
  const [needSize, setNeedSize] = useState(false);
  const { addToCart, openTryOn } = useStore();
  const colour = product.colours[colourIdx];

  const add = () => {
    if (!size) {
      setNeedSize(true);
      return;
    }
    addToCart(product.id, colourIdx, size);
  };

  return (
    <div className="pdp">
      <div className="pdp__media">
        <GarmentArt product={product} colour={colour} />
        <button type="button" className="pdp__ar-badge" onClick={() => openTryOn(product.id, colourIdx)}>
          <span className="live-dot" aria-hidden="true" /> See it on you
        </button>
      </div>
      <div className="pdp__info">
        <p className="eyebrow">
          {product.category} · {product.fit}
        </p>
        <h1>{product.name}</h1>
        <div className="card__meta">
          <span className="rating">★ {product.rating.toFixed(1)}</span>
          <span className="muted">{product.reviews.toLocaleString("en-IN")} reviews</span>
        </div>
        <p className="pdp__price">
          <Price price={product.price} mrp={product.mrp} />
        </p>
        <p className="pdp__desc">{product.description}</p>

        <fieldset className="picker">
          <legend>
            Colour: <strong>{colour.name}</strong>
          </legend>
          <div className="picker__row">
            {product.colours.map((c, i) => (
              <button
                key={c.name}
                type="button"
                className="swatch swatch--large"
                aria-pressed={i === colourIdx}
                aria-label={c.name}
                title={c.name}
                style={{ background: `linear-gradient(135deg, ${c.hex} 55%, ${c.accent} 55%)` }}
                onClick={() => setColourIdx(i)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="picker">
          <legend>
            Size {needSize && !size && <span className="picker__warn">Pick a size to add it to your bag</span>}
          </legend>
          <div className="picker__row">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                className="size"
                aria-pressed={s === size}
                onClick={() => {
                  setSize(s);
                  setNeedSize(false);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="pdp__actions">
          <button type="button" className="btn btn--primary" onClick={() => openTryOn(product.id, colourIdx)}>
            Try it on live
          </button>
          <button type="button" className="btn btn--ghost" onClick={add}>
            Add to bag
          </button>
        </div>

        <dl className="specs">
          <div>
            <dt>Fabric</dt>
            <dd>{product.fabric}</dd>
          </div>
          <div>
            <dt>Fit</dt>
            <dd>{product.fit}</dd>
          </div>
          <div>
            <dt>Delivery</dt>
            <dd>2 to 4 days across Kerala, 7-day easy returns</dd>
          </div>
        </dl>
        <p className="muted small">Try-on runs entirely on your device. Your camera feed and photos are never uploaded.</p>
      </div>
    </div>
  );
}
