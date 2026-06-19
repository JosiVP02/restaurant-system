import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import { useWebSocket } from "../hooks/useWebSocket";
import { ArrowLeftRight, ChevronDown } from "lucide-react";

// ─── Paleta ────────────────────────────────────────────────────────────────
const C = {
  // Fondos
  overlay:      "rgba(15,23,42,0.60)",
  surface:      "#ffffff",
  surfaceSubtle:"#f8fafc",
  headerBorder: "#e2e8f0",

  // Texto
  textPrimary:  "#0f172a",
  textSecondary:"#475569",
  textMuted:    "#94a3b8",
  textLabel:    "#334155",

  // Acento verde corporativo
  accent:       "#059669",
  accentHover:  "#047857",
  accentSubtle: "#ecfdf5",
  accentBorder: "#6ee7b7",
  accentShadow: "rgba(5,150,105,0.22)",

  // Icono header
  iconBg:       "#f0fdf4",
  iconBorder:   "#bbf7d0",
  iconColor:    "#059669",

  // Neutros UI
  inputBorder:  "#cbd5e1",
  inputBg:      "#ffffff",
  btnCancelBg:  "#ffffff",
  btnCancelBorder:"#e2e8f0",
  btnCancelText:"#475569",
  btnDisabledBg:"#d1fae5",
  btnDisabledText:"#6ee7b7",

  // Sombras
  modalShadow:  "0 32px 72px rgba(15,23,42,0.22), 0 4px 16px rgba(15,23,42,0.08)",
};

// ─── Tipos ─────────────────────────────────────────────────────────────────
interface Mesa {
  id: number;
  nombre: string;
  estado: string;
}

interface Props {
  cuentaId: number;
  mesaActual: number;
  onClose: () => void;
  onTransferida: (nuevaMesaId: number) => void;
}

