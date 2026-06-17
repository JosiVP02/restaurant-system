import { useEffect, useState } from "react";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";






interface Mesa {
  id: number;
  nombre: string;
  estado: string;
}

interface Props {
  cuentaId: number;
  mesaActual: number;
  onClose: () => void;
  onTransferida: (
  nuevaMesaId: number
) => void;
}

export default function TransferirMesaModal({
  cuentaId,
  mesaActual,
  onClose,
  onTransferida
}: Props) {

  const [mesas, setMesas] =
    useState<Mesa[]>([]);

  const [mesaDestino, setMesaDestino] =
    useState("");

  const [transfiriendo, setTransfiriendo] =
    useState(false);

  async function cargarMesas() {

    const res =
      await api.get("/mesas");

    setMesas(
      res.data.filter(
        (m: Mesa) =>
          m.estado === "LIBRE"
      )
    );
  }


const [confirm, setConfirm] = useState<{
  accion: () => void;
} | null>(null);





async function transferir() {
  if (!mesaDestino) return;

  setConfirm({
    accion: async () => {
      try {
        setTransfiriendo(true);

        await api.post(
          `/cuentas/${cuentaId}/transferir`,
          null,
          {
            params: {
              nueva_mesa_id: mesaDestino,
            },
          }
        );

        onTransferida(
          Number(mesaDestino)
        );

        onClose();
      } finally {
        setTransfiriendo(false);
      }
    },
  });
}







  useEffect(() => {
    cargarMesas();
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(15,31,26,0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        justifyContent:
          "center",
        alignItems: "center",
        zIndex: 9999
      }}
    >
      <div
        style={{
          background: "white",
          padding: 0,
          borderRadius: 18,
          width: 440,
          maxWidth: "95vw",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            padding: "20px 26px",
            borderBottom: "1px solid #eef2f0",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            🔄
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: "#1f2937",
                letterSpacing: "-0.01em",
              }}
            >
              Transferir Mesa
            </h2>
            <p style={{ margin: 0, marginTop: 2, fontSize: 13, color: "#94a3b8" }}>
              Mesa actual: <strong style={{ color: "#475569" }}>{mesaActual}</strong>
            </p>
          </div>
        </div>

        <div style={{ padding: "22px 26px" }}>
          <label
            style={{
              display: "block",
              fontSize: 12.5,
              fontWeight: 700,
              color: "#334155",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            Mesa de destino
          </label>

          <select
            value={mesaDestino}
            onChange={(e) =>
              setMesaDestino(
                e.target.value
              )
            }
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontSize: 14,
              fontWeight: 500,
              color: "#1f2937",
              background: "white",
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          >
            <option value="">
              Seleccione mesa
            </option>

            {mesas.map(
              (mesa) => (
                <option
                  key={mesa.id}
                  value={mesa.id}
                >
                  {mesa.nombre}
                </option>
              )
            )}
          </select>

          {mesas.length === 0 && (
            <p style={{ marginTop: 10, fontSize: 12.5, color: "#94a3b8" }}>
              No hay mesas libres disponibles
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "16px 26px",
            borderTop: "1px solid #eef2f0",
            background: "#fafafa",
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 10,
              border: "1px solid #d1d5db",
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
            onClick={transferir}
            disabled={!mesaDestino || transfiriendo}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 10,
              border: "none",
              background: !mesaDestino || transfiriendo ? "#bfdbfe" : "#2563eb",
              color: "white",
              fontWeight: 700,
              fontSize: 14,
              cursor: !mesaDestino || transfiriendo ? "default" : "pointer",
              boxShadow: !mesaDestino || transfiriendo ? "none" : "0 4px 12px rgba(37,99,235,0.3)",
              transition: "all 0.15s",
            }}
          >
            {transfiriendo ? "Transfiriendo..." : "Transferir"}
          </button>
        </div>
      </div>


      {confirm && (
        <ConfirmModal
          titulo="Transferir mesa"
          descripcion={`La cuenta pasará a ${mesas.find((m) => m.id === Number(mesaDestino))?.nombre ?? "la mesa seleccionada"}`}
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