"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getProduct } from "@/lib/products";

export interface CartLine {
  productId: string;
  colourIdx: number;
  size: string;
  qty: number;
}

interface TryOnRequest {
  productId: string;
  colourIdx: number;
}

interface StoreState {
  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  addToCart: (productId: string, colourIdx: number, size: string) => void;
  setQty: (line: CartLine, qty: number) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  tryOn: TryOnRequest | null;
  openTryOn: (productId: string, colourIdx?: number) => void;
  closeTryOn: () => void;
  toast: string | null;
  showToast: (message: string) => void;
}

const StoreContext = createContext<StoreState | null>(null);
const CART_KEY = "thira-cart";

const sameLine = (a: CartLine, b: Omit<CartLine, "qty">) =>
  a.productId === b.productId && a.colourIdx === b.colourIdx && a.size === b.size;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [tryOn, setTryOn] = useState<TryOnRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring browser-only state after hydration
      if (saved) setCart(JSON.parse(saved));
    } catch {
      // Storage can be blocked (private mode); the cart just starts empty.
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // Ignore: the cart still works for this visit.
    }
  }, [cart]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const addToCart = useCallback(
    (productId: string, colourIdx: number, size: string) => {
      const key = { productId, colourIdx, size };
      setCart((lines) => {
        const hit = lines.find((l) => sameLine(l, key));
        if (hit) return lines.map((l) => (l === hit ? { ...l, qty: l.qty + 1 } : l));
        return [...lines, { ...key, qty: 1 }];
      });
      const p = getProduct(productId);
      if (p) showToast(`Added ${p.name} (${p.colours[colourIdx].name}, ${size}) to your bag`);
    },
    [showToast],
  );

  const setQty = useCallback((line: CartLine, qty: number) => {
    setCart((lines) =>
      qty <= 0 ? lines.filter((l) => !sameLine(l, line)) : lines.map((l) => (sameLine(l, line) ? { ...l, qty } : l)),
    );
  }, []);

  const openTryOn = useCallback((productId: string, colourIdx = 0) => {
    setCartOpen(false);
    setTryOn({ productId, colourIdx });
  }, []);
  const closeTryOn = useCallback(() => setTryOn(null), []);

  const value = useMemo<StoreState>(() => {
    const cartCount = cart.reduce((n, l) => n + l.qty, 0);
    const cartTotal = cart.reduce((n, l) => n + (getProduct(l.productId)?.price ?? 0) * l.qty, 0);
    return {
      cart,
      cartCount,
      cartTotal,
      addToCart,
      setQty,
      cartOpen,
      setCartOpen,
      tryOn,
      openTryOn,
      closeTryOn,
      toast,
      showToast,
    };
  }, [cart, addToCart, setQty, cartOpen, tryOn, openTryOn, closeTryOn, toast, showToast]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
