"use client";

import Link from "next/link";
import { useStore } from "./StoreProvider";
import { PRODUCTS } from "@/lib/products";

export function Header() {
  const { cartCount, setCartOpen, openTryOn } = useStore();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="wordmark" aria-label="Thira home">
          <span className="wordmark__main">Thira</span>
          <span className="wordmark__sub">Clothing Co.</span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          <Link href="/#shop">Shop</Link>
          <button type="button" className="link-button" onClick={() => openTryOn(PRODUCTS[0].id)}>
            Virtual try-on
          </button>
          <button type="button" className="bag-button" onClick={() => setCartOpen(true)}>
            Bag
            <span className="bag-button__count" aria-label={`${cartCount} items`}>
              {cartCount}
            </span>
          </button>
        </nav>
      </div>
    </header>
  );
}
