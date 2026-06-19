import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  Clock,
  Inbox,
  Pencil,
  Trash2,
  Check,
  X,
  Flame,
  CheckCircle2,
  UtensilsCrossed,
  Hourglass,
  FileText,
} from "lucide-react";

// ─── Paleta ─────────────────────────────────────────────────────────────────
const C = {
  overlay:        "rgba(15,23,42,0.62)",
  surface:        "#ffffff",
  surfaceSubtle:  "#f8fafc",
  border:         "#e2e8f0",
  borderStrong:   "#cbd5e1",

  textPrimary:    "#0f172a",
  textSecondary:  "#475569",
  textMuted:      "#94a3b8",
  textLabel:      "#334155",

  accent:         "#059669",
  accentSubtle:   "#ecfdf5",
  accentBorder:   "#6ee7b7",
  accentText:     "#065f46",
  accentShadow:   "rgba(5,150,105,0.18)",

  iconBg:         "#f1f5f9",
  iconBorder:     "#e2e8f0",

  ordenBg:        "#f8fafc",
  ordenBorder:    "#e2e8f0",

  itemBg:         "#ffffff",

  modalShadow:    "0 32px 80px rgba(15,23,42,0.22), 0 4px 20px rgba(15,23,42,0.08)",
};

// ─── Configuración de estados ─────────────────────────────────────────────
const ESTADOS: Record<string, {
  color: string; bg: string; border: string;
  Icon: React.FC<{ size?: number; strokeWidth?: number; color?: string }>;
  label: string;
}> = {
  PENDIENTE:   {
    color: "#92400e", bg: "#fffbeb", border: "#fde68a",
    Icon: Hourglass, label: "Pendiente",
  },
  PREPARACION: {
    color: "#9a3412", bg: "#fff7ed", border: "#fed7aa",
    Icon: Flame, label: "En preparación",
  },
  LISTO:       {
    color: "#14532d", bg: "#f0fdf4", border: "#bbf7d0",
    Icon: CheckCircle2, label: "Listo",
  },
  ENTREGADO:   {
    color: "#475569", bg: "#f8fafc", border: "#e2e8f0",
    Icon: UtensilsCrossed, label: "Entregado",
  },
};

// ─── Tipos ───────────────────────────────────────────────────────────────────
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

interface EdicionItem {
  cantidad: number;
  observacion: string;
}

