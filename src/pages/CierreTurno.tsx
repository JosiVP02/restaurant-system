import { useState, useEffect } from "react";
import { api } from "../services/api";
import { imprimirReporteCierre } from "./imprimirReporte";
import {
  Landmark, CalendarDays, TrendingUp, Users, Target,
  Calculator, Scissors, Wallet, CreditCard, Smartphone,
  Trophy, Receipt, UtensilsCrossed, Eye, Printer,
  ChevronUp, ChevronDown, AlertTriangle, X, Clock,
} from "lucide-react";

// ── tipos ─────────────────────────────────────────────────────
interface CuentaDetalle {
  id: number;
  mesa: string;
  fecha_cierre: string | null;
  metodo: string;
  subtotal: number;
  servicio: number;
  total: number;
}
interface ItemCuenta {
  id: number;
  producto: string;
  cantidad: number;
  precio_unitario: number;
}
interface TopProducto {
  nombre: string;
  cantidad: number;
  total: number;
}
interface ResultadoCierre {
  fecha: string;
  turno_inicio: string;
  turno_fin: string;
  total_ventas: number;
  total_subtotal: number;
  total_servicio: number;
  total_cuentas: number;
  ticket_promedio: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_sinpe: number;
  monto_apertura: number;
  caja_esperada: number;
  top_productos: TopProducto[];
  cuentas: CuentaDetalle[];
}

