// src/components/ActividadMesaModal.tsx
//
// Equivalente móvil de ActividadMesaModal.tsx (Desktop). Mismos
// endpoints: GET /cuentas/:id/ordenes, PUT /detalle-orden/:id/cantidad/:n,
// PUT /detalle-orden/:id/observacion, DELETE /detalle-orden/:id.
// Cambia a modal fullscreen en vez de modal centrado de ancho fijo.

import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import ToastStack from "./Toast";
import { useToast } from "../hooks/useToast";
import type { DetalleOrdenActividad, ConfirmState } from "../services";

import { useWebSocket } from "../hooks/useWebSocket";


interface Props {
  cuentaId: number;
  onClose: () => void;
}

interface EdicionItem {
  cantidad: number;
  observacion: string;
}

const ESTADOS: Record<string, { color: string; bg: string; icon: string; border: string }> = {
  PENDIENTE: { color: "#92400e", bg: "#fffbeb", icon: "⏳", border: "#fde68a" },
  PREPARACION: { color: "#9a3412", bg: "#fff7ed", icon: "🔥", border: "#fed7aa" },
  LISTO: { color: "#14532d", bg: "#f0fdf4", icon: "✅", border: "#bbf7d0" },
  ENTREGADO: { color: "#334155", bg: "#f8fafc", icon: "🍽️", border: "#e2e8f0" },
};

