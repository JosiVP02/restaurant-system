// src/hooks/useToast.ts
//
// Mismo patrón de toasts que ya usan Cocina.tsx / Mesas.tsx en Desktop,
// extraído a hook para no repetir la lógica en cada pantalla móvil.

import { useCallback, useState } from "react";
import type { ToastItem } from "../services";

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3000);
  }, []);

  return { toasts, toast };
}