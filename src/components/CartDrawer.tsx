"use client";

import { useStore } from "./StoreProvider";
import { GarmentArt } from "./GarmentArt";
import { formatPrice, getProduct } from "@/lib/products";

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, setQty, cartTotal, showToast } = useStore();
  if (!cartOpen) return null;
  return (
    <div className="drawer-backdrop" onClick={() => setCartOpen(false)}>
      <aside className="drawer" aria-label="Your bag" onClick={(e) => e.stopPropagation()}>
        <div className="drawer__head">
          <h2>Your bag</h2>
          <button type="button" className="icon-button" onClick={() => setCartOpen(false)} aria-label="Close bag">
            ✕
          </button>
        </div>
        {cart.length === 0 ? (
          <p className="drawer__empty">Your bag is empty. Try a few pieces on and add your favourites.</p>
        ) : (
          <ul className="cart-lines">
            {cart.map((line) => {
              const p = getProduct(line.productId);
              if (!p) return null;
              const colour = p.colours[line.colourIdx];
              return (
                <li key={`${line.productId}-${line.colourIdx}-${line.size}`} className="cart-line">
                  <div className="cart-line__art">
                    <GarmentArt product={p} colour={colour} />
                  </div>
                  <div className="cart-line__info">
                    <strong>{p.name}</strong>
                    <span className="muted">
                      <span className="dot" style={{ background: colour.hex }} /> {colour.name} · Size {line.size}
                    </span>
                    <div className="qty">
                      <button type="button" onClick={() => setQty(line, line.qty - 1)} aria-label="Remove one">
                        −
                      </button>
                      <span>{line.qty}</span>
                      <button type="button" onClick={() => setQty(line, line.qty + 1)} aria-label="Add one">
                        +
                      </button>
                    </div>
                  </div>
                  <span className="cart-line__price">{formatPrice(p.price * line.qty)}</span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="drawer__foot">
          <div className="drawer__total">
            <span>Subtotal</span>
            <strong>{formatPrice(cartTotal)}</strong>
          </div>
          <p className="muted small">Free delivery in Kerala on orders over ₹999.</p>
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={cart.length === 0}
            onClick={() => showToast("This is a demo store, so checkout is switched off.")}
          >
            Checkout
          </button>
        </div>
      </aside>
    </div>
  );
}
