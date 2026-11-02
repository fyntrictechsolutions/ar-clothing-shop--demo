"use client";

import { useState } from "react";
import { CATEGORIES, PRODUCTS } from "@/lib/products";
import { ProductCard } from "./ProductCard";

export function ShopGrid() {
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState("featured");
  const filtered = category === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);
  const shown =
    sort === "featured" ? filtered : [...filtered].sort((a, b) => (sort === "low" ? a.price - b.price : b.price - a.price));
  return (
    <section id="shop" className="shop">
      <div className="shop__head">
        <h2>Shop the collection</h2>
        <div className="chips" role="tablist" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              className="chip"
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <label className="sort" htmlFor="sort">
          <span className="muted">Sort</span>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="featured">Featured</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </label>
      </div>
      <div className="grid">
        {shown.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
