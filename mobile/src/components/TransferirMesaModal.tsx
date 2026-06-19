// src/components/TransferirMesaModal.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import type { Mesa } from "../services";

import { useWebSocket } from "../hooks/useWebSocket";


interface Props {
  cuentaId: number;
  mesaActual: number;
  onClose: () => void;
  onTransferida: (nuevaMesaId: number) => void;
}

export default function TransferirMesaModal({ cuentaId, mesaActual, onClose, onTransferida }: Props) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesaDestino, setMesaDestino] = useState("");
  const [transfiriendo, setTransfiriendo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ accion: () => void } | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  const mountedRef = useRef(true);
  const transfiriendoRef = useRef(false);
  const mesaDestinoRef = useRef("");

  useEffect(() => { mesaDestinoRef.current = mesaDestino; }, [mesaDestino]);


const fetchMesas = useCallback(async () => {
   console.log("[TransferirModal] fetchMesas llamado");
  if (transfiriendoRef.current) return;
  try {
    const res = await api.get("/mesas", {
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" },
      params: { _t: Date.now() },
    });
    if (!mountedRef.current) return;
    const libres: Mesa[] = res.data.filter((m: Mesa) => m.estado === "LIBRE");
    setMesas(libres);
    setFetchCount(c => c + 1);
    setErrorMsg(null);
    const selActual = mesaDestinoRef.current;
    if (selActual && !libres.some((m) => String(m.id) === selActual)) {
      setMesaDestino("");
      setErrorMsg("La mesa seleccionada ya fue ocupada.");
    }
  } catch (err) {
    if (!mountedRef.current) return;
    console.error("Error cargando mesas:", err);
    setErrorMsg("No se pudo cargar la lista de mesas.");
  }
}, []);

useWebSocket(["mesas_actualizadas"], fetchMesas);
console.log("[TransferirModal] hook registrado");

useEffect(() => {
  mountedRef.current = true;

  fetchMesas();

  function handleVisibility() {
    if (document.visibilityState === "visible") fetchMesas();
  }

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("focus", fetchMesas);

  return () => {
    mountedRef.current = false;
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("focus", fetchMesas);
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  


  async function transferir() {
    if (!mesaDestino) return;
    setConfirm({
      accion: async () => {
        try {
          setTransfiriendo(true);
          transfiriendoRef.current = true;
          await api.post(`/cuentas/${cuentaId}/transferir`, null, {
            params: { nueva_mesa_id: mesaDestino },
          });
          onTransferida(Number(mesaDestino));
          onClose();
        } catch (err) {
          console.error("Error transfiriendo:", err);
          setErrorMsg("Error al transferir. Intente de nuevo.");
          setTransfiriendo(false);
          transfiriendoRef.current = false;
        }
      },
    });
  }

  const mesaSeleccionada = mesas.find((m) => m.id === Number(mesaDestino));

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
      }}
    >
      <div
        style={{
          background: "white",
          padding: 0,
          borderRadius: 18,
          width: "100%",
          maxWidth: 380,
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #eef2f0", display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 42, height: 42, borderRadius: 12,
              background: "#eff6ff", border: "1px solid #bfdbfe",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, flexShrink: 0,
            }}
          >
            🔄
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: "#1f2937" }}>
              Transferir Mesa
            </h2>
            <p style={{ margin: 0, marginTop: 2, fontSize: 12.5, color: "#94a3b8" }}>
              Mesa actual: <strong style={{ color: "#475569" }}>{mesaActual}</strong>
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px" }}>
          <label style={{
            display: "block", fontSize: 12, fontWeight: 700, color: "#334155",
            textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8,
          }}>
            Mesa de destino
          </label>

          <select
            key={fetchCount}
            value={mesaDestino}
            onChange={(e) => setMesaDestino(e.target.value)}
            style={{
              width: "100%", padding: "13px 14px", borderRadius: 10,
              border: "1px solid #d1d5db", fontSize: 15, fontWeight: 500,
              color: "#1f2937", background: "white", boxSizing: "border-box",
            }}
          >
            <option value="">Seleccione mesa</option>
            {mesas.map((mesa) => (
              <option key={mesa.id} value={mesa.id}>
                {mesa.nombre}
              </option>
            ))}
          </select>

          <div style={{ marginTop: 10, minHeight: 18 }}>
            {errorMsg ? (
              <p style={{ margin: 0, fontSize: 12.5, color: "#ef4444" }}>⚠️ {errorMsg}</p>
            ) : mesas.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8" }}>
                No hay mesas libres disponibles
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8" }}>
                {mesas.length} mesa{mesas.length !== 1 ? "s" : ""} libre{mesas.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", gap: 10, padding: "14px 22px",
          paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
          borderTop: "1px solid #eef2f0", background: "#fafafa",
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: 13, borderRadius: 10,
              border: "1px solid #d1d5db", background: "white",
              color: "#475569", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={transferir}
            disabled={!mesaDestino || transfiriendo}
            style={{
              flex: 1, padding: 13, borderRadius: 10, border: "none",
              background: !mesaDestino || transfiriendo ? "#bfdbfe" : "#2563eb",
              color: "white", fontWeight: 700, fontSize: 14,
              cursor: !mesaDestino || transfiriendo ? "not-allowed" : "pointer",
            }}
          >
            {transfiriendo ? "Transfiriendo..." : "Transferir"}
          </button>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          titulo="Transferir mesa"
          descripcion={`La cuenta pasará a ${mesaSeleccionada?.nombre ?? "la mesa seleccionada"}`}
          tipo="default"
          textoConfirmar="Transferir"
          onConfirmar={() => { confirm.accion(); setConfirm(null); }}
          onCancelar={() => setConfirm(null)}
        />
      )}
    </div>
  );
}