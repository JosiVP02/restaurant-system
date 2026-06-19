// components/ConfirmModal.tsx
import {
  Plus,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Wallet,
} from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface Props {
  titulo: string;
  descripcion?: string;
  tipo?: "default" | "warning" | "danger" | "success" | "money";
  textoConfirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

// ─── Configuración por tipo ──────────────────────────────────────────────────
const TIPOS = {
  default: {
    Icon:        Plus,
    iconBg:      "#f0fdf4",
    iconBorder:  "#bbf7d0",
    iconColor:   "#16a34a",
    btnBg:       "#059669",
    btnHover:    "#047857",
    btnShadow:   "rgba(5,150,105,0.25)",
    btnColor:    "#ffffff",
  },
  warning: {
    Icon:        AlertTriangle,
    iconBg:      "#fffbeb",
    iconBorder:  "#fde68a",
    iconColor:   "#b45309",
    btnBg:       "#d97706",
    btnHover:    "#b45309",
    btnShadow:   "rgba(217,119,6,0.25)",
    btnColor:    "#ffffff",
  },
  danger: {
    Icon:        Trash2,
    iconBg:      "#fef2f2",
    iconBorder:  "#fecaca",
    iconColor:   "#dc2626",
    btnBg:       "#dc2626",
    btnHover:    "#b91c1c",
    btnShadow:   "rgba(220,38,38,0.25)",
    btnColor:    "#ffffff",
  },
  success: {
    Icon:        CheckCircle2,
    iconBg:      "#ecfdf5",
    iconBorder:  "#86efac",
    iconColor:   "#16a34a",
    btnBg:       "#16a34a",
    btnHover:    "#15803d",
    btnShadow:   "rgba(22,163,74,0.25)",
    btnColor:    "#ffffff",
  },
  money: {
    Icon:        Wallet,
    iconBg:      "#eff6ff",
    iconBorder:  "#93c5fd",
    iconColor:   "#2563eb",
    btnBg:       "#2563eb",
    btnHover:    "#1d4ed8",
    btnShadow:   "rgba(37,99,235,0.25)",
    btnColor:    "#ffffff",
  },
};

// ─── Componente ──────────────────────────────────────────────────────────────
export default function ConfirmModal({
  titulo,
  descripcion,
  tipo = "default",
  textoConfirmar = "Confirmar",
  onConfirmar,
  onCancelar,
}: Props) {
  const T = TIPOS[tipo];
  const { Icon } = T;

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     "rgba(15,23,42,0.62)",
        backdropFilter: "blur(3px)",
        display:        "flex",
        justifyContent: "center",
        alignItems:     "center",
        zIndex:         10000,
        fontFamily:     "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background:    "#ffffff",
          borderRadius:  20,
          padding:       "32px 28px 28px",
          width:         340,
          maxWidth:      "92vw",
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          gap:           0,
          boxShadow:     "0 32px 72px rgba(15,23,42,0.22), 0 4px 16px rgba(15,23,42,0.08)",
          border:        "1px solid #e2e8f0",
        }}
      >
        {/* ── Ícono ────────────────────────────────────────────────────── */}
        <div
          style={{
            width:          60,
            height:         60,
            borderRadius:   "50%",
            background:     T.iconBg,
            border:         `1.5px solid ${T.iconBorder}`,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            marginBottom:   18,
            flexShrink:     0,
          }}
        >
          <Icon size={26} color={T.iconColor} strokeWidth={2.2} />
        </div>

        {/* ── Texto ────────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <p style={{
            margin:        0,
            fontSize:      16.5,
            fontWeight:    800,
            color:         "#0f172a",
            letterSpacing: "-0.02em",
            lineHeight:    1.3,
          }}>
            {titulo}
          </p>

          {descripcion && (
            <p style={{
              margin:     "8px 0 0",
              fontSize:   13,
              color:      "#94a3b8",
              fontWeight: 500,
              lineHeight: 1.5,
            }}>
              {descripcion}
            </p>
          )}
        </div>

        {/* ── Botones ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          {/* Cancelar */}
          <button
            onClick={onCancelar}
            style={{
              flex:         1,
              padding:      "12px 0",
              borderRadius: 10,
              border:       "1.5px solid #e2e8f0",
              background:   "#ffffff",
              color:        "#475569",
              fontWeight:   700,
              fontSize:     14,
              cursor:       "pointer",
              fontFamily:   "inherit",
              letterSpacing:"-0.01em",
              transition:   "background 0.12s, border-color 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background  = "#f8fafc";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background  = "#ffffff";
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          >
            Cancelar
          </button>

          {/* Confirmar */}
          <button
            onClick={onConfirmar}
            style={{
              flex:         1,
              padding:      "12px 0",
              borderRadius: 10,
              border:       "none",
              background:   T.btnBg,
              color:        T.btnColor,
              fontWeight:   700,
              fontSize:     14,
              cursor:       "pointer",
              fontFamily:   "inherit",
              letterSpacing:"-0.01em",
              boxShadow:    `0 4px 14px ${T.btnShadow}`,
              transition:   "background 0.12s, box-shadow 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.btnHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = T.btnBg;
            }}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}