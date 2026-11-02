"use client";

import dynamic from "next/dynamic";
import { useStore } from "./StoreProvider";

// The try-on (and MediaPipe) only loads when someone opens it.
const TryOn = dynamic(() => import("./TryOn").then((m) => m.TryOn), { ssr: false });

export function TryOnHost() {
  const { tryOn } = useStore();
  if (!tryOn) return null;
  return <TryOn productId={tryOn.productId} colourIdx={tryOn.colourIdx} />;
}