export default function ActividadMesaModal({ cuentaId, onClose }: Props) {
  const [actividad, setActividad] = useState<DetalleOrdenActividad[]>([]);
  const [editando, setEditando] = useState<Record<number, EdicionItem>>({});
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const { toasts, toast } = useToast();

  const cargar = useCallback(async () => {
    try {
      const res = await api.get(`/cuentas/${cuentaId}/ordenes`);
      setActividad(res.data);
    } catch (error) {
      console.error(error);
    }
  }, [cuentaId]);




useWebSocket(["orden_nueva", "orden_actualizada"], cargar);

useEffect(() => {
  cargar();
}, [cargar]);


  function iniciarEdicion(item: DetalleOrdenActividad) {
    setEditando((prev) => ({
      ...prev,
      [item.id]: { cantidad: item.cantidad, observacion: item.observacion ?? "" },
    }));
  }

  function cancelarEdicion(id: number) {
    setEditando((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function guardarEdicion(item: DetalleOrdenActividad) {
    const ed = editando[item.id];
    if (!ed) return;

    const cantidadCambio = ed.cantidad !== item.cantidad;
    const observacionCambio = ed.observacion !== (item.observacion ?? "");
    const eliminar = ed.cantidad <= 0;

    setConfirm({
      titulo: eliminar ? "¿Eliminar ítem?" : "¿Guardar cambios?",
      descripcion: eliminar
        ? `Se eliminará "${item.producto}" de la orden.`
        : `Se actualizará "${item.producto}".`,
      tipo: eliminar ? "danger" : "warning",
      textoConfirmar: "Confirmar",
      onConfirmar: async () => {
        setConfirm(null);
        cancelarEdicion(item.id);
        try {
          if (cantidadCambio || eliminar) {
            await api.put(`/detalle-orden/${item.id}/cantidad/${ed.cantidad}`);
          }
          if (observacionCambio && !eliminar) {
            await api.put(`/detalle-orden/${item.id}/observacion`, null, {
              params: { observacion: ed.observacion },
            });
          }
          toast(`"${item.producto}" actualizado`);
          cargar();
        } catch {
          toast("No se pudo actualizar", "err");
        }
      },
    });
  }

  function cancelarItem(item: DetalleOrdenActividad) {
    setConfirm({
      titulo: "¿Cancelar ítem?",
      descripcion: `Se eliminará "${item.producto}" de la orden.`,
      tipo: "danger",
      textoConfirmar: "Sí, cancelar",
      onConfirmar: async () => {
        setConfirm(null);
        try {
          await api.delete(`/detalle-orden/${item.id}`);
          toast(`"${item.producto}" cancelado`);
          cargar();
        } catch {
          toast("No se pudo cancelar el ítem", "err");
        }
      },
    });
  }

  const ordenesAgrupadas = actividad.reduce(
    (acc: Record<number, { fecha: string; productos: DetalleOrdenActividad[] }>, item) => {
      if (!acc[item.orden_id]) acc[item.orden_id] = { fecha: item.fecha, productos: [] };
      acc[item.orden_id].productos.push(item);
      return acc;
    },
    {}
  );

  const totalOrdenes = Object.keys(ordenesAgrupadas).length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "white",
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid #eef2f0",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={onClose}
          style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e2e8f0", background: "white", fontSize: 16, flexShrink: 0 }}
        >
          ✕
        </button>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          🕓
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1f2937" }}>
            Actividad de la Mesa
          </h2>
          <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8" }}>
            Cuenta #{cuentaId} · {totalOrdenes} {totalOrdenes === 1 ? "orden" : "órdenes"}
          </p>
        </div>
      </div>

      {/* BODY */}
      <div style={{ padding: "16px 18px", overflowY: "auto", flex: 1 }}>
        {totalOrdenes === 0 && (
          <div style={{ textAlign: "center", padding: "50px 10px", color: "#94a3b8" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <p style={{ margin: 0, fontSize: 14 }}>Aún no hay actividad registrada</p>
          </div>
        )}

        {Object.entries(ordenesAgrupadas).map(([ordenId, orden]) => (
          <div key={ordenId} style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
                fontSize: 12,
                color: "#94a3b8",
                fontWeight: 700,
              }}
            >
              <span>Orden #{ordenId}</span>
              <span>{new Date(orden.fecha).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {orden.productos.map((item) => {
                const info = ESTADOS[item.estado] ?? ESTADOS.PENDIENTE;
                const isPendiente = item.estado === "PENDIENTE";
                const isEditando = !!editando[item.id];
                const ed = editando[item.id];

                return (
                  <div
                    key={item.id}
                    style={{
                      background: "white",
                      border: `1px solid ${isPendiente ? "#fde68a" : "#eef2f0"}`,
                      borderRadius: 10,
                      padding: "10px 14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        {isPendiente && isEditando ? (
                          <input
                            type="number"
                            min={0}
                            value={ed.cantidad}
                            onChange={(e) =>
                              setEditando((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], cantidad: parseInt(e.target.value) || 0 },
                              }))
                            }
                            style={{
                              width: 56,
                              padding: "4px 6px",
                              borderRadius: 7,
                              border: "1px solid #fde68a",
                              fontWeight: 800,
                              fontSize: 13,
                              textAlign: "center",
                              background: "#fffbeb",
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              background: isPendiente ? "#fffbeb" : "#f1f5f9",
                              border: `1px solid ${isPendiente ? "#fde68a" : "#e2e8f0"}`,
                              color: isPendiente ? "#92400e" : "#334155",
                              fontWeight: 800,
                              fontSize: 13,
                              borderRadius: 7,
                              padding: "3px 9px",
                              flexShrink: 0,
                            }}
                          >
                            x{item.cantidad}
                          </span>
                        )}
                        <span style={{ fontSize: 13.5, color: "#334155", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.producto}
                        </span>
                      </div>

                      <span
                        style={{
                          background: info.bg,
                          color: info.color,
                          border: `1px solid ${info.border}`,
                          padding: "3px 9px",
                          borderRadius: 99,
                          fontSize: 10.5,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {info.icon} {item.estado}
                      </span>
                    </div>

                    {isPendiente && isEditando ? (
                      <input
                        type="text"
                        placeholder="Observación (opcional)"
                        value={ed.observacion}
                        onChange={(e) =>
                          setEditando((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], observacion: e.target.value },
                          }))
                        }
                        style={{
                          marginTop: 8,
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "7px 10px",
                          borderRadius: 7,
                          border: "1px solid #e2e8f0",
                          fontSize: 12.5,
                          color: "#475569",
                          background: "#f8fafc",
                        }}
                      />
                    ) : item.observacion ? (
                      <p style={{ margin: "5px 0 0", fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                        📝 {item.observacion}
                      </p>
                    ) : null}

                    {isPendiente && (
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        {isEditando ? (
                          <>
                            <button
                              onClick={() => guardarEdicion(item)}
                              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#14532d", fontWeight: 700, fontSize: 12.5 }}
                            >
                              ✓ Guardar
                            </button>
                            <button
                              onClick={() => cancelarEdicion(item.id)}
                              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#64748b", fontWeight: 700, fontSize: 12.5 }}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => iniciarEdicion(item)}
                              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", fontWeight: 700, fontSize: 12.5 }}
                            >
                              ✎ Editar
                            </button>
                            <button
                              onClick={() => cancelarItem(item)}
                              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontWeight: 700, fontSize: 12.5 }}
                            >
                              🗑 Cancelar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ padding: "14px 18px", paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid #eef2f0", background: "#fafafa" }}>
        <button
          onClick={onClose}
          style={{ width: "100%", padding: 14, borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#475569", fontWeight: 700, fontSize: 14.5 }}
        >
          Cerrar
        </button>
      </div>

      <ToastStack toasts={toasts} />

      {confirm && <ConfirmModal {...confirm} onCancelar={() => setConfirm(null)} />}
    </div>
  );
}