// ─── Componente ──────────────────────────────────────────────────────────────
export default function ActividadMesaModal({ cuentaId, onClose }: Props) {
  const [actividad, setActividad] = useState<Actividad[]>([]);
  const [editando,  setEditando]  = useState<Record<number, EdicionItem>>({});
  const [confirm,   setConfirm]   = useState<null | {
    titulo: string;
    descripcion?: string;
    tipo?: "default" | "warning" | "danger";
    textoConfirmar?: string;
    onConfirmar: () => void;
  }>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "ok" | "err" }[]>([]);

  // ── Lógica intacta ────────────────────────────────────────────────────────
  const toast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const cargar = useCallback(async () => {
    const res = await api.get(`/cuentas/${cuentaId}/ordenes`);
    setActividad(res.data);
  }, [cuentaId]);

  useWebSocket(["orden_nueva", "orden_actualizada"], cargar);
  useEffect(() => { cargar(); }, [cargar]);

  function iniciarEdicion(item: Actividad) {
    setEditando(prev => ({
      ...prev,
      [item.id]: { cantidad: item.cantidad, observacion: item.observacion ?? "" },
    }));
  }

  function cancelarEdicion(id: number) {
    setEditando(prev => { const next = { ...prev }; delete next[id]; return next; });
  }

  function guardarEdicion(item: Actividad) {
    const ed = editando[item.id];
    if (!ed) return;
    const cantidadCambio    = ed.cantidad    !== item.cantidad;
    const observacionCambio = ed.observacion !== (item.observacion ?? "");
    const eliminar          = ed.cantidad <= 0;

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
          if (cantidadCambio || eliminar)
            await api.put(`/detalle-orden/${item.id}/cantidad/${ed.cantidad}`);
          if (observacionCambio && !eliminar)
            await api.put(`/detalle-orden/${item.id}/observacion`, null, {
              params: { observacion: ed.observacion },
            });
          toast(`"${item.producto}" actualizado`);
          cargar();
        } catch {
          toast("No se pudo actualizar", "err");
        }
      },
    });
  }

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

  const ordenesAgrupadas = actividad.reduce(
    (acc: Record<number, { fecha: string; productos: Actividad[] }>, item) => {
      if (!acc[item.orden_id]) acc[item.orden_id] = { fecha: item.fecha, productos: [] };
      acc[item.orden_id].productos.push(item);
      return acc;
    },
    {}
  );

  const totalOrdenes = Object.keys(ordenesAgrupadas).length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      position:       "fixed",
      inset:          0,
      background:     C.overlay,
      backdropFilter: "blur(3px)",
      display:        "flex",
      justifyContent: "center",
      alignItems:     "center",
      zIndex:         999,
    }}>
      <div style={{
        background:    C.surface,
        width:         700,
        maxWidth:      "95vw",
        maxHeight:     "85vh",
        display:       "flex",
        flexDirection: "column",
        borderRadius:  20,
        overflow:      "hidden",
        boxShadow:     C.modalShadow,
        fontFamily:    "'Inter', system-ui, sans-serif",
        border:        `1px solid ${C.border}`,
      }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{
          padding:      "20px 26px",
          borderBottom: `1px solid ${C.border}`,
          display:      "flex",
          alignItems:   "center",
          gap:          14,
          flexShrink:   0,
          background:   C.surface,
        }}>
          <div style={{
            width:          46,
            height:         46,
            borderRadius:   13,
            background:     C.iconBg,
            border:         `1.5px solid ${C.iconBorder}`,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            flexShrink:     0,
          }}>
            <Clock size={20} color={C.textSecondary} strokeWidth={2.2} />
          </div>
          <div>
            <h2 style={{
              margin:        0,
              fontSize:      18,
              fontWeight:    800,
              color:         C.textPrimary,
              letterSpacing: "-0.02em",
              lineHeight:    1.2,
            }}>
              Actividad de la Mesa
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: C.textMuted, fontWeight: 500 }}>
              Cuenta{" "}
              <span style={{
                color: C.textSecondary, fontWeight: 700,
                background: "#f1f5f9", padding: "1px 7px",
                borderRadius: 5, fontSize: 12, border: `1px solid ${C.border}`,
              }}>
                #{cuentaId}
              </span>
              {" "}·{" "}
              <span style={{ color: C.textSecondary, fontWeight: 600 }}>
                {totalOrdenes} {totalOrdenes === 1 ? "orden" : "órdenes"}
              </span>
              {" "}registradas
            </p>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div style={{
          padding:   "20px 26px",
          overflowY: "auto",
          flex:      1,
          display:   "flex",
          flexDirection: "column",
          gap:       12,
        }}>

          {/* Estado vacío */}
          {totalOrdenes === 0 && (
            <div style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              justifyContent: "center",
              padding:        "56px 20px",
              gap:            12,
              color:          C.textMuted,
            }}>
              <div style={{
                width:          60,
                height:         60,
                borderRadius:   16,
                background:     C.surfaceSubtle,
                border:         `1.5px solid ${C.border}`,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
              }}>
                <Inbox size={26} color={C.textMuted} strokeWidth={1.5} />
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                Aún no hay actividad registrada
              </p>
            </div>
          )}

          {/* Órdenes agrupadas */}
          {Object.entries(ordenesAgrupadas).map(([ordenId, orden]) => (
            <div key={ordenId} style={{
              border:       `1.5px solid ${C.ordenBorder}`,
              background:   C.ordenBg,
              borderRadius: 14,
              overflow:     "hidden",
            }}>
              {/* Cabecera de orden */}
              <div style={{
                padding:        "12px 16px",
                display:        "flex",
                justifyContent: "space-between",
                alignItems:     "center",
                borderBottom:   `1px solid ${C.border}`,
                background:     C.surface,
              }}>
                <span style={{
                  fontSize:   13.5,
                  fontWeight: 800,
                  color:      C.textPrimary,
                  letterSpacing: "-0.01em",
                }}>
                  Orden <span style={{ color: C.textMuted, fontWeight: 600 }}>#{ordenId}</span>
                </span>
                <span style={{
                  fontSize:   11.5,
                  color:      C.textMuted,
                  fontWeight: 500,
                }}>
                  {new Date(orden.fecha).toLocaleString("es-CR", {
                    hour: "2-digit", minute: "2-digit",
                    day: "2-digit", month: "short",
                  })}
                </span>
              </div>

              {/* Productos de la orden */}
              <div style={{
                display:       "flex",
                flexDirection: "column",
                gap:           1,
                padding:       "8px",
              }}>
                {orden.productos.map((item: Actividad) => {
                  const info       = ESTADOS[item.estado] ?? ESTADOS.PENDIENTE;
                  const { Icon: EstadoIcon } = info;
                  const isPendiente = item.estado === "PENDIENTE";
                  const isEditando  = !!editando[item.id];
                  const ed          = editando[item.id];

                  return (
                    <div key={item.id} style={{
                      background:   C.itemBg,
                      border:       `1.5px solid ${isPendiente && !isEditando ? "#fde68a" : C.border}`,
                      borderRadius: 10,
                      padding:      "11px 13px",
                      transition:   "border-color 0.15s",
                    }}>

                      {/* Fila principal: cantidad + nombre + badge */}
                      <div style={{
                        display:    "flex",
                        alignItems: "center",
                        gap:        10,
                      }}>

                        {/* Cantidad */}
                        {isPendiente && isEditando ? (
                          <input
                            type="number"
                            min={0}
                            value={ed.cantidad}
                            onChange={e => setEditando(prev => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], cantidad: parseInt(e.target.value) || 0 },
                            }))}
                            style={{
                              width:        56,
                              padding:      "5px 8px",
                              borderRadius: 7,
                              border:       "1.5px solid #fde68a",
                              fontWeight:   800,
                              fontSize:     13,
                              textAlign:    "center",
                              background:   "#fffbeb",
                              color:        "#92400e",
                              flexShrink:   0,
                              outline:      "none",
                              fontFamily:   "inherit",
                            }}
                          />
                        ) : (
                          <span style={{
                            background:  isPendiente ? "#fffbeb" : "#f1f5f9",
                            border:      `1.5px solid ${isPendiente ? "#fde68a" : C.border}`,
                            color:       isPendiente ? "#92400e" : C.textLabel,
                            fontWeight:  800,
                            fontSize:    12,
                            borderRadius:7,
                            padding:     "3px 9px",
                            minWidth:    28,
                            textAlign:   "center",
                            flexShrink:  0,
                            letterSpacing:"-0.01em",
                          }}>
                            ×{item.cantidad}
                          </span>
                        )}

                        {/* Nombre */}
                        <span style={{
                          fontSize:   13.5,
                          color:      C.textLabel,
                          fontWeight: 600,
                          flex:       1,
                          lineHeight: 1.3,
                        }}>
                          {item.producto}
                        </span>

                        {/* Badge estado */}
                        <span style={{
                          background:  info.bg,
                          color:       info.color,
                          border:      `1.5px solid ${info.border}`,
                          padding:     "3px 9px",
                          borderRadius:99,
                          fontSize:    11,
                          fontWeight:  700,
                          display:     "flex",
                          alignItems:  "center",
                          gap:         5,
                          whiteSpace:  "nowrap",
                          flexShrink:  0,
                        }}>
                          <EstadoIcon size={10} strokeWidth={2.5} color={info.color} />
                          {info.label}
                        </span>
                      </div>

                      {/* Observación */}
                      {isPendiente && isEditando ? (
                        <input
                          type="text"
                          placeholder="Observación (opcional)"
                          value={ed.observacion}
                          onChange={e => setEditando(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], observacion: e.target.value },
                          }))}
                          style={{
                            marginTop:    8,
                            width:        "100%",
                            boxSizing:    "border-box",
                            padding:      "7px 10px",
                            borderRadius: 7,
                            border:       `1.5px solid ${C.border}`,
                            fontSize:     12,
                            color:        C.textSecondary,
                            background:   C.surfaceSubtle,
                            outline:      "none",
                            fontFamily:   "inherit",
                          }}
                        />
                      ) : item.observacion ? (
                        <div style={{
                          display:    "flex",
                          alignItems: "flex-start",
                          gap:        6,
                          marginTop:  7,
                        }}>
                          <FileText size={12} color={C.textMuted} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                          <p style={{
                            margin:     0,
                            fontSize:   12,
                            color:      C.textMuted,
                            fontStyle:  "italic",
                            lineHeight: 1.4,
                          }}>
                            {item.observacion}
                          </p>
                        </div>
                      ) : null}

                      {/* Botones (solo PENDIENTE) */}
                      {isPendiente && (
                        <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
                          {isEditando ? (
                            <>
                              <button
                                onClick={() => guardarEdicion(item)}
                                style={{
                                  flex:         1,
                                  padding:      "7px 0",
                                  borderRadius: 8,
                                  border:       `1.5px solid ${C.accentBorder}`,
                                  background:   C.accentSubtle,
                                  color:        C.accentText,
                                  fontWeight:   700,
                                  fontSize:     12,
                                  cursor:       "pointer",
                                  fontFamily:   "inherit",
                                  display:      "flex",
                                  alignItems:   "center",
                                  justifyContent:"center",
                                  gap:          5,
                                }}
                              >
                                <Check size={13} strokeWidth={2.5} /> Guardar
                              </button>
                              <button
                                onClick={() => cancelarEdicion(item.id)}
                                style={{
                                  flex:         1,
                                  padding:      "7px 0",
                                  borderRadius: 8,
                                  border:       `1.5px solid ${C.border}`,
                                  background:   C.surface,
                                  color:        C.textSecondary,
                                  fontWeight:   700,
                                  fontSize:     12,
                                  cursor:       "pointer",
                                  fontFamily:   "inherit",
                                  display:      "flex",
                                  alignItems:   "center",
                                  justifyContent:"center",
                                  gap:          5,
                                }}
                              >
                                <X size={13} strokeWidth={2.5} /> Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => iniciarEdicion(item)}
                                style={{
                                  flex:         1,
                                  padding:      "7px 0",
                                  borderRadius: 8,
                                  border:       "1.5px solid #fde68a",
                                  background:   "#fffbeb",
                                  color:        "#92400e",
                                  fontWeight:   700,
                                  fontSize:     12,
                                  cursor:       "pointer",
                                  fontFamily:   "inherit",
                                  display:      "flex",
                                  alignItems:   "center",
                                  justifyContent:"center",
                                  gap:          5,
                                }}
                              >
                                <Pencil size={12} strokeWidth={2.5} /> Editar
                              </button>
                              <button
                                onClick={() => cancelarItem(item)}
                                style={{
                                  flex:         1,
                                  padding:      "7px 0",
                                  borderRadius: 8,
                                  border:       "1.5px solid #fecaca",
                                  background:   "#fef2f2",
                                  color:        "#dc2626",
                                  fontWeight:   700,
                                  fontSize:     12,
                                  cursor:       "pointer",
                                  fontFamily:   "inherit",
                                  display:      "flex",
                                  alignItems:   "center",
                                  justifyContent:"center",
                                  gap:          5,
                                }}
                              >
                                <Trash2 size={12} strokeWidth={2.5} /> Cancelar ítem
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

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div style={{
          padding:    "16px 26px",
          borderTop:  `1px solid ${C.border}`,
          background: C.surfaceSubtle,
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              width:        "100%",
              padding:      12,
              borderRadius: 10,
              border:       `1.5px solid ${C.border}`,
              background:   C.surface,
              color:        C.textSecondary,
              fontWeight:   700,
              fontSize:     14,
              cursor:       "pointer",
              fontFamily:   "inherit",
              letterSpacing:"-0.01em",
              transition:   "background 0.12s, border-color 0.12s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background  = "#f1f5f9";
              e.currentTarget.style.borderColor = C.borderStrong;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background  = C.surface;
              e.currentTarget.style.borderColor = C.border;
            }}
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* ── Toasts ───────────────────────────────────────────────────────── */}
      <div style={{
        position:      "fixed",
        bottom:        28,
        left:          "50%",
        transform:     "translateX(-50%)",
        display:       "flex",
        flexDirection: "column",
        gap:           8,
        zIndex:        99999,
        alignItems:    "center",
        pointerEvents: "none",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding:      "9px 20px",
            borderRadius: 99,
            fontSize:     13,
            fontWeight:   600,
            whiteSpace:   "nowrap",
            background:   t.type === "ok" ? C.accentSubtle : "#fef2f2",
            border:       `1.5px solid ${t.type === "ok" ? C.accentBorder : "#fecaca"}`,
            color:        t.type === "ok" ? C.accentText  : "#dc2626",
            boxShadow:    "0 4px 16px rgba(15,23,42,0.12)",
            display:      "flex",
            alignItems:   "center",
            gap:          8,
          }}>
            {t.type === "ok"
              ? <CheckCircle2 size={14} color={C.accent} strokeWidth={2.2} />
              : <X size={14} color="#dc2626" strokeWidth={2.5} />
            }
            {t.msg}
          </div>
        ))}
      </div>

      {/* ── ConfirmModal (sin tocar) ──────────────────────────────────── */}
      {confirm && (
        <ConfirmModal
          {...confirm}
          onCancelar={() => setConfirm(null)}
        />
      )}
    </div>
  );
}