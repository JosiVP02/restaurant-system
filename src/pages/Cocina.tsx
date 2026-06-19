import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  ChefHat, Clock, Flame, CheckCircle2, UtensilsCrossed,
  Trash2, AlertTriangle, Bell, FileText, ChevronRight,
  Snowflake, Package, Brush,
} from "lucide-react";

interface OrdenCocina {
  id: number;
  orden_id: number;
  mesa: string;
  producto: string;
  cantidad: number;
  observacion: string | null;
  estado: string;
  fecha: string;
}
interface OrdenAgrupada {
  mesa: string;
  fecha: string;
  productos: OrdenCocina[];
}

// ── Paleta (idéntica a Ventas/Productos/Cierre) ───────────────
const C = {
  bg:       "#f4f6f8",
  card:     "#ffffff",
  cardB:    "#f9fafb",
  border:   "#e4e7ec",
  border2:  "#f0f2f5",
  green:    "#16873d",
  greenLt:  "#f0faf4",
  greenB:   "#a7d7b8",
  greenMid: "#d1edd9",
  blue:     "#2f54a0",
  blueLt:   "#f0f4fb",
  blueB:    "#afc1e8",
  blueMid:  "#d5dff4",
  amber:    "#a16207",
  amberLt:  "#fdf8ee",
  amberB:   "#e8c97a",
  amberMid: "#f5e8be",
  red:      "#b91c1c",
  redLt:    "#fef2f2",
  redMid:   "#fecaca",
  slate:    "#111827",
  slate2:   "#1f2937",
  text:     "#1f2937",
  muted:    "#6b7280",
  dim:      "#9ca3af",
  dimB:     "#d1d5db",
};

// ── Estados con iconos lucide ─────────────────────────────────
const ESTADOS: Record<string, {
  color: string; bg: string; border: string;
  icon: React.ReactNode; label: string;
}> = {
  PENDIENTE:   {
    color: C.amber,  bg: C.amberLt, border: C.amberB,
    icon: <Clock size={13} />, label: "Pendiente",
  },
  PREPARACION: {
    color: C.red,    bg: C.redLt,   border: C.redMid,
    icon: <Flame size={13} />, label: "En preparación",
  },
  LISTO:       {
    color: C.green,  bg: C.greenLt, border: C.greenB,
    icon: <CheckCircle2 size={13} />, label: "Listo",
  },
  ENTREGADO:   {
    color: C.muted,  bg: C.bg,      border: C.border,
    icon: <UtensilsCrossed size={13} />, label: "Entregado",
  },
};

const SIGUIENTE: Record<string, {
  estado: string; label: string;
  tipo: "default" | "warning" | "danger";
  icon: React.ReactNode;
}> = {
  PENDIENTE:   { estado: "PREPARACION", label: "Iniciar preparación", tipo: "warning", icon: <Flame size={13} />       },
  PREPARACION: { estado: "LISTO",       label: "Marcar como listo",   tipo: "default", icon: <CheckCircle2 size={13} /> },
  LISTO:       { estado: "ENTREGADO",   label: "Confirmar entrega",   tipo: "default", icon: <UtensilsCrossed size={13} /> },
};

// ── Notificaciones ────────────────────────────────────────────
function pedirPermisoNotificaciones() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}
function notificarNuevaOrden(mesa: string, productos: string[]) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(`Nueva orden — Mesa ${mesa}`, {
      body: productos.join(", "),
      icon: "/favicon.ico",
      tag: `orden-${mesa}-${Date.now()}`,
    });
  }
}

