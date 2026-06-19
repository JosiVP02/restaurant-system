import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";

import { useWebSocket } from "../hooks/useWebSocket";

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

const ESTADOS: Record<string, { color: string; bg: string; icon: string; border: string }> = {
  PENDIENTE:   { color: "#92400e", bg: "#fffbeb", icon: "⏳", border: "#fde68a" },
  PREPARACION: { color: "#9a3412", bg: "#fff7ed", icon: "🔥", border: "#fed7aa" },
  LISTO:       { color: "#14532d", bg: "#f0fdf4", icon: "✅", border: "#bbf7d0" },
  ENTREGADO:   { color: "#334155", bg: "#f8fafc", icon: "🍽️", border: "#e2e8f0" },
};

const SIGUIENTE: Record<string, { estado: string; label: string; tipo: "default" | "warning" | "danger" }> = {
  PENDIENTE:   { estado: "PREPARACION", label: "Iniciar preparación", tipo: "warning" },
  PREPARACION: { estado: "LISTO",       label: "Marcar como listo",   tipo: "default" },
  LISTO:       { estado: "ENTREGADO",   label: "Confirmar entrega",   tipo: "default" },
};

function pedirPermisoNotificaciones() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function notificarNuevaOrden(mesa: string, productos: string[]) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(`🍽️ Nueva orden — Mesa ${mesa}`, {
      body: productos.join(", "),
      icon: "/favicon.ico",
      tag: `orden-${mesa}-${Date.now()}`,
    });
  }
}

function reproducirSonido() {
  try {
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 880;
    osc1.type = "sine";
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gain1.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = "sine";
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.3);
    gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.31);
    gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.55);
    osc2.start(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 0.55);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.frequency.value = 1320;
    osc3.type = "sine";
    gain3.gain.setValueAtTime(0, ctx.currentTime + 0.6);
    gain3.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.61);
    gain3.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
    osc3.start(ctx.currentTime + 0.6);
    osc3.stop(ctx.currentTime + 0.9);

  } catch (err) {
    console.warn("No se pudo reproducir sonido:", err);
  }
}

