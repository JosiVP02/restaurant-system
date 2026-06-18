// src/components/Toast.tsx
import type { ToastItem } from "../services";

export default function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 999,
        alignItems: "center",
        width: "calc(100% - 32px)",
        maxWidth: 420,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            padding: "10px 18px",
            borderRadius: 99,
            fontSize: 13,
            fontWeight: 600,
            textAlign: "center",
            background: t.type === "ok" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${t.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
            color: t.type === "ok" ? "#15803d" : "#dc2626",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}