// ── helpers ───────────────────────────────────────────────────
const fmt = (n: number) => `₡${Math.round(n).toLocaleString("es-CR")}`;
const fmtHora = (s: string | null) =>
  s ? new Date(s).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtFechaHora = (s: string) =>
  new Date(s + ":00").toLocaleString("es-CR", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
const hoy = () => {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// ── Paleta (idéntica a Ventas/Productos) ─────────────────────
const C = {
  bg:        "#f4f6f8",
  card:      "#ffffff",
  cardB:     "#f9fafb",
  border:    "#e4e7ec",
  border2:   "#f0f2f5",
  green:     "#16873d",
  greenLt:   "#f0faf4",
  greenB:    "#a7d7b8",
  greenMid:  "#d1edd9",
  blue:      "#2f54a0",
  blueLt:    "#f0f4fb",
  blueMid:   "#d5dff4",
  blueB:     "#afc1e8",
  violet:    "#6040a0",
  violetLt:  "#f4f1fb",
  violetMid: "#ddd6f4",
  cyan:      "#0e7490",
  cyanLt:    "#ecfeff",
  cyanMid:   "#a5f3fc",
  amber:     "#a16207",
  amberLt:   "#fdf8ee",
  amberMid:  "#f5e8be",
  amberB:    "#e8c97a",
  red:       "#b91c1c",
  redLt:     "#fef2f2",
  redMid:    "#fecaca",
  slate:     "#111827",
  text:      "#1f2937",
  muted:     "#6b7280",
  dim:       "#9ca3af",
  dimB:      "#d1d5db",
};

// ── Métodos de pago ───────────────────────────────────────────
const METODO_ICON: Record<string, React.ReactNode> = {
  Efectivo: <Wallet   size={12} />,
  Tarjeta:  <CreditCard size={12} />,
  SINPE:    <Smartphone size={12} />,
};
const METODO_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  Efectivo: { bg: C.greenLt,  color: C.green,  border: C.greenB  },
  Tarjeta:  { bg: C.blueLt,   color: C.blue,   border: C.blueB   },
  SINPE:    { bg: C.violetLt, color: C.violet, border: C.violetMid },
};

// ── Modal detalle de cuenta ───────────────────────────────────
function ModalDetalleCuenta({
  cuenta,
  onClose,
}: {
  cuenta: CuentaDetalle;
  onClose: () => void;
}) {
  const [items, setItems]     = useState<ItemCuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useState(() => {
    api.get(`/cuentas/${cuenta.id}/detalle`)
      .then(r => setItems(r.data))
      .catch(() => setError("No se pudo cargar el detalle"))
      .finally(() => setLoading(false));
  });

  const col = METODO_COLOR[cuenta.metodo] ?? METODO_COLOR.Efectivo;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(17,24,39,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.card,
          borderRadius: 16,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          fontFamily: "'Inter', system-ui, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Cabecera — slate, consistente con Ventas y Productos */}
        <div style={{
          background: C.slate,
          padding: "18px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}>
          <div>
            <div style={{
              fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4,
            }}>
              Cuenta #{cuenta.id}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "white" }}>
              <UtensilsCrossed size={16} />
              <span style={{ fontSize: 18, fontWeight: 800 }}>{cuenta.mesa}</span>
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: col.bg, color: col.color, border: `1px solid ${col.border}`,
              }}>
                {METODO_ICON[cuenta.metodo]} {cuenta.metodo}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                <Clock size={11} /> {fmtHora(cuenta.fecha_cierre)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 30, height: 30,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 7, color: "rgba(255,255,255,0.6)", cursor: "pointer",
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Cuerpo */}
        <div style={{ padding: "20px 22px" }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: C.muted,
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10,
          }}>
            Productos consumidos
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>
              Cargando…
            </div>
          )}

          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 14px", background: C.redLt,
              border: `1px solid ${C.redMid}`, borderRadius: 8,
              color: C.red, fontSize: 13,
            }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontSize: 13 }}>
              Sin productos registrados
            </div>
          )}

          {!loading && items.length > 0 && (
            <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Header columnas */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 52px 80px 80px",
                padding: "6px 10px",
                fontSize: 10, fontWeight: 700, color: C.muted,
                textTransform: "uppercase", letterSpacing: "0.07em",
              }}>
                <span>Producto</span>
                <span style={{ textAlign: "center" }}>Cant.</span>
                <span style={{ textAlign: "right" }}>P. Unit.</span>
                <span style={{ textAlign: "right" }}>Total</span>
              </div>

              {items.map((item, i) => (
                <div key={item.id} style={{
                  display: "grid", gridTemplateColumns: "1fr 52px 80px 80px",
                  alignItems: "center",
                  padding: "10px 10px", borderRadius: 8,
                  background: i % 2 === 0 ? C.cardB : C.card,
                  border: `1px solid ${C.border2}`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.producto}</span>
                  <span style={{
                    textAlign: "center", fontSize: 12, fontWeight: 800,
                    color: "white", background: "#374151", borderRadius: 5,
                    padding: "2px 0", margin: "0 6px",
                  }}>
                    {item.cantidad}
                  </span>
                  <span style={{ textAlign: "right", fontSize: 12, color: C.muted }}>
                    {fmt(item.precio_unitario)}
                  </span>
                  <span style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: C.text }}>
                    {fmt(item.cantidad * item.precio_unitario)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Resumen financiero */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
              <span style={{ fontSize: 13, color: C.muted }}>Subtotal</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmt(cuenta.subtotal)}</span>
            </div>
            {cuenta.servicio > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
                <span style={{ fontSize: 13, color: C.muted }}>Servicio (10%)</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.amber }}>{fmt(cuenta.servicio)}</span>
              </div>
            )}
            <div style={{
              display: "flex", justifyContent: "space-between",
              padding: "12px 16px", marginTop: 4,
              background: C.greenLt, border: `1px solid ${C.greenMid}`, borderRadius: 10,
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Total cobrado</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{fmt(cuenta.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function CierreTurno() {
  const [fecha, setFecha]                 = useState(hoy());
  const [montoApertura, setMontoApertura] = useState("");
  const [resultado, setResultado]         = useState<ResultadoCierre | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [verCuentas, setVerCuentas]       = useState(false);
  const [verProductos, setVerProductos]   = useState(false);
  const [cuentaModal, setCuentaModal]     = useState<CuentaDetalle | null>(null);
  const [nombreNegocio, setNombreNegocio] = useState("Mi Restaurante");

  useEffect(() => {
    api.get("/configuracion").then(r => setNombreNegocio(r.data.nombre_negocio));
  }, []);

  async function calcular() {
    setLoading(true);
    setError("");
    setResultado(null);
    try {
      const r = await api.get("/cierre/calcular", {
        params: { fecha, monto_apertura: Number(montoApertura) || 0 },
      });
      if (r.data.error) { setError(r.data.error); return; }
      setResultado(r.data);
    } catch {
      setError("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  const cajaFinal = resultado
    ? resultado.monto_apertura + resultado.total_efectivo
    : 0;

  return (
    <div style={{
      padding: "20px 24px",
      fontFamily: "'Inter', system-ui, sans-serif",
      background: C.bg,
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxSizing: "border-box",
      color: C.text,
    }}>

      {/* Modal detalle cuenta */}
      {cuentaModal && (
        <ModalDetalleCuenta cuenta={cuentaModal} onClose={() => setCuentaModal(null)} />
      )}

      {/* ── HEADER ── */}
      <div style={{
        marginBottom: 18,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        paddingBottom: 16,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: C.greenLt, border: `1px solid ${C.greenMid}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.green, flexShrink: 0,
        }}>
          <Landmark size={18} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.slate, letterSpacing: "-0.3px" }}>
            Cierre de Turno
          </h1>
          <p style={{ margin: "1px 0 0", fontSize: 11, color: C.muted }}>
            Seleccioná la fecha del turno para ver el resumen completo
          </p>
        </div>
      </div>

      {/* ── FORMULARIO ── */}
      <div style={{
        background: C.card,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        padding: "18px 22px",
        marginBottom: 16,
        display: "flex",
        alignItems: "flex-end",
        gap: 14,
        flexWrap: "wrap",
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {/* Fecha */}
        <div>
          <label style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 10, fontWeight: 700, color: C.muted,
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7,
          }}>
            <CalendarDays size={11} /> Fecha del turno
          </label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            style={{
              padding: "9px 12px", borderRadius: 8,
              border: `1px solid ${C.border}`,
              fontSize: 13, fontWeight: 600, color: C.text,
              background: C.card, outline: "none",
            }}
          />
        </div>

        {/* Apertura */}
        <div>
          <label style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 10, fontWeight: 700, color: C.muted,
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7,
          }}>
            <Wallet size={11} /> Efectivo apertura (opcional)
          </label>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 11, top: "50%",
              transform: "translateY(-50%)", color: C.dim, fontWeight: 700, fontSize: 13,
              userSelect: "none",
            }}>₡</span>
            <input
              type="number"
              value={montoApertura}
              onChange={e => setMontoApertura(e.target.value)}
              placeholder="0"
              style={{
                padding: "9px 12px 9px 26px", borderRadius: 8,
                border: `1px solid ${C.border}`,
                fontSize: 13, fontWeight: 600, color: C.text,
                width: 180, outline: "none", background: C.card,
              }}
            />
          </div>
        </div>

        {/* Botón calcular */}
        <button
          onClick={calcular}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: loading ? C.dimB : C.slate,
            color: "white", border: "none",
            padding: "10px 22px", borderRadius: 9,
            fontWeight: 800, fontSize: 13, cursor: loading ? "default" : "pointer",
            letterSpacing: "0.01em",
            boxShadow: loading ? "none" : "0 2px 8px rgba(0,0,0,0.15)",
            transition: "all 0.15s",
          }}
        >
          <TrendingUp size={14} />
          {loading ? "Calculando…" : "Ver cierre"}
        </button>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div style={{
          marginBottom: 14,
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 16px",
          background: C.redLt, border: `1px solid ${C.redMid}`,
          borderRadius: 10, color: C.red, fontWeight: 600, fontSize: 13,
          flexShrink: 0,
        }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* ── RESULTADO ── */}
      {resultado && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 14,
          flex: 1, minHeight: 0, overflowY: "auto",
          paddingBottom: 28,
        }}>

          {/* Banda de turno */}
          <div style={{
            background: C.slate,
            borderRadius: 12,
            padding: "18px 24px",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}>
            <div>
              <div style={{
                fontSize: 10, opacity: 0.45, fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4,
              }}>
                Turno
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={14} style={{ opacity: 0.6 }} />
                {fmtFechaHora(resultado.turno_inicio)} → {fmtFechaHora(resultado.turno_fin)}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Total ventas */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, opacity: 0.45, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                  Total ventas
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {fmt(resultado.total_ventas)}
                </div>
              </div>

              {/* Botón imprimir — aquí tiene contexto, no en el grid de KPIs */}
              <button
                onClick={() => imprimirReporteCierre(resultado, nombreNegocio)}
                title="Imprimir / Guardar PDF"
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "9px 16px", borderRadius: 8,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <Printer size={14} /> Imprimir
              </button>
            </div>
          </div>

          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {[
              {
                label: "Cuentas cobradas",
                value: String(resultado.total_cuentas),
                icon: <Users size={16} />,
                color: C.blue, bg: C.blueLt, border: C.blueB,
              },
              {
                label: "Ticket promedio",
                value: fmt(resultado.ticket_promedio),
                icon: <Target size={16} />,
                color: C.violet, bg: C.violetLt, border: C.violetMid,
              },
              {
                label: "Subtotal (sin 10%)",
                value: fmt(resultado.total_subtotal),
                icon: <Calculator size={16} />,
                color: C.cyan, bg: C.cyanLt, border: C.cyanMid,
              },
              {
                label: "Servicio (10%)",
                value: fmt(resultado.total_servicio),
                icon: <Scissors size={16} />,
                color: C.amber, bg: C.amberLt, border: C.amberB,
              },
            ].map(k => (
              <div key={k.label} style={{
                background: k.bg,
                border: `1px solid ${k.border}`,
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <div style={{ padding: "14px 16px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <span style={{ color: k.color, opacity: 0.7 }}>{k.icon}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: k.color,
                      textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.8,
                    }}>{k.label}</span>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: k.color, letterSpacing: "-0.3px", lineHeight: 1 }}>
                    {k.value}
                  </div>
                </div>
                <div style={{ height: 2, background: k.color, opacity: 0.2 }} />
              </div>
            ))}
          </div>

          {/* Métodos de pago + Arqueo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

            {/* Desglose por método */}
            <div style={{
              background: C.card, borderRadius: 12,
              border: `1px solid ${C.border}`,
              padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 16,
              }}>
                <CreditCard size={15} color={C.muted} /> Desglose por método
              </div>

              {[
                { metodo: "Efectivo", monto: resultado.total_efectivo },
                { metodo: "Tarjeta",  monto: resultado.total_tarjeta  },
                { metodo: "SINPE",    monto: resultado.total_sinpe    },
              ].filter(m => m.monto > 0).map(m => {
                const col = METODO_COLOR[m.metodo] ?? METODO_COLOR.Efectivo;
                const pct = resultado.total_ventas
                  ? ((m.monto / resultado.total_ventas) * 100).toFixed(1)
                  : "0";
                return (
                  <div key={m.metodo} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{
                        display: "flex", alignItems: "center", gap: 6,
                        fontSize: 13, fontWeight: 700, color: C.text,
                      }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "2px 8px", borderRadius: 5,
                          background: col.bg, color: col.color,
                          border: `1px solid ${col.border}`,
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {METODO_ICON[m.metodo]} {m.metodo}
                        </span>
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: col.color }}>
                        {fmt(m.monto)}{" "}
                        <span style={{ fontSize: 11, fontWeight: 400, color: C.dim }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ background: C.border, borderRadius: 99, height: 6 }}>
                      <div style={{
                        width: `${pct}%`, height: "100%",
                        background: col.color, borderRadius: 99, transition: "width 0.4s",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Arqueo de caja */}
            <div style={{
              background: C.card, borderRadius: 12,
              border: `1px solid ${C.border}`,
              padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 16,
              }}>
                <Calculator size={15} color={C.muted} /> Arqueo de caja
              </div>

              {resultado.monto_apertura === 0 ? (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 8, padding: "16px 0", color: C.muted, textAlign: "center",
                }}>
                  <Wallet size={28} color={C.dimB} />
                  <p style={{ margin: 0, fontSize: 13 }}>
                    Ingresá el monto de apertura arriba para ver el arqueo completo.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { label: "Efectivo apertura",        value: fmt(resultado.monto_apertura), bold: false },
                    { label: "+ Ventas en efectivo",      value: fmt(resultado.total_efectivo), bold: false },
                    { label: "= Caja esperada al cierre", value: fmt(cajaFinal),                bold: true  },
                  ].map(row => (
                    <div key={row.label} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "9px 12px", borderRadius: 8,
                      background: row.bold ? C.greenLt : C.bg,
                      border: `1px solid ${row.bold ? C.greenMid : C.border2}`,
                    }}>
                      <span style={{ fontSize: 13, color: C.muted }}>{row.label}</span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: row.bold ? 800 : 600,
                        color: row.bold ? C.green : C.text,
                      }}>{row.value}</span>
                    </div>
                  ))}
                  <p style={{ margin: "8px 0 0", fontSize: 11, color: C.dim }}>
                    Al finalizar, contá el efectivo físico y comparalo con la caja esperada.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Top productos — colapsable */}
          {resultado.top_productos.length > 0 && (
            <div style={{
              background: C.card, borderRadius: 12,
              border: `1px solid ${C.border}`,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <button
                onClick={() => setVerProductos(v => !v)}
                style={{
                  width: "100%", padding: "14px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "transparent", border: "none", cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 800, color: C.text }}>
                  <Trophy size={15} color={C.amber} />
                  Productos del turno
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: C.muted,
                    background: C.bg, border: `1px solid ${C.border}`,
                    padding: "1px 8px", borderRadius: 99,
                  }}>{resultado.top_productos.length}</span>
                </span>
                {verProductos
                  ? <ChevronUp size={16} color={C.muted} />
                  : <ChevronDown size={16} color={C.muted} />}
              </button>

              {verProductos && (
                <div style={{
                  borderTop: `1px solid ${C.border2}`,
                  maxHeight: 320, overflowY: "auto",
                  padding: "10px 16px 16px",
                  display: "flex", flexDirection: "column", gap: 6,
                }}>
                  {resultado.top_productos.map((p, i) => {
                    const max = resultado.top_productos[0]?.total ?? 1;
                    const medalBg  = i === 0 ? "#ca8a04" : i === 1 ? "#9ca3af" : i === 2 ? "#b45309" : C.border;
                    const medalTxt = i < 3 ? "#fff" : C.muted;
                    return (
                      <div key={p.nombre} style={{
                        display: "grid",
                        gridTemplateColumns: "28px 1fr 64px 90px",
                        alignItems: "center", gap: 10,
                        padding: "9px 12px", borderRadius: 9,
                        background: i === 0 ? "#fefce8" : C.bg,
                        border: `1px solid ${i === 0 ? "#fde68a" : C.border}`,
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: medalBg,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 800, color: medalTxt, flexShrink: 0,
                        }}>{i + 1}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                            {p.nombre}
                          </div>
                          <div style={{ background: C.border, borderRadius: 99, height: 3 }}>
                            <div style={{
                              width: `${(p.total / max) * 100}%`, height: "100%",
                              borderRadius: 99,
                              background: i === 0 ? "#ca8a04" : C.green,
                              transition: "width 0.5s",
                            }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: C.muted, textAlign: "right" }}>{p.cantidad} uds</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: C.green, textAlign: "right" }}>{fmt(p.total)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Cuentas del turno — colapsable */}
          <div style={{
            background: C.card, borderRadius: 12,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex", flexDirection: "column",
            flex: verCuentas ? "1" : "0 0 auto", minHeight: 0,
          }}>
            <button
              onClick={() => setVerCuentas(v => !v)}
              style={{
                width: "100%", padding: "14px 20px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "transparent", border: "none", cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 800, color: C.text }}>
                <Receipt size={15} color={C.blue} />
                Cuentas del turno
                <span style={{
                  fontSize: 11, fontWeight: 700, color: C.muted,
                  background: C.bg, border: `1px solid ${C.border}`,
                  padding: "1px 8px", borderRadius: 99,
                }}>{resultado.total_cuentas}</span>
              </span>
              {verCuentas
                ? <ChevronUp size={16} color={C.muted} />
                : <ChevronDown size={16} color={C.muted} />}
            </button>

            {verCuentas && (
              <div style={{ borderTop: `1px solid ${C.border2}`, flex: 1, minHeight: 0, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                      {["#", "Mesa", "Hora cierre", "Método", "Subtotal", "Servicio", "Total", ""].map(h => (
                        <th key={h} style={{
                          padding: "10px 14px", textAlign: "left",
                          fontSize: 10, fontWeight: 700, color: C.muted,
                          textTransform: "uppercase", letterSpacing: "0.08em",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.cuentas.map((c, i) => {
                      const col = METODO_COLOR[c.metodo] ?? METODO_COLOR.Efectivo;
                      return (
                        <tr
                          key={c.id}
                          style={{
                            borderTop: `1px solid ${C.border2}`,
                            background: "transparent",
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = C.greenLt)}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "10px 14px", fontSize: 11, color: C.dim, fontFamily: "monospace" }}>
                            #{c.id}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <UtensilsCrossed size={12} color={C.muted} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.mesa}</span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}>
                              <Clock size={11} /> {fmtHora(c.fecha_cierre)}
                            </div>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              padding: "3px 9px", borderRadius: 6,
                              fontSize: 11, fontWeight: 700,
                              background: col.bg, color: col.color,
                              border: `1px solid ${col.border}`,
                            }}>
                              {METODO_ICON[c.metodo]} {c.metodo}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: C.muted }}>
                            {fmt(c.subtotal)}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: c.servicio > 0 ? C.amber : C.dimB }}>
                            {c.servicio > 0 ? fmt(c.servicio) : "—"}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 800, color: C.green }}>
                            {fmt(c.total)}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <button
                              onClick={() => setCuentaModal(c)}
                              style={{
                                display: "flex", alignItems: "center", gap: 5,
                                padding: "5px 10px", borderRadius: 7,
                                border: `1px solid ${C.border}`,
                                background: C.bg, color: C.slate,
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Eye size={12} /> Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Fila total */}
                    <tr style={{ background: C.greenLt, borderTop: `2px solid ${C.greenMid}` }}>
                      <td colSpan={4} style={{ padding: "12px 14px", fontSize: 12, fontWeight: 800, color: C.green }}>
                        TOTAL DEL TURNO
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 800, color: C.green }}>
                        {fmt(resultado.total_subtotal)}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 12, fontWeight: 800, color: C.amber }}>
                        {fmt(resultado.total_servicio)}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 14, fontWeight: 900, color: C.green }}>
                        {fmt(resultado.total_ventas)}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}