import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";

interface Props {
  cuentaId: number;
  onClose: () => void;
}

interface Actividad {
  id: number;
  orden_id: number;
  fecha: string;
  producto: string;
  cantidad: number;
  observacion?: string;
  estado: string;
}

// Estado de edición por ítem — cantidad + observacion independientes
interface EdicionItem {
  cantidad: number;
  observacion: string;
}

const ESTADOS: Record<string, { color: string; bg: string; icon: string; border: string }> = {
  PENDIENTE:   { color: "#92400e", bg: "#fffbeb", icon: "⏳", border: "#fde68a" },
  PREPARACION: { color: "#9a3412", bg: "#fff7ed", icon: "🔥", border: "#fed7aa" },
  LISTO:       { color: "#14532d", bg: "#f0fdf4", icon: "✅", border: "#bbf7d0" },
  ENTREGADO:   { color: "#334155", bg: "#f8fafc", icon: "🍽️", border: "#e2e8f0" },
};

export default function ActividadMesaModal({ cuentaId, onClose }: Props) {
  const [actividad, setActividad] = useState<Actividad[]>([]);
  const [editando, setEditando] = useState<Record<number, EdicionItem>>({});
  const [confirm, setConfirm] = useState<null | {
    titulo: string;
    descripcion?: string;
    tipo?: "default" | "warning" | "danger";
    textoConfirmar?: string;
    onConfirmar: () => void;
  }>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "ok" | "err" }[]>([]);

  const toast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  async function cargar() {
    const res = await api.get(`/cuentas/${cuentaId}/ordenes`);
    setActividad(res.data);
  }

  useEffect(() => { cargar(); }, []);



  
  // ── Edición ──────────────────────────────────────────────────────────────

  function iniciarEdicion(item: Actividad) {
    setEditando(prev => ({
      ...prev,
      [item.id]: {
        cantidad: item.cantidad,
        observacion: item.observacion ?? "",
      },
    }));
  }

  function cancelarEdicion(id: number) {
    setEditando(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function guardarEdicion(item: Actividad) {
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
          // ✅ Cantidad en la URL — evita el bug cantidad=3:1
          if (cantidadCambio || eliminar) {
            await api.put(`/detalle-orden/${item.id}/cantidad/${ed.cantidad}`);
          }
          // ✅ Observación como query param (es texto, no número — no da problema)
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

  // ── Cancelar ítem ────────────────────────────────────────────────────────

  function cancelarItem(item: Actividad) {
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

  // ── Agrupación ───────────────────────────────────────────────────────────

  const ordenesAgrupadas = actividad.reduce(
    (acc: Record<number, { fecha: string; productos: Actividad[] }>, item) => {
      if (!acc[item.orden_id]) acc[item.orden_id] = { fecha: item.fecha, productos: [] };
      acc[item.orden_id].productos.push(item);
      return acc;
    },
    {}
  );

  const totalOrdenes = Object.keys(ordenesAgrupadas).length;

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(15,31,26,0.55)",
      backdropFilter: "blur(2px)",
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 999,
    }}>
      <div style={{
        background: "white",
        width: 700, maxWidth: "95vw", maxHeight: "85vh",
        display: "flex", flexDirection: "column",
        borderRadius: 18, overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>

        {/* HEADER */}
        <div style={{
          padding: "20px 26px",
          borderBottom: "1px solid #eef2f0",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "#f1f5f9", border: "1px solid #e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, flexShrink: 0,
          }}>🕓</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#1f2937" }}>
              Actividad de la Mesa
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>
              Cuenta #{cuentaId} · {totalOrdenes} {totalOrdenes === 1 ? "orden" : "órdenes"} registradas
            </p>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: "20px 26px", overflowY: "auto", flex: 1 }}>
          {totalOrdenes === 0 && (
            <div style={{ textAlign: "center", padding: "40px 10px", color: "#94a3b8" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
              <p style={{ margin: 0, fontSize: 14 }}>Aún no hay actividad registrada</p>
            </div>
          )}

          {Object.entries(ordenesAgrupadas).map(([ordenId, orden]) => (
            <div key={ordenId} style={{
              border: "1px solid #eef2f0",
              background: "#f8fafc",
              borderRadius: 14, padding: 18, marginBottom: 14,
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 12,
              }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1f2937" }}>
                  Orden #{ordenId}
                </h3>
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                  {new Date(orden.fecha).toLocaleString()}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {orden.productos.map((item: Actividad) => {
                  const info = ESTADOS[item.estado] ?? ESTADOS.PENDIENTE;
                  const isPendiente = item.estado === "PENDIENTE";
                  const isEditando = !!editando[item.id];
                  const ed = editando[item.id];

                  return (
                    <div key={item.id} style={{
                      background: "white",
                      border: `1px solid ${isPendiente ? "#fde68a" : "#eef2f0"}`,
                      borderRadius: 10, padding: "10px 14px",
                    }}>
                      {/* FILA SUPERIOR: cantidad + nombre + badge */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>

                          {/* CANTIDAD */}
                          {isPendiente && isEditando ? (
                            <input
                              type="number"
                              min={0}
                              value={ed.cantidad}
                              onChange={e =>
                                setEditando(prev => ({
                                  ...prev,
                                  [item.id]: { ...prev[item.id], cantidad: parseInt(e.target.value) || 0 },
                                }))
                              }
                              style={{
                                width: 60, padding: "4px 8px",
                                borderRadius: 7, border: "1px solid #fde68a",
                                fontWeight: 800, fontSize: 13,
                                textAlign: "center", background: "#fffbeb",
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <span style={{
                              background: isPendiente ? "#fffbeb" : "#f1f5f9",
                              border: `1px solid ${isPendiente ? "#fde68a" : "#e2e8f0"}`,
                              color: isPendiente ? "#92400e" : "#334155",
                              fontWeight: 800, fontSize: 13,
                              borderRadius: 7, padding: "3px 10px",
                              minWidth: 28, textAlign: "center", flexShrink: 0,
                            }}>
                              x{item.cantidad}
                            </span>
                          )}

                          {/* NOMBRE */}
                          <span style={{ fontSize: 14, color: "#334155", fontWeight: 600 }}>
                            {item.producto}
                          </span>
                        </div>

                        {/* BADGE ESTADO */}
                        <span style={{
                          background: info.bg, color: info.color,
                          border: `1px solid ${info.border}`,
                          padding: "3px 10px", borderRadius: 99,
                          fontSize: 11, fontWeight: 700,
                          display: "flex", alignItems: "center", gap: 4,
                          whiteSpace: "nowrap",
                        }}>
                          {info.icon} {item.estado}
                        </span>
                      </div>

                      {/* OBSERVACIÓN — input en modo edición, texto en modo lectura */}
                      {isPendiente && isEditando ? (
                        <input
                          type="text"
                          placeholder="Observación (opcional)"
                          value={ed.observacion}
                          onChange={e =>
                            setEditando(prev => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], observacion: e.target.value },
                            }))
                          }
                          style={{
                            marginTop: 8, width: "100%", boxSizing: "border-box",
                            padding: "6px 10px", borderRadius: 7,
                            border: "1px solid #e2e8f0", fontSize: 12,
                            color: "#475569", background: "#f8fafc",
                          }}
                        />
                      ) : item.observacion ? (
                        <p style={{
                          margin: "5px 0 0", fontSize: 12,
                          color: "#94a3b8", fontStyle: "italic",
                        }}>
                          📝 {item.observacion}
                        </p>
                      ) : null}

                      {/* BOTONES SOLO SI PENDIENTE */}
                      {isPendiente && (
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          {isEditando ? (
                            <>
                              <button
                                onClick={() => guardarEdicion(item)}
                                style={{
                                  flex: 1, padding: "7px 0", borderRadius: 8,
                                  border: "1px solid #bbf7d0", background: "#f0fdf4",
                                  color: "#14532d", fontWeight: 700, fontSize: 12, cursor: "pointer",
                                }}
                              >
                                ✓ Guardar
                              </button>
                              <button
                                onClick={() => cancelarEdicion(item.id)}
                                style={{
                                  flex: 1, padding: "7px 0", borderRadius: 8,
                                  border: "1px solid #e2e8f0", background: "white",
                                  color: "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer",
                                }}
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => iniciarEdicion(item)}
                                style={{
                                  flex: 1, padding: "7px 0", borderRadius: 8,
                                  border: "1px solid #fde68a", background: "#fffbeb",
                                  color: "#92400e", fontWeight: 700, fontSize: 12, cursor: "pointer",
                                }}
                              >
                                ✎ Editar
                              </button>
                              <button
                                onClick={() => cancelarItem(item)}
                                style={{
                                  flex: 1, padding: "7px 0", borderRadius: 8,
                                  border: "1px solid #fecaca", background: "#fef2f2",
                                  color: "#dc2626", fontWeight: 700, fontSize: 12, cursor: "pointer",
                                }}
                              >
                                🗑 Cancelar ítem
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
        <div style={{ padding: "16px 26px", borderTop: "1px solid #eef2f0", background: "#fafafa" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: 13, borderRadius: 10,
              border: "1px solid #d1d5db", background: "white",
              color: "#475569", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* TOASTS */}
      <div style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", gap: 8, zIndex: 99999, alignItems: "center",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600,
            whiteSpace: "nowrap",
            background: t.type === "ok" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${t.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
            color: t.type === "ok" ? "#15803d" : "#dc2626",
          }}>
            {t.msg}
          </div>
        ))}
      </div>

      {confirm && (
        <ConfirmModal
          {...confirm}
          onCancelar={() => setConfirm(null)}
        />
      )}
    </div>
  );
}