export default function Cocina() {
  const [ordenes, setOrdenes]   = useState<OrdenCocina[]>([]);
  const [toasts, setToasts]     = useState<{ id: number; msg: string; type: "ok" | "err" }[]>([]);
  const [confirm, setConfirm]   = useState<null | {
    titulo: string; descripcion?: string;
    tipo?: "default" | "warning" | "danger";
    textoConfirmar?: string; onConfirmar: () => void;
  }>(null);
  const [limpiarPaso, setLimpiarPaso] = useState<0 | 1 | 2>(0);
  const [limpiando, setLimpiando]     = useState(false);

  const ordenesConocidasRef = useRef<Set<number> | null>(null);
  const primerCargaRef      = useRef(true);

  const toast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  const cargarOrdenes = useCallback(async () => {
    try {
      const res = await api.get("/cocina", {
        params: { _t: Date.now() },
        headers: { "Cache-Control": "no-cache" },
      });
      const nuevasOrdenes: OrdenCocina[] = res.data;
      const idsNuevos = new Set(nuevasOrdenes.map(o => o.orden_id));

      if (primerCargaRef.current) {
        ordenesConocidasRef.current = idsNuevos;
        primerCargaRef.current = false;
      } else if (ordenesConocidasRef.current) {
        idsNuevos.forEach(id => {
          if (!ordenesConocidasRef.current!.has(id)) {
            const items = nuevasOrdenes.filter(o => o.orden_id === id);
            const mesa = items[0]?.mesa ?? "?";
            const productos = items.map(o => `${o.cantidad}× ${o.producto}`);
            notificarNuevaOrden(mesa, productos);
            toast(`Nueva orden — Mesa ${mesa}`, "ok");
            ordenesConocidasRef.current!.add(id);
          }
        });
        ordenesConocidasRef.current.forEach(id => {
          if (!idsNuevos.has(id)) ordenesConocidasRef.current!.delete(id);
        });
      }
      setOrdenes(nuevasOrdenes);
    } catch (err) {
      console.error("Error cargando cocina:", err);
    }
  }, [toast]);

  async function cambiarEstado(item: OrdenCocina, mesa: string) {
    const sig = SIGUIENTE[item.estado];
    if (!sig) return;
    setConfirm({
      titulo: sig.label,
      descripcion: `${item.cantidad} × ${item.producto} — Mesa ${mesa}`,
      tipo: sig.tipo,
      textoConfirmar: "Confirmar",
      onConfirmar: async () => {
        setConfirm(null);
        await api.post(`/detalle-orden/${item.id}/estado`, null, {
          params: { estado: sig.estado },
        });
        toast(`${item.producto} → ${sig.estado}`);
        cargarOrdenes();
      },
    });
  }

  async function ejecutarLimpieza() {
    try {
      setLimpiando(true);
      const pendientes = ordenes.filter(o => o.estado !== "ENTREGADO");
      await Promise.all(
        pendientes.map(o =>
          api.post(`/detalle-orden/${o.id}/estado`, null, {
            params: { estado: "ENTREGADO" },
          })
        )
      );
      await cargarOrdenes();
      toast(`Cocina limpiada — ${pendientes.length} ítems cerrados`, "ok");
    } catch {
      toast("Error al limpiar la cocina", "err");
    } finally {
      setLimpiando(false);
      setLimpiarPaso(0);
    }
  }

  function handleLimpiarClick() {
    if (limpiarPaso === 0) {
      setLimpiarPaso(1);
    } else if (limpiarPaso === 1) {
      setLimpiarPaso(2);
      setConfirm({
        titulo: "Limpiar cocina",
        descripcion: `Esto marcará las ${ordenes.filter(o => o.estado !== "ENTREGADO").length} órdenes activas como entregadas. Esta acción no se puede deshacer.`,
        tipo: "danger",
        textoConfirmar: "Sí, limpiar todo",
        onConfirmar: () => { setConfirm(null); ejecutarLimpieza(); },
      });
    }
  }

  useWebSocket(["orden_nueva", "orden_actualizada"], cargarOrdenes);

  useEffect(() => {
    pedirPermisoNotificaciones();
    cargarOrdenes();
  }, [cargarOrdenes]);

  useEffect(() => {
    if (limpiarPaso === 1) {
      const t = setTimeout(() => setLimpiarPaso(0), 4000);
      return () => clearTimeout(t);
    }
  }, [limpiarPaso]);

  const ordenesAgrupadas = ordenes.reduce(
    (acc: Record<number, OrdenAgrupada>, item) => {
      if (!acc[item.orden_id]) {
        acc[item.orden_id] = { mesa: item.mesa, fecha: item.fecha, productos: [] };
      }
      acc[item.orden_id].productos.push(item);
      return acc;
    },
    {}
  );

  const totalOrdenes = Object.keys(ordenesAgrupadas).length;
  const totalPlatos  = ordenes.reduce((acc, o) => acc + o.cantidad, 0);
  const listos       = ordenes.filter(o => o.estado === "LISTO").length;
  const enPrep       = ordenes.filter(o => o.estado === "PREPARACION").length;
  const hayActivos   = ordenes.filter(o => o.estado !== "ENTREGADO").length > 0;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "100vh", overflow: "hidden",
      background: C.bg,
      fontFamily: "'Inter', system-ui, sans-serif",
      color: C.text,
    }}>

      {/* ── HEADER ── */}
      <div style={{
        flexShrink: 0,
        padding: "18px 24px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        background: C.card,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {/* Título */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: C.greenLt, border: `1px solid ${C.greenMid}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.green, flexShrink: 0,
          }}>
            <ChefHat size={18} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.slate, letterSpacing: "-0.3px" }}>
              Cocina
            </h1>
            <p style={{ margin: "1px 0 0", fontSize: 11, color: C.muted }}>
              Actualización automática en tiempo real
            </p>
          </div>
        </div>

        {/* Stats + botón limpiar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {[
            { label: "Activas",      value: totalOrdenes, icon: <Package size={13} />,    color: C.green,  bg: C.greenLt,  border: C.greenB  },
            { label: "Preparación",  value: enPrep,       icon: <Flame size={13} />,      color: C.red,    bg: C.redLt,    border: C.redMid  },
            { label: "Listos",       value: listos,       icon: <CheckCircle2 size={13} />,color: C.green,  bg: C.greenLt,  border: C.greenB  },
            { label: "Platos",       value: totalPlatos,  icon: <UtensilsCrossed size={13} />, color: C.blue, bg: C.blueLt, border: C.blueB },
          ].map(s => (
            <div key={s.label} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: 10, padding: "8px 14px", minWidth: 68,
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: s.color, marginBottom: 3 }}>
                {s.icon}
                <span style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{s.value}</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: s.color, opacity: 0.7, letterSpacing: "0.04em" }}>
                {s.label}
              </div>
            </div>
          ))}

          {/* Separador */}
          <div style={{ width: 1, height: 36, background: C.border, margin: "0 2px" }} />

          {/* Botón limpiar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <button
              onClick={handleLimpiarClick}
              disabled={limpiando || !hayActivos}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 9,
                border: `1px solid ${limpiarPaso === 1 ? C.redMid : C.border}`,
                background: limpiarPaso === 1 ? C.redLt : C.card,
                color: limpiarPaso === 1 ? C.red : C.muted,
                fontWeight: 700, fontSize: 12,
                cursor: limpiando || !hayActivos ? "not-allowed" : "pointer",
                opacity: !hayActivos ? 0.4 : 1,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {limpiarPaso === 1
                ? <><AlertTriangle size={13} /> ¿Confirmar limpieza?</>
                : <><Brush size={13} /> Limpiar cocina</>}
            </button>
            {limpiarPaso === 1 && (
              <span style={{ fontSize: 10, color: C.red, fontWeight: 600 }}>
                Click de nuevo para continuar
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 28px" }}>

        {/* Empty state */}
        {totalOrdenes === 0 && (
          <div style={{
            background: C.card, borderRadius: 14,
            border: `1px solid ${C.border}`,
            padding: "72px 20px",
            textAlign: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <Snowflake size={44} color={C.dimB} strokeWidth={1.5} />
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.muted }}>
              No hay órdenes pendientes
            </p>
            <p style={{ margin: 0, fontSize: 13, color: C.dim }}>
              La cocina está al día
            </p>
          </div>
        )}

        {/* Grid de órdenes */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
          gap: 14,
        }}>
          {Object.entries(ordenesAgrupadas).map(([ordenId, orden]) => {
            const todosListos = orden.productos.every(
              p => p.estado === "LISTO" || p.estado === "ENTREGADO"
            );
            const hayPrep = orden.productos.some(p => p.estado === "PREPARACION");

            // Color del borde de la card según estado dominante
            const cardBorder = todosListos ? C.greenB : hayPrep ? C.redMid : C.border;

            return (
              <div key={ordenId} style={{
                background: C.card,
                borderRadius: 13,
                border: `1.5px solid ${cardBorder}`,
                overflow: "hidden",
                display: "flex", flexDirection: "column",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                transition: "border-color 0.2s",
              }}>

                {/* Card header */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 16px",
                  background: todosListos ? C.green : C.slate,
                  color: "white",
                }}>
                  <div>
                    <div style={{
                      fontSize: 10, opacity: 0.5, fontWeight: 700,
                      letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3,
                    }}>
                      Orden #{ordenId}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 17, fontWeight: 800 }}>
                      <UtensilsCrossed size={15} style={{ opacity: 0.7 }} />
                      Mesa {orden.mesa}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 12, opacity: 0.65, fontWeight: 600, marginBottom: 5,
                    }}>
                      <Clock size={11} />
                      {new Date(orden.fecha).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11, fontWeight: 700,
                      background: todosListos ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      padding: "3px 9px", borderRadius: 6,
                    }}>
                      {todosListos
                        ? <><CheckCircle2 size={11} /> Listo</>
                        : <><Package size={11} /> {orden.productos.length} ítems</>}
                    </div>
                  </div>
                </div>

                {/* Productos */}
                <div style={{
                  padding: 12,
                  display: "flex", flexDirection: "column", gap: 8,
                  flex: 1,
                }}>
                  {orden.productos.map((item) => {
                    const info = ESTADOS[item.estado] ?? ESTADOS.PENDIENTE;
                    const sig  = SIGUIENTE[item.estado];

                    return (
                      <div key={item.id} style={{
                        background: info.bg,
                        border: `1px solid ${info.border}`,
                        borderRadius: 10,
                        padding: 12,
                      }}>
                        {/* Producto + badge estado */}
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center", gap: 10,
                        }}>
                          <strong style={{ fontSize: 14, color: C.slate, fontWeight: 700 }}>
                            {item.cantidad} × {item.producto}
                          </strong>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            background: info.bg, color: info.color,
                            border: `1px solid ${info.border}`,
                            padding: "3px 9px", borderRadius: 6,
                            fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                          }}>
                            {info.icon} {info.label}
                          </span>
                        </div>

                        {/* Observación */}
                        {item.observacion && (
                          <div style={{
                            display: "flex", alignItems: "flex-start", gap: 6,
                            marginTop: 8, padding: "7px 10px",
                            background: C.amberLt, border: `1px solid ${C.amberMid}`,
                            borderRadius: 7, fontSize: 12, color: C.amber,
                          }}>
                            <FileText size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                            {item.observacion}
                          </div>
                        )}

                        {/* Botón avanzar estado */}
                        {sig && (
                          <button
                            onClick={() => cambiarEstado(item, orden.mesa)}
                            style={{
                              marginTop: 10, width: "100%",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                              padding: "8px 0", borderRadius: 8,
                              border: `1px solid ${info.border}`,
                              background: C.card,
                              color: info.color,
                              fontWeight: 700, fontSize: 12,
                              cursor: "pointer",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = info.bg)}
                            onMouseLeave={e => (e.currentTarget.style.background = C.card)}
                          >
                            {sig.icon} {sig.label}
                            <ChevronRight size={13} style={{ opacity: 0.5 }} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TOASTS ── */}
      <div style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", gap: 8,
        zIndex: 200, alignItems: "center",
        pointerEvents: "none",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px", borderRadius: 99,
            fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
            background: t.type === "ok" ? C.greenLt : C.amberLt,
            border: `1px solid ${t.type === "ok" ? C.greenB : C.amberB}`,
            color: t.type === "ok" ? C.green : C.amber,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}>
            {t.type === "ok"
              ? <Bell size={13} />
              : <AlertTriangle size={13} />}
            {t.msg}
          </div>
        ))}
      </div>

      {/* ── Modal confirmación ── */}
      {confirm && (
        <ConfirmModal
          {...confirm}
          onCancelar={() => { setConfirm(null); setLimpiarPaso(0); }}
        />
      )}
    </div>
  );
}