"use client";

import { useEffect, useState } from "react";
import { PRODUCTS, getProduct } from "@/lib/products";
import { AiFittingRoom } from "./AiFittingRoom";
import { GarmentArt } from "./GarmentArt";
import { LiveFittingRoom } from "./LiveFittingRoom";
import { Price } from "./Price";
import { useStore } from "./StoreProvider";

type Mode = "live" | "ai";

export function TryOn({ productId, colourIdx }: { productId: string; colourIdx: number }) {
  const { closeTryOn, addToCart } = useStore();
  const first = getProduct(productId) ?? PRODUCTS[0];

  const [mode, setMode] = useState<Mode>("live");
  const [activeId, setActiveId] = useState(first.id);
  const [colour, setColour] = useState<Record<string, number>>({ [first.id]: colourIdx });
  const [size, setSize] = useState<string | null>(null);
  const [needSize, setNeedSize] = useState(false);

  const active = getProduct(activeId) ?? first;
  const activeColourIdx = colour[active.id] ?? 0;
  const activeColour = active.colours[activeColourIdx];

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeTryOn();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [closeTryOn]);

  const addToBag = () => {
    if (!size) {
      setNeedSize(true);
      return;
    }
    addToCart(active.id, activeColourIdx, size);
  };

  return (
    <div className="tryon" role="dialog" aria-modal="true" aria-label="Virtual fitting room">
      <div className="tryon__bar">
        <button type="button" className="btn btn--ghost btn--small" onClick={closeTryOn}>
          ← Back to shop
        </button>
        <div className="mode-tabs" role="tablist" aria-label="Try-on mode">
          <button type="button" role="tab" aria-selected={mode === "live"} onClick={() => setMode("live")}>
            <span className="live-dot" aria-hidden="true" /> Live colour
          </button>
          <button type="button" role="tab" aria-selected={mode === "ai"} onClick={() => setMode("ai")}>
            ✦ AI try-on
          </button>
        </div>
      </div>

      <div className="tryon__body">
        <div className="tryon__stage-col">
          {mode === "live" ? (
            <LiveFittingRoom product={active} colour={activeColour} />
          ) : (
            <AiFittingRoom product={active} colour={activeColour} colourIdx={activeColourIdx} />
          )}
        </div>

        <aside className="tryon__panel">
          <div className="product-tabs" role="tablist" aria-label="Products">
            {PRODUCTS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === active.id}
                className="product-tab"
                onClick={() => {
                  setActiveId(p.id);
                  setSize(null);
                  setNeedSize(false);
                }}
              >
                <span className="product-tab__art">
                  <GarmentArt product={p} colour={p.colours[colour[p.id] ?? 0]} />
                </span>
                <span className="product-tab__name">{p.name}</span>
              </button>
            ))}
          </div>

          <div className="panel-block">
            <div className="panel-block__head">
              <h2>{active.name}</h2>
            </div>
            <Price price={active.price} mrp={active.mrp} />
            <p className="muted small">
              {active.fit} · {active.fabric}
            </p>
          </div>

          <div className="panel-block">
            <h3>Colour · {activeColour.name}</h3>
            <div className="picker__row">
              {active.colours.map((c, i) => (
                <button
                  key={c.name}
                  type="button"
                  className="swatch swatch--large"
                  aria-pressed={i === activeColourIdx}
                  aria-label={c.name}
                  title={c.name}
                  style={{ background: `linear-gradient(135deg, ${c.hex} 55%, ${c.accent} 55%)` }}
                  onClick={() => setColour((m) => ({ ...m, [active.id]: i }))}
                />
              ))}
            </div>
            <h3>
              Size {needSize && !size && <span className="picker__warn">Pick a size first</span>}
            </h3>
            <div className="picker__row">
              {active.sizes.map((s) => (
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
            <button type="button" className="btn btn--primary btn--block" onClick={addToBag}>
              Add to bag
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
