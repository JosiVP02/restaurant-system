// src/components/ConfirmModal.tsx
import { TbPlus, TbMinus, TbTrash, TbCheck, TbCurrencyDollar } from "react-icons/tb";
import type { ConfirmTipo } from "../services";

interface Props {
  titulo: string;
  descripcion?: string;
  tipo?: ConfirmTipo;
  textoConfirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

const ICONOS: Record<ConfirmTipo, typeof TbPlus> = {
  default: TbPlus,
  warning: TbMinus,
  danger: TbTrash,
  success: TbCheck,
  money: TbCurrencyDollar,
};

const COLORES: Record<ConfirmTipo, { bg: string; color: string; border: string }> = {
  default: { bg: "#f0fdf4", color: "#15803d", border: "#d1fae5" },
  warning: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  danger: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  success: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  money: { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
};

export default function ConfirmModal({
  titulo,
  descripcion,
  tipo = "default",
  textoConfirmar = "Confirmar",
  onConfirmar,
  onCancelar,
}: Props) {
  const col = COLORES[tipo];
  const Icono = ICONOS[tipo];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,31,26,0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
        padding: 20,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: "28px 24px",
          width: "100%",
          maxWidth: 340,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: col.bg,
            border: `1px solid ${col.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icono size={24} color={col.color} />
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1f2937" }}>
            {titulo}
          </p>
          {descripcion && (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#94a3b8", fontWeight: 500, whiteSpace: "pre-line" }}>
              {descripcion}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 4 }}>
          <button
            onClick={onCancelar}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 10,
              border: "1.5px solid #e2e8f0",
              background: "white",
              color: "#475569",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Cancelar
          </button>

          <button
            onClick={onConfirmar}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 10,
              border: `1.5px solid ${col.border}`,
              background: col.bg,
              color: col.color,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}