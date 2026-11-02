"use client";

import { useStore } from "./StoreProvider";

export function Toast() {
  const { toast } = useStore();
  return (
    <div className="toast" role="status" aria-live="polite" hidden={!toast}>
      {toast}
    </div>
  );
}
