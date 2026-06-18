// src/components/CobrarModal.tsx
//
// Equivalente móvil de CobrarModal.tsx (Desktop), MISMO endpoint de
// cobro: POST /cuentas/:id/cerrar con params {metodo, aplicar_servicio}.
//
// Diferencia deliberada de alcance (acordada): se eliminan las opciones
// "Descargar factura PDF" e "Imprimir factura térmica" — esta app es
// para mesera/cocina, no maneja impresión. El cobro se sigue registrando
// igual en el backend; solo no se genera/imprime el comprobante desde
// el celular.

import { useState } from "react";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";

interface Props {
  cuentaId: number;
  total: number;
  onClose: () => void;
  onCobrado: () => void;
}

const metodos = [
  { id: "Efectivo", icon: "💵" },
  { id: "Tarjeta", icon: "💳" },
  { id: "SINPE", icon: "📱" },
];

export default function CobrarModal({ cuentaId, total, onClose, onCobrado }: Props) {
  const [metodo, setMetodo] = useState("Efectivo");
  const [aplicarServicio, setAplicarServicio] = useState(true);
  const [recibido, setRecibido] = useState(0);
  const [cobrando, setCobrando] = useState(false);
  const [confirm, setConfirm] = useState<{ accion: () => void } | null>(null);

  const servicio = aplicarServicio ? total * 0.1 : 0;
  const totalFinal = total + servicio;
  const vuelto = metodo === "Efectivo" ? Math.max(recibido - totalFinal, 0) : 0;

  async function cobrar() {
    if (metodo === "Efectivo" && recibido < totalFinal) {
      alert("El monto recibido es insuficiente.");
      return;
    }
    try {
      setCobrando(true);
      await api.post(`/cuentas/${cuentaId}/cerrar`, null, {
        params: { metodo, aplicar_servicio: aplicarServicio },
      });
      onCobrado();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al procesar el cobro.");
    } finally {
      setCobrando(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,31,26,0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: "100%",
          maxHeight: "92vh",
          background: "white",
          borderRadius: "20px 20px 0 0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -24px 60px rgba(0,0,0,0.3)",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* HEADER */}
        <div style={{ padding: "20px 22px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              🧾
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Cobrar Cuenta</h2>
              <p style={{ margin: 0, marginTop: 2, opacity: 0.85, fontSize: 13 }}>
                Cuenta #{cuentaId} · Confirmar pago
              </p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #eef2f0", padding: 18, borderRadius: 14, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14, color: "#475569" }}>
              <span>Subtotal</span>
              <strong style={{ color: "#1f2937" }}>₡{total.toLocaleString()}</strong>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 10,
                padding: "10px 12px",
                borderRadius: 10,
                background: aplicarServicio ? "#ecfdf5" : "#f1f5f9",
                border: aplicarServicio ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#334155" }}>Aplicar servicio 10%</span>
              <input
                type="checkbox"
                checked={aplicarServicio}
                onChange={(e) => setAplicarServicio(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: "#16a34a" }}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 14, color: "#475569" }}>
              <span>Servicio</span>
              <strong style={{ color: "#1f2937" }}>₡{servicio.toLocaleString()}</strong>
            </div>

            <div style={{ height: 1, background: "#e2e8f0", marginBottom: 14 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>Total</span>
              <span style={{ fontSize: 26, fontWeight: 800, color: "#16a34a" }}>
                ₡{totalFinal.toLocaleString()}
              </span>
            </div>
          </div>

          <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Método de Pago
          </h3>

          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {metodos.map(({ id: m, icon }) => (
              <button
                key={m}
                onClick={() => setMetodo(m)}
                style={{
                  flex: 1,
                  padding: "14px 8px",
                  borderRadius: 12,
                  border: metodo === m ? "2px solid #16a34a" : "2px solid #e2e8f0",
                  background: metodo === m ? "#ecfdf5" : "white",
                  fontWeight: 700,
                  fontSize: 12.5,
                  color: metodo === m ? "#15803d" : "#475569",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 20 }}>{icon}</span>
                {m}
              </button>
            ))}
          </div>

          {metodo === "Efectivo" && (
            <div style={{ background: "#fafafa", border: "1px solid #eef2f0", borderRadius: 14, padding: 16, marginBottom: 8 }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Monto recibido
              </label>
              <div style={{ position: "relative", marginTop: 8 }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontWeight: 700 }}>
                  ₡
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={recibido}
                  onChange={(e) => setRecibido(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "14px 14px 14px 32px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#1f2937",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 14,
                  padding: "14px 16px",
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  borderRadius: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong style={{ color: "#166534", fontSize: 13.5 }}>Vuelto</strong>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#16a34a" }}>
                  ₡{vuelto.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: "16px 22px",
            paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
            borderTop: "1px solid #eef2f0",
            display: "flex",
            gap: 10,
            background: "#fafafa",
          }}
        >
          <button
            onClick={onClose}
            style={{ padding: "13px 18px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#475569", fontWeight: 600, fontSize: 14 }}
          >
            Cancelar
          </button>

          <button
            onClick={() => setConfirm({ accion: cobrar })}
            disabled={cobrando}
            style={{
              flex: 1,
              padding: 14,
              border: "none",
              borderRadius: 12,
              background: cobrando ? "#86efac" : "linear-gradient(135deg, #16a34a, #22c55e)",
              color: "white",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {cobrando ? "Procesando…" : "💰 Cobrar Cuenta"}
          </button>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          titulo="Cobrar cuenta"
          descripcion={`Total: ₡${totalFinal.toLocaleString()}\n\nMétodo: ${metodo}`}
          tipo="money"
          textoConfirmar="Cobrar"
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