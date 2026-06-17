// components/ConfirmModal.tsx

interface Props {
  titulo: string;
  descripcion?: string;

  tipo?:| "default"| "warning"| "danger"| "success"| "money";
  textoConfirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

const ICONOS = {
  default: "➕",
  warning: "➖",
  danger:  "🗑️",
  success: "✅",
  money: "💰",
};

const COLORES = {
  default: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  warning: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  danger:  { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
    success: {
    bg: "#ecfdf5",
    color: "#16a34a",
    border: "#86efac",
  },

  money: {
    bg: "#eff6ff",
    color: "#2563eb",
    border: "#93c5fd",
  },
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
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: "32px 28px",
          width: 320,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Ícono */}
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
            fontSize: 24,
          }}
        >
          {ICONOS[tipo]}
        </div>

        {/* Texto */}
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1f2937" }}>
            {titulo}
          </p>
          {descripcion && (
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#94a3b8" }}>
              {descripcion}
            </p>
          )}
        </div>

        {/* Botones */}
        <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 4 }}>
          <button
            onClick={onCancelar}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "white",
              color: "#475569",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>

          <button
            onClick={onConfirmar}
            style={{
              flex: 1,
              padding: "11px 0",
              borderRadius: 10,
              border: `1px solid ${col.border}`,
              background: col.bg,
              color: col.color,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}