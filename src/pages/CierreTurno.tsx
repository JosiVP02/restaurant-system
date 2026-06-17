import { useState, useEffect  } from "react";
import { api } from "../services/api";
import { imprimirReporteCierre } from "./imprimirReporte";




// ── tipos ─────────────────────────────────────────────────────────────────────
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

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => `₡${Math.round(n).toLocaleString("es-CR")}`;
const fmtHora = (s: string | null) =>
  s ? new Date(s).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtFechaHora = (s: string) =>
  new Date(s + ":00").toLocaleString("es-CR", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const METODO_ICON: Record<string, string> = { Efectivo: "💵", Tarjeta: "💳", SINPE: "📱" };
const METODO_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  Efectivo: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  Tarjeta:  { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  SINPE:    { bg: "#faf5ff", color: "#7c3aed", border: "#ddd6fe" },
};




const hoy = () => {

  const fecha = new Date();

  const year = fecha.getFullYear();

  const month = String(
    fecha.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    fecha.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};




// ── Modal detalle de cuenta ───────────────────────────────────────────────────
function ModalDetalleCuenta({
  cuenta,
  onClose,
}: {
  cuenta: CuentaDetalle;
  onClose: () => void;
}) {
  const [items, setItems]       = useState<ItemCuenta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  // fetch al montar
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
        background: "rgba(15,31,26,0.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 20,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          fontFamily: "'Inter', system-ui, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* cabecera verde */}
        <div style={{
          background: "linear-gradient(135deg, #1e3a2f, #0f1f1a)",
          padding: "22px 26px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700,
                          letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Cuenta #{cuenta.id}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "white", marginTop: 4 }}>
              🍽️ {cuenta.mesa}
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                background: col.bg, color: col.color, border: `1px solid ${col.border}`,
              }}>
                {METODO_ICON[cuenta.metodo]} {cuenta.metodo}
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                {fmtHora(cuenta.fecha_cierre)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
              color: "white", borderRadius: 8, padding: "7px 14px",
              fontSize: 12, cursor: "pointer", fontWeight: 700,
            }}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* cuerpo */}
        <div style={{ padding: "20px 26px" }}>

          {/* lista de productos */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8",
                          letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              Productos consumidos
            </div>

            {loading && (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>
                Cargando…
              </div>
            )}

            {error && (
              <div style={{ padding: "12px 14px", background: "#fef2f2",
                            border: "1px solid #fecaca", borderRadius: 8,
                            color: "#dc2626", fontSize: 13 }}>
                ⚠️ {error}
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: 13 }}>
                Sin productos registrados
              </div>
            )}

            {!loading && items.length > 0 && (
              <div style={{
                maxHeight: 280,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}>
                {/* header tabla */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 56px 80px 80px",
                  padding: "6px 12px",
                  fontSize: 10, fontWeight: 700, color: "#94a3b8",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  <span>Producto</span>
                  <span style={{ textAlign: "center" }}>Cant.</span>
                  <span style={{ textAlign: "right" }}>P. Unit.</span>
                  <span style={{ textAlign: "right" }}>Total</span>
                </div>

                {items.map((item, i) => (
                  <div key={item.id} style={{
                    display: "grid", gridTemplateColumns: "1fr 56px 80px 80px",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: i % 2 === 0 ? "#f8fafc" : "white",
                    border: "1px solid #f1f5f9",
                  }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1f2937" }}>
                      {item.producto}
                    </span>
                    <span style={{
                      textAlign: "center", fontSize: 13, fontWeight: 800,
                      color: "white", background: "#475569", borderRadius: 6,
                      padding: "2px 0", margin: "0 6px",
                    }}>
                      {item.cantidad}
                    </span>
                    <span style={{ textAlign: "right", fontSize: 12.5, color: "#64748b" }}>
                      {fmt(item.precio_unitario)}
                    </span>
                    <span style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
                      {fmt(item.cantidad * item.precio_unitario)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* resumen financiero */}
          <div style={{
            borderTop: "1px solid #f1f5f9",
            paddingTop: 14,
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Subtotal</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{fmt(cuenta.subtotal)}</span>
            </div>
            {cuenta.servicio > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>Servicio (10%)</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#d97706" }}>{fmt(cuenta.servicio)}</span>
              </div>
            )}
            <div style={{
              display: "flex", justifyContent: "space-between",
              padding: "12px 16px", marginTop: 4,
              background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10,
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>Total cobrado</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>{fmt(cuenta.total)}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}




// ── componente principal ──────────────────────────────────────────────────────
export default function CierreTurno() {
  const [fecha, setFecha]               = useState(hoy());
  const [montoApertura, setMontoApertura] = useState("");
  const [resultado, setResultado]       = useState<ResultadoCierre | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [verCuentas, setVerCuentas]     = useState(false);
  const [verProductos, setVerProductos] = useState(false);
  const [cuentaModal, setCuentaModal]   = useState<CuentaDetalle | null>(null);

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
        params: {
          fecha,
          monto_apertura: Number(montoApertura) || 0,
        },
        
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
      padding: "28px 32px",
      fontFamily: "'Inter', system-ui, sans-serif",
      background: "#f1f5f3",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxSizing: "border-box",
    }}>

      {/* modal detalle cuenta */}
      {cuentaModal && (
        <ModalDetalleCuenta cuenta={cuentaModal} onClose={() => setCuentaModal(null)} />
      )}

      {/* HEADER */}
      <div style={{ marginBottom: 24, flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f1f1a",
                     display: "flex", alignItems: "center", gap: 10 }}>
          🏦 Cierre de Turno
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
          Seleccione la fecha del turno para ver el resumen completo
        </p>
      </div>

      {/* FORMULARIO */}
      <div style={{
        background: "white", borderRadius: 16, border: "1px solid #e2e8f0",
        padding: "24px 28px", marginBottom: 24,
        display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap",
        flexShrink: 0,
      }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155",
                          textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Fecha del turno
          </label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid #d1d5db",
                     fontSize: 14, fontWeight: 600, color: "#1f2937" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155",
                          textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Efectivo en caja al abrir (opcional)
          </label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%",
                           transform: "translateY(-50%)", color: "#94a3b8", fontWeight: 700 }}>₡</span>
            <input
              type="number"
              value={montoApertura}
              onChange={e => setMontoApertura(e.target.value)}
              placeholder="0"
              style={{ padding: "11px 14px 11px 28px", borderRadius: 10,
                       border: "1px solid #d1d5db", fontSize: 14, fontWeight: 600,
                       color: "#1f2937", width: 180 }}
            />
          </div>
        </div>

        <button
          onClick={calcular}
          disabled={loading}
          style={{
            background: loading ? "#94a3b8" : "linear-gradient(135deg, #0f1f1a, #16241f)",
            color: "white", border: "none", padding: "12px 28px",
            borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          {loading ? "Calculando…" : "📊 Ver Cierre"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div style={{ marginBottom: 20, padding: "14px 18px", background: "#fef2f2",
                      border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626",
                      fontWeight: 600, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* RESULTADO */}
      {resultado && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 20,
          flex: 1, minHeight: 0, overflowY: "auto",
          paddingBottom: 28,
        }}>

          {/* BANDA DE TURNO */}
          <div style={{
            background: "linear-gradient(135deg, #1e3a2f, #0f1f1a)",
            borderRadius: 16, padding: "20px 28px", color: "white",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12,
          }}>
            


            <div>
              <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 700,
                            letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Turno
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
                {fmtFechaHora(resultado.turno_inicio)} → {fmtFechaHora(resultado.turno_fin)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 700,
                            letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Total ventas
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>
                {fmt(resultado.total_ventas)}
              </div>
            </div>

            
          </div>

          {/* KPI CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
            {[
              { label: "Cuentas cobradas",   value: String(resultado.total_cuentas), icon: "🧾", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
              { label: "Ticket promedio",     value: fmt(resultado.ticket_promedio),  icon: "🎯", color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
              { label: "Subtotal (sin 10%)",  value: fmt(resultado.total_subtotal),   icon: "🧮", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
              { label: "Total servicio 10%",  value: fmt(resultado.total_servicio),   icon: "✂️", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
            ].map(k => (
              <div key={k.label} style={{ background: k.bg, border: `1px solid ${k.border}`,
                                          borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{k.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: 11.5, color: k.color, opacity: 0.7,
                              fontWeight: 600, marginTop: 3 }}>{k.label}</div>
              </div>
            ))}


            {resultado && (
            <button
                onClick={() => imprimirReporteCierre(resultado, nombreNegocio)}
                style={{
                background: "white",
                border: "1px solid #d1d5db",
                padding: "12px 22px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                color: "#0f1f1a",
                }}
            >
                🖨️ Imprimir / Guardar PDF
            </button>
            )}



          </div>

          {/* MÉTODOS DE PAGO + ARQUEO */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "white", borderRadius: 14, padding: "22px 24px",
                          border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 800, color: "#1f2937" }}>
                💳 Desglose por método
              </h3>
              {[
                { metodo: "Efectivo", monto: resultado.total_efectivo },
                { metodo: "Tarjeta",  monto: resultado.total_tarjeta },
                { metodo: "SINPE",    monto: resultado.total_sinpe },
              ].filter(m => m.monto > 0).map(m => {
                const col = METODO_COLOR[m.metodo] ?? METODO_COLOR.Efectivo;
                const pct = resultado.total_ventas
                  ? ((m.monto / resultado.total_ventas) * 100).toFixed(1)
                  : "0";
                return (
                  <div key={m.metodo} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: "#1f2937" }}>
                        {METODO_ICON[m.metodo]} {m.metodo}
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: col.color }}>
                        {fmt(m.monto)}{" "}
                        <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ background: "#f1f5f9", borderRadius: 99, height: 8 }}>
                      <div style={{
                        width: `${pct}%`, height: "100%",
                        background: col.color, borderRadius: 99, transition: "width 0.4s",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ARQUEO DE CAJA */}
            <div style={{ background: "white", borderRadius: 14, padding: "22px 24px",
                          border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 800, color: "#1f2937" }}>
                🧮 Arqueo de caja
              </h3>
              {resultado.monto_apertura === 0 ? (
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                  Ingrese el monto de apertura arriba para ver el arqueo completo.
                </p>
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
                      background: row.bold ? "#f0fdf4" : "#f8fafc",
                      border: row.bold ? "1px solid #bbf7d0" : "1px solid transparent",
                    }}>
                      <span style={{ fontSize: 13, color: "#475569" }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: row.bold ? 800 : 600,
                                     color: row.bold ? "#16a34a" : "#1f2937" }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                  <p style={{ margin: "10px 0 0", fontSize: 12, color: "#94a3b8" }}>
                    Al finalizar, cuente el efectivo físico y compare con la caja esperada.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* TOP PRODUCTOS — colapsable con scroll */}
          {resultado.top_productos.length > 0 && (
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0",
                          overflow: "hidden" }}>
              <button
                onClick={() => setVerProductos(v => !v)}
                style={{
                  width: "100%", padding: "16px 24px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "transparent", border: "none", cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 800, color: "#1f2937" }}>
                  🏆 Productos del turno ({resultado.top_productos.length})
                </span>
                <span style={{ fontSize: 18, color: "#94a3b8" }}>{verProductos ? "▲" : "▼"}</span>
              </button>

              {verProductos && (
                <div style={{
                  borderTop: "1px solid #f1f5f9",
                  maxHeight: 320,
                  overflowY: "auto",
                  padding: "10px 16px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}>
                  {resultado.top_productos.map((p, i) => (
                    <div key={p.nombre} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px",
                      background: i === 0 ? "#fffbeb" : "#f8fafc",
                      borderRadius: 10,
                      border: `1px solid ${i === 0 ? "#fde68a" : "#f1f5f9"}`,
                    }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 8, fontSize: 12, fontWeight: 800,
                        background: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#c2703e" : "#e2e8f0",
                        color: i < 3 ? "white" : "#64748b",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: "#1f2937" }}>
                        {p.nombre}
                      </span>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{p.cantidad} uds</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>
                        {fmt(p.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DETALLE CUENTAS — colapsable con botón ver por cuenta */}
          <div style={{
            background: "white", borderRadius: 14, border: "1px solid #e2e8f0",
            overflow: "hidden", display: "flex", flexDirection: "column",
            flex: verCuentas ? "1" : "0 0 auto", minHeight: 0,
          }}>
            <button
              onClick={() => setVerCuentas(v => !v)}
              style={{
                width: "100%", padding: "16px 24px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "transparent", border: "none", cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 800, color: "#1f2937" }}>
                🧾 Cuentas del turno ({resultado.total_cuentas})
              </span>
              <span style={{ fontSize: 18, color: "#94a3b8" }}>{verCuentas ? "▲" : "▼"}</span>
            </button>

            {verCuentas && (
              <div style={{
                borderTop: "1px solid #f1f5f9",
                flex: 1, minHeight: 0, overflowY: "auto",
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["#", "Mesa", "Hora cierre", "Método", "Subtotal", "Servicio", "Total", ""].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left",
                                             fontSize: 11, fontWeight: 700, color: "#64748b",
                                             textTransform: "uppercase", letterSpacing: "0.05em",
                                             borderBottom: "1px solid #e2e8f0" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.cuentas.map((c, i) => {
                      const col = METODO_COLOR[c.metodo] ?? METODO_COLOR.Efectivo;
                      return (
                        <tr key={c.id} style={{
                          borderTop: "1px solid #f1f5f9",
                          background: i % 2 === 0 ? "white" : "#fafafa",
                        }}>
                          <td style={{ padding: "10px 14px", fontSize: 12, color: "#94a3b8" }}>#{c.id}</td>
                          <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#1f2937" }}>
                            🍽️ {c.mesa}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 12.5, color: "#64748b" }}>
                            {fmtHora(c.fecha_cierre)}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ padding: "3px 9px", borderRadius: 99, fontSize: 11,
                                           fontWeight: 700, background: col.bg,
                                           color: col.color, border: `1px solid ${col.border}` }}>
                              {METODO_ICON[c.metodo] ?? "💰"} {c.metodo}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 13, color: "#475569" }}>
                            {fmt(c.subtotal)}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 13,
                                       color: c.servicio > 0 ? "#d97706" : "#94a3b8" }}>
                            {c.servicio > 0 ? fmt(c.servicio) : "—"}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 13,
                                       fontWeight: 800, color: "#16a34a" }}>
                            {fmt(c.total)}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <button
                              onClick={() => setCuentaModal(c)}
                              style={{
                                padding: "5px 12px",
                                borderRadius: 7,
                                border: "1px solid #e2e8f0",
                                background: "white",
                                color: "#475569",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Ver detalle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {/* FILA TOTAL */}
                    <tr style={{ background: "#f0fdf4", borderTop: "2px solid #bbf7d0" }}>
                      <td colSpan={4} style={{ padding: "12px 14px", fontSize: 13,
                                               fontWeight: 800, color: "#15803d" }}>
                        TOTAL DEL TURNO
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13,
                                   fontWeight: 800, color: "#15803d" }}>
                        {fmt(resultado.total_subtotal)}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 13,
                                   fontWeight: 800, color: "#d97706" }}>
                        {fmt(resultado.total_servicio)}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: 14,
                                   fontWeight: 800, color: "#16a34a" }}>
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