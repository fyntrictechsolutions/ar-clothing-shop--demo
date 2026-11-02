"use client";

import { useStore } from "./StoreProvider";

export function HeroTryOnButton({ productId }: { productId: string }) {
  const { openTryOn } = useStore();
  return (
    <button type="button" className="btn btn--primary" onClick={() => openTryOn(productId)}>
      <span className="live-dot" aria-hidden="true" /> Try on live
    </button>
  );
}