// ─── Componente ────────────────────────────────────────────────────────────
export default function TransferirMesaModal({
  cuentaId,
  mesaActual,
  onClose,
  onTransferida,
}: Props) {
  const [mesas, setMesas]             = useState<Mesa[]>([]);
  const [mesaDestino, setMesaDestino] = useState("");
  const [transfiriendo, setTransfiriendo] = useState(false);
  const [confirm, setConfirm]         = useState<{ accion: () => void } | null>(null);

  // ── Lógica intacta ──────────────────────────────────────────────────────
  const cargarMesas = useCallback(async () => {
    const res = await api.get("/mesas");
    setMesas(res.data.filter((m: Mesa) => m.estado === "LIBRE"));
  }, []);

  async function transferir() {
    if (!mesaDestino) return;
    setConfirm({
      accion: async () => {
        try {
          setTransfiriendo(true);
          await api.post(`/cuentas/${cuentaId}/transferir`, null, {
            params: { nueva_mesa_id: mesaDestino },
          });
          onTransferida(Number(mesaDestino));
          onClose();
        } finally {
          setTransfiriendo(false);
        }
      },
    });
  }

  useWebSocket(["mesas_actualizadas"], cargarMesas);
  useEffect(() => { cargarMesas(); }, [cargarMesas]);

  // ── Render ──────────────────────────────────────────────────────────────
  const btnActive = mesaDestino && !transfiriendo;

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     C.overlay,
        backdropFilter: "blur(3px)",
        display:        "flex",
        justifyContent: "center",
        alignItems:     "center",
        zIndex:         9999,
      }}
    >
      <div
        style={{
          background:   C.surface,
          borderRadius: 20,
          width:        460,
          maxWidth:     "95vw",
          overflow:     "hidden",
          boxShadow:    C.modalShadow,
          fontFamily:   "'Inter', system-ui, sans-serif",
          border:       "1px solid #e2e8f0",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          style={{
            padding:      "22px 28px",
            borderBottom: `1px solid ${C.headerBorder}`,
            display:      "flex",
            alignItems:   "center",
            gap:          16,
            background:   C.surface,
          }}
        >
          {/* Icono */}
          <div
            style={{
              width:          46,
              height:         46,
              borderRadius:   13,
              background:     C.iconBg,
              border:         `1.5px solid ${C.iconBorder}`,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
            }}
          >
            <ArrowLeftRight size={20} color={C.iconColor} strokeWidth={2.2} />
          </div>

          {/* Título */}
          <div>
            <h2
              style={{
                margin:        0,
                fontSize:      17,
                fontWeight:    800,
                color:         C.textPrimary,
                letterSpacing: "-0.02em",
                lineHeight:    1.2,
              }}
            >
              Transferir Mesa
            </h2>
            <p
              style={{
                margin:    0,
                marginTop: 3,
                fontSize:  12.5,
                color:     C.textMuted,
                fontWeight:500,
              }}
            >
              Mesa actual:{" "}
              <span
                style={{
                  color:         C.textSecondary,
                  fontWeight:    700,
                  background:    "#f1f5f9",
                  padding:       "1px 8px",
                  borderRadius:  5,
                  fontSize:      12,
                  border:        "1px solid #e2e8f0",
                  display:       "inline-block",
                  marginLeft:    2,
                }}
              >
                {mesaActual}
              </span>
            </p>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div style={{ padding: "26px 28px" }}>
          <label
            style={{
              display:       "block",
              fontSize:      11,
              fontWeight:    700,
              color:         C.textLabel,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom:  8,
            }}
          >
            Mesa de destino
          </label>

          {/* Select con ícono decorativo */}
          <div style={{ position: "relative" }}>
            <select
              value={mesaDestino}
              onChange={(e) => setMesaDestino(e.target.value)}
              style={{
                width:        "100%",
                padding:      "12px 40px 12px 14px",
                borderRadius: 10,
                border:       `1.5px solid ${mesaDestino ? C.accentBorder : C.inputBorder}`,
                fontSize:     14,
                fontWeight:   600,
                color:        mesaDestino ? C.textPrimary : C.textMuted,
                background:   mesaDestino ? C.accentSubtle : C.inputBg,
                boxSizing:    "border-box",
                cursor:       "pointer",
                outline:      "none",
                appearance:   "none",
                WebkitAppearance: "none",
                transition:   "border-color 0.15s, background 0.15s",
                boxShadow:    mesaDestino
                  ? `0 0 0 3px ${C.accentShadow}`
                  : "0 1px 2px rgba(15,23,42,0.05)",
              }}
            >
              <option value="">Seleccione una mesa libre…</option>
              {mesas.map((mesa) => (
                <option key={mesa.id} value={mesa.id}>
                  {mesa.nombre}
                </option>
              ))}
            </select>

            {/* Chevron decorativo */}
            <div
              style={{
                position:       "absolute",
                right:          13,
                top:            "50%",
                transform:      "translateY(-50%)",
                pointerEvents:  "none",
                color:          mesaDestino ? C.accent : C.textMuted,
              }}
            >
              <ChevronDown size={16} strokeWidth={2.5} />
            </div>
          </div>

          {/* Estado vacío */}
          {mesas.length === 0 && (
            <div
              style={{
                marginTop:    12,
                padding:      "10px 14px",
                borderRadius: 8,
                background:   "#fef9f0",
                border:       "1px solid #fed7aa",
                display:      "flex",
                alignItems:   "center",
                gap:          8,
              }}
            >
              <span style={{ fontSize: 12.5, color: "#92400e", fontWeight: 500 }}>
                No hay mesas libres disponibles en este momento.
              </span>
            </div>
          )}

          {/* Preview mesa seleccionada */}
          {mesaDestino && (
            <div
              style={{
                marginTop:    12,
                padding:      "10px 14px",
                borderRadius: 8,
                background:   C.accentSubtle,
                border:       `1px solid ${C.accentBorder}`,
                display:      "flex",
                alignItems:   "center",
                gap:          8,
              }}
            >
              <ArrowLeftRight size={13} color={C.accent} strokeWidth={2.5} />
              <span style={{ fontSize: 12.5, color: "#065f46", fontWeight: 600 }}>
                {mesaActual} → {mesas.find((m) => m.id === Number(mesaDestino))?.nombre ?? "—"}
              </span>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div
          style={{
            display:      "flex",
            gap:          10,
            padding:      "18px 28px",
            borderTop:    `1px solid ${C.headerBorder}`,
            background:   C.surfaceSubtle,
          }}
        >
          {/* Cancelar */}
          <button
            onClick={onClose}
            style={{
              flex:         1,
              padding:      "12px 0",
              borderRadius: 10,
              border:       `1.5px solid ${C.btnCancelBorder}`,
              background:   C.btnCancelBg,
              color:        C.btnCancelText,
              fontWeight:   700,
              fontSize:     14,
              cursor:       "pointer",
              fontFamily:   "inherit",
              transition:   "background 0.15s, border-color 0.15s",
              letterSpacing:"-0.01em",
            }}
          >
            Cancelar
          </button>

          {/* Transferir */}
          <button
            onClick={transferir}
            disabled={!mesaDestino || transfiriendo}
            style={{
              flex:         1,
              padding:      "12px 0",
              borderRadius: 10,
              border:       "none",
              background:   btnActive ? C.accent : C.btnDisabledBg,
              color:        btnActive ? "#ffffff" : C.btnDisabledText,
              fontWeight:   700,
              fontSize:     14,
              cursor:       btnActive ? "pointer" : "default",
              fontFamily:   "inherit",
              boxShadow:    btnActive ? `0 4px 14px ${C.accentShadow}` : "none",
              transition:   "all 0.15s",
              letterSpacing:"-0.01em",
              display:      "flex",
              alignItems:   "center",
              justifyContent:"center",
              gap:          7,
            }}
          >
            <ArrowLeftRight
              size={15}
              strokeWidth={2.5}
              color={btnActive ? "#ffffff" : C.btnDisabledText}
            />
            {transfiriendo ? "Transfiriendo…" : "Transferir"}
          </button>
        </div>
      </div>

      {/* ── ConfirmModal (sin tocar) ──────────────────────────────────── */}
      {confirm && (
        <ConfirmModal
          titulo="Transferir mesa"
          descripcion={`La cuenta pasará a ${
            mesas.find((m) => m.id === Number(mesaDestino))?.nombre ??
            "la mesa seleccionada"
          }`}
          tipo="default"
          textoConfirmar="Transferir"
          onConfirmar={() => {
            confirm.accion();
            setConfirm(null);
          }}
          onCancelar={() => setConfirm(null)}
        />
      )}
    </div>
  );
}