export default function Cocina() {
  const [ordenes, setOrdenes] = useState<OrdenCocina[]>([]);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: "ok" | "err" }[]>([]);
  const [confirm, setConfirm] = useState<null | {
    titulo: string;
    descripcion?: string;
    tipo?: "default" | "warning" | "danger";
    textoConfirmar?: string;
    onConfirmar: () => void;
  }>(null);

  const ordenesConocidasRef = useRef<Set<number> | null>(null);
  const primerCargaRef = useRef(true);

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
        ordenesConocidasRef.current = new Set(idsNuevos);
        primerCargaRef.current = false;
      } else if (ordenesConocidasRef.current) {
        idsNuevos.forEach(id => {
          if (!ordenesConocidasRef.current!.has(id)) {
            const items = nuevasOrdenes.filter(o => o.orden_id === id);
            const mesa = items[0]?.mesa ?? "?";
            const productos = items.map(o => `${o.cantidad}× ${o.producto}`);
            notificarNuevaOrden(mesa, productos);
            reproducirSonido();
            toast(`🔔 Nueva orden — Mesa ${mesa}`, "ok");
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

useWebSocket(["orden_nueva", "orden_actualizada"], cargarOrdenes);

useEffect(() => {
  pedirPermisoNotificaciones();
  cargarOrdenes();
}, [cargarOrdenes]);


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
  const totalPlatos = ordenes.reduce((acc, o) => acc + o.cantidad, 0);
  const listos = ordenes.filter(o => o.estado === "LISTO").length;
  const enPrep = ordenes.filter(o => o.estado === "PREPARACION").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#f1f5f3" }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, padding: "20px 32px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f1f1a", display: "flex", alignItems: "center", gap: 10 }}>
            👨‍🍳 Cocina
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
            Tiempo real vía WebSocket
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "Órdenes activas", value: totalOrdenes, color: "#1e3a2f", bg: "#dcfce7", border: "#bbf7d0" },
            { label: "En preparación",  value: enPrep,       color: "#9a3412", bg: "#fff7ed", border: "#fed7aa" },
            { label: "Listos",          value: listos,       color: "#14532d", bg: "#f0fdf4", border: "#86efac" },
            { label: "Total platos",    value: totalPlatos,  color: "#1e3a5f", bg: "#eff6ff", border: "#bfdbfe" },
          ].map(s => (
            <div key={s.label} style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: 12,
              padding: "10px 18px",
              textAlign: "center",
              minWidth: 80,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: s.color, opacity: 0.7, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 32px 28px" }}>

        {/* EMPTY */}
        {totalOrdenes === 0 && (
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: "80px 20px",
            textAlign: "center",
            color: "#94a3b8",
            border: "1px solid #e2e8f0",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧊</div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No hay órdenes pendientes</p>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>La cocina está al día</p>
          </div>
        )}

        {/* GRID */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 20,
        }}>
          {Object.entries(ordenesAgrupadas).map(([ordenId, orden]) => {
            const todosListos = orden.productos.every(p => p.estado === "LISTO" || p.estado === "ENTREGADO");

            return (
              <div key={ordenId} style={{
                background: "white",
                borderRadius: 16,
                border: `1.5px solid ${todosListos ? "#bbf7d0" : "#e2e8f0"}`,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              }}>

                {/* CARD HEADER */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  background: todosListos
                    ? "linear-gradient(135deg, #14532d, #166534)"
                    : "linear-gradient(135deg, #16241f, #0f1f1a)",
                  color: "white",
                }}>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Orden #{ordenId}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>
                      Mesa {orden.mesa}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 600 }}>
                      {new Date(orden.fecha).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div style={{
                      marginTop: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      background: todosListos ? "#dcfce7" : "rgba(255,255,255,0.15)",
                      color: todosListos ? "#14532d" : "white",
                      padding: "2px 10px",
                      borderRadius: 99,
                    }}>
                      {todosListos ? "✅ Listo" : `${orden.productos.length} ítems`}
                    </div>
                  </div>
                </div>

                {/* PRODUCTOS */}
                <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  {orden.productos.map((item) => {
                    const info = ESTADOS[item.estado] ?? ESTADOS.PENDIENTE;
                    const sig = SIGUIENTE[item.estado];

                    return (
                      <div key={item.id} style={{
                        background: info.bg,
                        border: `1px solid ${info.border}`,
                        borderRadius: 12,
                        padding: 14,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <strong style={{ fontSize: 14, color: "#0f172a" }}>
                            {item.cantidad} × {item.producto}
                          </strong>
                          <span style={{
                            background: info.bg,
                            color: info.color,
                            border: `1px solid ${info.border}`,
                            padding: "3px 10px",
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}>
                            {info.icon} {item.estado}
                          </span>
                        </div>

                        {item.observacion && (
                          <p style={{
                            margin: "8px 0 0",
                            fontSize: 12,
                            color: "#92400e",
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            borderRadius: 8,
                            padding: "6px 10px",
                          }}>
                            📝 {item.observacion}
                          </p>
                        )}

                        {sig && (
                          <button
                            onClick={() => cambiarEstado(item, orden.mesa)}
                            style={{
                              marginTop: 12,
                              width: "100%",
                              padding: "9px 0",
                              borderRadius: 9,
                              border: `1px solid ${info.border}`,
                              background: "white",
                              color: info.color,
                              fontWeight: 700,
                              fontSize: 13,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                            }}
                          >
                            {ESTADOS[sig.estado].icon} {sig.label}
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

        {/* TOASTS */}
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", gap: 8, zIndex: 200, alignItems: "center",
        }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600,
              whiteSpace: "nowrap",
              background: t.type === "ok" ? "#f0fdf4" : "#fff7ed",
              border: `1px solid ${t.type === "ok" ? "#bbf7d0" : "#fed7aa"}`,
              color: t.type === "ok" ? "#15803d" : "#c2410c",
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
    </div>
  );
}