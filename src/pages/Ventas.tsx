import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { generarFacturaPDF } from "../utils/factura";
import { usePrinter } from "../hooks/usePrinter";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  BarChart3, TrendingUp, Users, Receipt, CreditCard, Wallet,
  Smartphone, Eye, Download, Printer, CheckCircle2, AlertTriangle,
  X, UtensilsCrossed, Clock, Calendar, Award, ChevronFirst,
  ChevronLast, ChevronLeft, ChevronRight,
} from "lucide-react";

interface MetodoPago  { metodo: string; monto: number; subtotal?: number; servicio?: number }
interface TopProducto { nombre: string; cantidad: number; total: number }
interface VentaHora   { hora: string;  monto: number }
interface VentaDia    { dia: string;   monto: number }
interface Resumen {
  total_ventas: number; total_subtotal: number; total_servicio: number;
  total_cuentas: number; ticket_promedio: number;
  metodos_pago: MetodoPago[]; top_productos: TopProducto[];
  ventas_por_hora: VentaHora[]; ventas_por_dia: VentaDia[];
  fecha_inicio: string; fecha_fin: string;
}
interface CuentaRow {
  id: number; mesa: string;
  fecha_apertura: string | null; fecha_cierre: string | null;
  metodo: string; subtotal: number; servicio: number; total: number;
}

const fmt   = (n: number) => `₡${Math.round(n).toLocaleString("es-CR")}`;
const fmtK  = (n: number) => n >= 1000000 ? `₡${(n/1000000).toFixed(1)}M` : n >= 1000 ? `₡${(n/1000).toFixed(0)}k` : fmt(n);
const pct   = (v: number, t: number) => t ? ((v/t)*100).toFixed(1)+"%" : "0%";
const hoy = () => {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const hace = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  const year = x.getFullYear();
  const month = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const fmtDT = (iso: string|null) => !iso ? "—" : new Date(iso).toLocaleString("es-CR",{dateStyle:"short",timeStyle:"short"});

// ── Paleta sobria/corporativa ─────────────────────────────────
const C = {
  // Fondos
  bg:       "#f4f6f8",
  card:     "#ffffff",
  cardB:    "#f9fafb",
  border:   "#e4e7ec",
  border2:  "#f0f2f5",

  // Acento principal: verde oscuro (consistente con sidebar)
  green:    "#16873d",
  greenLt:  "#f0faf4",
  greenB:   "#a7d7b8",
  greenMid: "#d1edd9",

  // Azul pizarra
  blue:     "#2f54a0",
  blueLt:   "#f0f4fb",
  blueB:    "#afc1e8",
  blueMid:  "#d5dff4",

  // Violeta apagado
  violet:   "#6040a0",
  violetLt: "#f4f1fb",
  violetB:  "#c2b0e8",
  violetMid:"#ddd6f4",

  // Ámbar oscuro (menos saturado)
  amber:    "#a16207",
  amberLt:  "#fdf8ee",
  amberB:   "#e8c97a",
  amberMid: "#f5e8be",

  // Texto
  slate:    "#111827",
  text:     "#1f2937",
  muted:    "#6b7280",
  dim:      "#9ca3af",
  dimB:     "#d1d5db",
};

// Colores de gráficos (más apagados, mejor para datos)
const PIE  = ["#16873d", "#2f54a0", "#6040a0", "#a16207"];
const CHART_GREEN  = "#16873d";
const CHART_BLUE   = "#2f54a0";

const METODO_C: Record<string,string> = {
  Efectivo: C.green,
  Tarjeta:  C.blue,
  SINPE:    C.violet,
};
const METODO_ICON: Record<string, React.ReactNode> = {
  Efectivo: <Wallet   size={13} />,
  Tarjeta:  <CreditCard size={13} />,
  SINPE:    <Smartphone size={13} />,
};

// ── Tooltip recharts ─────────────────────────────────────────
function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#1f2937",
      border: "none",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    }}>
      <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#fff" }}>
          {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Panel base ───────────────────────────────────────────────
function Panel({ children, title, style }: { children: React.ReactNode; title?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      ...style,
    }}>
      {title && (
        <div style={{
          padding: "14px 18px 0 18px",
          borderBottom: `1px solid ${C.border2}`,
          paddingBottom: 12,
          marginBottom: 0,
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>{title}</span>
        </div>
      )}
      <div style={{ padding: title ? "16px 18px 18px" : "18px" }}>{children}</div>
    </div>
  );
}

// ── Detalle de cuenta (modal body) ───────────────────────────
function CuentaDetalleBody({ cuentaId, cuenta }: { cuentaId: number; cuenta: CuentaRow }) {
  const [items, setItems]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/cuentas/${cuentaId}/detalle`)
      .then(r => setItems(r.data))
      .finally(() => setLoading(false));
  }, [cuentaId]);

  const fmt = (n: number) => `₡${Math.round(n).toLocaleString("es-CR")}`;

  return (
    <div style={{ padding: "20px 24px" }}>
      {loading ? (
        <div style={{ textAlign: "center", padding: "28px 0", color: C.muted, fontSize: 13 }}>
          Cargando…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
          {/* Header columnas */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 52px 80px 80px",
            padding: "6px 10px",
            fontSize: 10,
            fontWeight: 700,
            color: C.muted,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}>
            <span>Producto</span>
            <span style={{ textAlign: "center" }}>Cant.</span>
            <span style={{ textAlign: "right" }}>P. Unit.</span>
            <span style={{ textAlign: "right" }}>Total</span>
          </div>

          {items.map((item, i) => (
            <div key={item.id} style={{
              display: "grid",
              gridTemplateColumns: "1fr 52px 80px 80px",
              alignItems: "center",
              padding: "10px 10px",
              borderRadius: 8,
              background: i % 2 === 0 ? C.cardB : "white",
              border: `1px solid ${C.border2}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.producto}</span>
              <span style={{
                textAlign: "center",
                fontSize: 12,
                fontWeight: 800,
                color: "white",
                background: "#374151",
                borderRadius: 5,
                padding: "2px 0",
                margin: "0 6px",
              }}>
                {item.cantidad}
              </span>
              <span style={{ textAlign: "right", fontSize: 12, color: C.muted }}>{fmt(item.precio_unitario)}</span>
              <span style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: C.text }}>
                {fmt(item.cantidad * item.precio_unitario)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{
        borderTop: `1px solid ${C.border}`,
        paddingTop: 14,
        marginTop: 14,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
          <span style={{ fontSize: 13, color: C.muted }}>Subtotal</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmt(cuenta.subtotal ?? 0)}</span>
        </div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: C.greenLt,
          border: `1px solid ${C.greenMid}`,
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Total cobrado</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{fmt(cuenta.total)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function Ventas() {
  const [fi, setFi]           = useState(hoy());
  const [ff, setFf]           = useState(hoy());
  const [preset, setPreset]   = useState<"hoy"|"semana"|"mes"|"custom">("hoy");
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cuentas, setCuentas] = useState<CuentaRow[]>([]);
  const [totalC, setTotalC]   = useState(0);
  const [pagina, setPagina]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState<"dashboard"|"cuentas">("dashboard");
  const [cuentaModal, setCuentaModal] = useState<CuentaRow | null>(null);
  const { imprimirPrecuenta } = usePrinter();
  const [mensajeImpresion, setMensajeImpresion] = useState<{ id: number; ok: boolean } | null>(null);

  async function handleImprimirCuenta(idCuenta: number) {
    try {
      const [cfgRes, detalleRes] = await Promise.all([
        api.get("/configuracion"),
        api.get(`/cuentas/${idCuenta}/detalle`),
      ]);
      const cfg   = cfgRes.data;
      const items = detalleRes.data;
      const sub   = items.reduce((a: number, i: any) => a + i.cantidad * i.precio_unitario, 0);
      await imprimirPrecuenta({
        negocio:     cfg.nombre_negocio || "POSKEY",
        direccion:   cfg.direccion      || "",
        telefono:    cfg.telefono       || "",
        num_factura: String(idCuenta).padStart(6, "0"),
        fecha:       new Date().toLocaleString("es-CR"),
        cajero:      "",
        cliente:     "Consumidor Final",
        lineas: items.map((i: any) => ({
          nombre:      i.producto,
          cantidad:    i.cantidad,
          precio_unit: i.precio_unitario,
          subtotal:    i.cantidad * i.precio_unitario,
        })),
        subtotal:    sub,
        impuesto:    0,
        total:       sub * 1.1,
        metodo_pago: "—",
      });
      setMensajeImpresion({ id: idCuenta, ok: true });
    } catch (e: any) {
      console.error("Error imprimiendo:", e);
      setMensajeImpresion({ id: idCuenta, ok: false });
    } finally {
      setTimeout(() => setMensajeImpresion(null), 3500);
    }
  }

  const cargar = useCallback(async (i: string, f: string, p = 1) => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        api.get("/reportes/resumen", { params: { fecha_inicio:i, fecha_fin:f } }),
        api.get("/reportes/cuentas", { params: { fecha_inicio:i, fecha_fin:f, pagina:p, por_pagina:25 } }),
      ]);
      setResumen(r1.data); setCuentas(r2.data.cuentas); setTotalC(r2.data.total);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  function applyPreset(p: typeof preset) {
    setPreset(p);
    const i = p==="semana" ? hace(6) : p==="mes" ? hace(29) : hoy();
    setFi(i); setFf(hoy()); setPagina(1); cargar(i, hoy(), 1);
  }
  function buscar() { setPreset("custom"); setPagina(1); cargar(fi, ff, 1); }
  function goPage(p: number) { setPagina(p); cargar(fi, ff, p); }

  useWebSocket(["mesas_actualizadas"], () => {
    if (preset === "hoy") cargar(fi, ff, pagina);
  });

  useEffect(() => { cargar(hoy(), hoy(), 1); }, []);

  const totalPages = Math.ceil(totalC / 25);
  const totalPagos = resumen?.metodos_pago.reduce((a,m) => a+m.monto, 0) ?? 0;
  const pieData    = resumen?.metodos_pago.map(m => ({ name:m.metodo, value:m.monto })) ?? [];
  const horaData   = resumen?.ventas_por_hora ?? [];
  const diaData    = resumen?.ventas_por_dia.map(v => ({ dia:v.dia.slice(5), monto:v.monto })) ?? [];

  // KPI cards config
  const kpiCards = resumen ? [
    {
      label:  "Ventas totales",
      value:  fmt(resumen.total_ventas),
      sub:    `Subtotal ${fmt(resumen.total_subtotal)}`,
      color:  C.green,
      bg:     C.greenLt,
      border: C.greenB,
      icon:   <TrendingUp size={18} />,
    },
    {
      label:  "Cargo por servicio",
      value:  fmt(resumen.total_servicio),
      sub:    `${resumen.total_ventas ? ((resumen.total_servicio/resumen.total_ventas)*100).toFixed(1) : 0}% del total`,
      color:  C.amber,
      bg:     C.amberLt,
      border: C.amberB,
      icon:   <Receipt size={18} />,
    },
    {
      label:  "Cuentas cobradas",
      value:  String(resumen.total_cuentas),
      sub:    "transacciones",
      color:  C.blue,
      bg:     C.blueLt,
      border: C.blueB,
      icon:   <Users size={18} />,
    },
    {
      label:  "Ticket promedio",
      value:  fmt(resumen.ticket_promedio),
      sub:    "por cuenta",
      color:  C.violet,
      bg:     C.violetLt,
      border: C.violetB,
      icon:   <Award size={18} />,
    },
  ] : [];

  return (
    <div style={{
      height: "100vh",
      overflowY: "auto",
      background: C.bg,
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      color: C.text,
    }}>
      <div style={{ padding: "20px 24px 60px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── HEADER ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          paddingBottom: 14,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: C.greenLt,
              border: `1px solid ${C.greenMid}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.green,
            }}>
              <BarChart3 size={18} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.slate, letterSpacing: "-0.3px" }}>
                Reportes de Ventas
              </h1>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: C.muted }}>
                {resumen
                  ? `${resumen.fecha_inicio}  →  ${resumen.fecha_fin}`
                  : "Seleccioná un período"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Presets */}
            <div style={{
              display: "flex",
              background: C.card,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              overflow: "hidden",
            }}>
              {(["hoy","semana","mes"] as const).map(p => (
                <button key={p} onClick={() => applyPreset(p)} style={{
                  padding: "6px 14px",
                  border: "none",
                  borderRight: `1px solid ${C.border}`,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  background: preset === p ? C.slate : "transparent",
                  color: preset === p ? "#fff" : C.muted,
                  transition: "all 0.15s",
                }}>
                  {p === "hoy" ? "Hoy" : p === "semana" ? "7 días" : "30 días"}
                </button>
              ))}
              <button onClick={() => applyPreset("hoy")} style={{
                padding: "6px 14px",
                border: "none",
                cursor: "default",
                background: "transparent",
                display: "none",
              }} />
            </div>

            {/* Rango custom */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: C.card,
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              padding: "5px 12px",
            }}>
              <Calendar size={12} color={C.muted} />
              <input
                type="date"
                value={fi}
                onChange={e => setFi(e.target.value)}
                style={{ background: "transparent", border: "none", color: C.text, fontSize: 12, outline: "none", cursor: "pointer" }}
              />
              <span style={{ color: C.dimB, fontSize: 11 }}>→</span>
              <input
                type="date"
                value={ff}
                onChange={e => setFf(e.target.value)}
                style={{ background: "transparent", border: "none", color: C.text, fontSize: 12, outline: "none", cursor: "pointer" }}
              />
            </div>

            <button onClick={buscar} style={{
              padding: "7px 18px",
              borderRadius: 8,
              border: "none",
              background: C.slate,
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}>
              Buscar
            </button>

            {loading && (
              <div style={{
                width: 14,
                height: 14,
                borderRadius: 99,
                border: `2px solid ${C.border}`,
                borderTopColor: C.green,
                animation: "spin 0.7s linear infinite",
              }} />
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{
          display: "flex",
          gap: 2,
          background: C.card,
          borderRadius: 9,
          border: `1px solid ${C.border}`,
          padding: 4,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          {(["dashboard","cuentas"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              padding: "8px 0",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              background: tab === t ? C.slate : "transparent",
              color: tab === t ? "#fff" : C.muted,
              transition: "all 0.15s",
            }}>
              {t === "dashboard"
                ? <><BarChart3 size={14} /> Resumen</>
                : <><Receipt size={14} /> Cuentas</>}
            </button>
          ))}
        </div>

        {/* ══ DASHBOARD ══ */}
        {tab === "dashboard" && resumen && (
          <>
            {/* KPI cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {kpiCards.map(k => (
                <div key={k.label} style={{
                  background: k.bg,
                  border: `1px solid ${k.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}>
                  <div style={{ padding: "16px 18px 14px" }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 12,
                    }}>
                      <div style={{ color: k.color, opacity: 0.7 }}>{k.icon}</div>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: k.color,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        opacity: 0.8,
                      }}>{k.label}</div>
                    </div>
                    <div style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: k.color,
                      letterSpacing: "-0.5px",
                      lineHeight: 1,
                    }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: k.color, opacity: 0.55, marginTop: 6 }}>{k.sub}</div>
                  </div>
                  <div style={{ height: 2, background: k.color, opacity: 0.25 }} />
                </div>
              ))}
            </div>

            {/* Área + donut */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 12 }}>
              <Panel title="Ventas por hora">
                {horaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={horaData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={CHART_GREEN} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={CHART_GREEN} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                      <XAxis dataKey="hora" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={60} />
                      <Tooltip content={<Tip />} />
                      <Area
                        type="monotone"
                        dataKey="monto"
                        stroke={CHART_GREEN}
                        strokeWidth={2}
                        fill="url(#gGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: CHART_GREEN, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: C.muted }}>
                    <Clock size={28} color={C.dimB} />
                    <span style={{ fontSize: 13 }}>Sin datos en este período</span>
                  </div>
                )}
              </Panel>

              <Panel title="Métodos de pago">
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          cx="50%" cy="50%"
                          innerRadius={44}
                          outerRadius={66}
                          paddingAngle={3}
                          startAngle={90}
                          endAngle={-270}
                        >
                          {pieData.map((_,i) => (
                            <Cell key={i} fill={PIE[i % PIE.length]} strokeWidth={0} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: any) => fmt(v)}
                          contentStyle={{
                            background: "#1f2937",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "#fff",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                      {resumen.metodos_pago.map((m, i) => (
                        <div key={m.metodo}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE[i % PIE.length] }} />
                              <span style={{ fontSize: 12, color: C.muted }}>{m.metodo}</span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{pct(m.monto, totalPagos)}</span>
                          </div>
                          <div style={{ background: C.border, borderRadius: 99, height: 4 }}>
                            <div style={{
                              width: pct(m.monto, totalPagos),
                              height: "100%",
                              borderRadius: 99,
                              background: PIE[i % PIE.length],
                              transition: "width 0.5s",
                            }} />
                          </div>
                          <div style={{ textAlign: "right", fontSize: 11, color: C.dim, marginTop: 2 }}>{fmt(m.monto)}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: C.muted }}>
                    <CreditCard size={28} color={C.dimB} />
                    <span style={{ fontSize: 13 }}>Sin ventas</span>
                  </div>
                )}
              </Panel>
            </div>

            {/* Top productos + barras por día */}
            <div style={{ display: "grid", gridTemplateColumns: diaData.length > 1 ? "1fr 1fr" : "1fr", gap: 12 }}>
              <Panel title="Productos más vendidos">
                {resumen.top_productos.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "20px 0", color: C.muted }}>
                    <UtensilsCrossed size={28} color={C.dimB} />
                    <p style={{ margin: 0, fontSize: 13 }}>Sin ventas en el período</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {resumen.top_productos.slice(0, 8).map((p, i) => {
                      const max = resumen.top_productos[0]?.total ?? 1;
                      // Medallas: oro, plata, bronce
                      const medalBg  = i === 0 ? "#ca8a04" : i === 1 ? "#9ca3af" : i === 2 ? "#b45309" : C.border;
                      const medalTxt = i < 3 ? "#fff" : C.muted;
                      const barColor = i === 0 ? "#ca8a04" : C.green;
                      return (
                        <div key={p.nombre} style={{
                          display: "grid",
                          gridTemplateColumns: "28px 1fr 64px 90px",
                          alignItems: "center",
                          gap: 10,
                          padding: "9px 12px",
                          borderRadius: 9,
                          background: i === 0 ? "#fefce8" : C.bg,
                          border: `1px solid ${i === 0 ? "#fde68a" : C.border}`,
                        }}>
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: medalBg,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 800,
                            color: medalTxt,
                            flexShrink: 0,
                          }}>{i + 1}</div>

                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 5 }}>{p.nombre}</div>
                            <div style={{ background: C.border, borderRadius: 99, height: 3 }}>
                              <div style={{
                                width: `${(p.total / max) * 100}%`,
                                height: "100%",
                                borderRadius: 99,
                                background: barColor,
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
              </Panel>

              {diaData.length > 1 && (
                <Panel title="Ventas por día">
                  <ResponsiveContainer width="100%" height={290}>
                    <BarChart data={diaData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                      <XAxis dataKey="dia" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={60} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="monto" fill={CHART_BLUE} radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </Panel>
              )}
            </div>

            {/* Desglose métodos de pago */}
            {resumen.metodos_pago.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {resumen.metodos_pago.map((m, i) => {
                  const bg  = [C.greenLt, C.blueLt, C.violetLt][i] ?? C.bg;
                  const col = PIE[i % PIE.length];
                  return (
                    <div key={m.metodo} style={{
                      background: bg,
                      border: `1px solid ${col}30`,
                      borderRadius: 12,
                      padding: "16px 18px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            color: col,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginBottom: 8,
                          }}>
                            <span style={{ color: col }}>{METODO_ICON[m.metodo]}</span>
                            {m.metodo}
                          </div>
                          <div style={{
                            fontSize: 24,
                            fontWeight: 900,
                            color: col,
                            letterSpacing: "-0.5px",
                          }}>{fmt(m.monto)}</div>
                        </div>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: col,
                          background: `${col}14`,
                          border: `1px solid ${col}28`,
                          padding: "5px 9px",
                          borderRadius: 7,
                        }}>{pct(m.monto, totalPagos)}</div>
                      </div>

                      {m.subtotal !== undefined && (
                        <div style={{
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: `1px solid ${col}22`,
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                        }}>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Subtotal</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmt(m.subtotal)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Servicio</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>{fmt(m.servicio ?? 0)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══ CUENTAS ══ */}
        {tab === "cuentas" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {resumen && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                  { l: "Total cuentas", v: String(totalC),             c: C.blue,   bg: C.blueLt,   icon: <Users size={14} />    },
                  { l: "Ventas",        v: fmt(resumen.total_ventas),   c: C.green,  bg: C.greenLt,  icon: <TrendingUp size={14} /> },
                  { l: "Servicio",      v: fmt(resumen.total_servicio), c: C.amber,  bg: C.amberLt,  icon: <Receipt size={14} />   },
                  { l: "Promedio",      v: fmt(resumen.ticket_promedio),c: C.violet, bg: C.violetLt, icon: <Award size={14} />     },
                ].map(s => (
                  <div key={s.l} style={{
                    background: s.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 10,
                      color: s.c,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 6,
                      opacity: 0.8,
                    }}>
                      <span style={{ color: s.c }}>{s.icon}</span>
                      {s.l}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                      {["#","Mesa","Apertura","Cierre","Método","Subtotal","Servicio","Total",""].map(h => (
                        <th key={h} style={{
                          padding: "11px 14px",
                          textAlign: "left",
                          fontSize: 10,
                          fontWeight: 700,
                          color: C.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cuentas.length === 0 && (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "52px 0" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: C.muted }}>
                            <Receipt size={32} color={C.dimB} />
                            <span style={{ fontSize: 14 }}>Sin cuentas cobradas en este período</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {cuentas.map((c) => (
                      <tr
                        key={c.id}
                        style={{ borderBottom: `1px solid ${C.border2}`, transition: "background 0.1s", background: "transparent" }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.greenLt)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "11px 14px", fontSize: 11, color: C.dim }}>
                          <span style={{ fontFamily: "monospace" }}>#{c.id}</span>
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <UtensilsCrossed size={13} color={C.muted} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{c.mesa}</span>
                          </div>
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>{fmtDT(c.fecha_apertura)}</td>
                        <td style={{ padding: "11px 14px", fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>{fmtDT(c.fecha_cierre)}</td>
                        <td style={{ padding: "11px 14px" }}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 9px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: `${METODO_C[c.metodo] ?? C.muted}14`,
                            color: METODO_C[c.metodo] ?? C.muted,
                            border: `1px solid ${METODO_C[c.metodo] ?? C.muted}28`,
                          }}>
                            {METODO_ICON[c.metodo]}
                            {c.metodo}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: C.muted }}>{fmt(c.subtotal ?? 0)}</td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: C.amber }}>{fmt(c.servicio ?? 0)}</td>
                        <td style={{ padding: "11px 14px", fontSize: 14, fontWeight: 800, color: C.green, whiteSpace: "nowrap" }}>{fmt(c.total)}</td>
                        <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 5 }}>
                            {/* Ver */}
                            <button
                              onClick={() => setCuentaModal(c)}
                              title="Ver detalle"
                              style={{
                                display: "flex", alignItems: "center", gap: 5,
                                padding: "5px 10px", borderRadius: 7,
                                border: `1px solid ${C.border}`,
                                background: C.bg,
                                color: C.slate,
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              <Eye size={13} /> Ver
                            </button>
                            {/* PDF */}
                            <button
                              onClick={() => generarFacturaPDF(c.id)}
                              title="Descargar PDF"
                              style={{
                                display: "flex", alignItems: "center", gap: 5,
                                padding: "5px 10px", borderRadius: 7,
                                border: `1px solid ${C.blueMid}`,
                                background: C.blueLt,
                                color: C.blue,
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              <Download size={13} /> PDF
                            </button>
                            {/* Imprimir */}
                            <button
                              onClick={() => handleImprimirCuenta(c.id)}
                              title="Imprimir ticket"
                              style={{
                                display: "flex", alignItems: "center",
                                padding: "5px 9px", borderRadius: 7,
                                border: `1px solid ${C.violetMid}`,
                                background: C.violetLt,
                                color: C.violet,
                                fontSize: 12, cursor: "pointer",
                              }}
                            >
                              <Printer size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalC > 25 && (
                <div style={{
                  padding: "10px 16px",
                  borderTop: `1px solid ${C.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: C.bg,
                }}>
                  <span style={{ fontSize: 12, color: C.muted }}>
                    {totalC} cuentas · pág <b style={{ color: C.text }}>{pagina}</b> de <b style={{ color: C.text }}>{totalPages}</b>
                  </span>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[
                      { icon: <ChevronFirst size={14} />,  disabled: pagina === 1,         fn: () => goPage(1),           title: "Primera" },
                      { icon: <ChevronLeft  size={14} />,  disabled: pagina === 1,         fn: () => goPage(pagina - 1),  title: "Anterior" },
                      { icon: <ChevronRight size={14} />,  disabled: pagina >= totalPages, fn: () => goPage(pagina + 1),  title: "Siguiente" },
                      { icon: <ChevronLast  size={14} />,  disabled: pagina >= totalPages, fn: () => goPage(totalPages),  title: "Última" },
                    ].map((b, idx) => (
                      <button
                        key={idx}
                        disabled={b.disabled}
                        onClick={b.fn}
                        title={b.title}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          width: 30, height: 30,
                          borderRadius: 7,
                          border: `1px solid ${C.border}`,
                          background: C.card,
                          color: b.disabled ? C.dimB : C.text,
                          cursor: b.disabled ? "default" : "pointer",
                          opacity: b.disabled ? 0.4 : 1,
                        }}
                      >{b.icon}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.4; cursor: pointer; }
      `}</style>

      {/* ── Modal detalle de cuenta ── */}
      {cuentaModal && (
        <div
          onClick={() => setCuentaModal(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(17,24,39,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 16,
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              fontFamily: "'Inter', system-ui, sans-serif",
              overflow: "hidden",
            }}
          >
            {/* Header modal */}
            <div style={{
              background: C.slate,
              padding: "18px 22px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}>
              <div>
                <div style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}>
                  Cuenta #{cuentaModal.id}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "white" }}>
                  <UtensilsCrossed size={16} />
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{cuentaModal.mesa}</span>
                </div>
              </div>
              <button
                onClick={() => setCuentaModal(null)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  color: "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                }}
              >
                <X size={14} />
              </button>
            </div>

            <CuentaDetalleBody cuentaId={cuentaModal.id} cuenta={cuentaModal} />
          </div>
        </div>
      )}

      {/* ── Toast impresión ── */}
      {mensajeImpresion && (
        <div style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderRadius: 99,
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: "nowrap",
          zIndex: 2000,
          background: mensajeImpresion.ok ? C.greenLt : C.amberLt,
          border: `1px solid ${mensajeImpresion.ok ? C.greenB : C.amberB}`,
          color: mensajeImpresion.ok ? C.green : C.amber,
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        }}>
          {mensajeImpresion.ok
            ? <><CheckCircle2 size={15} /> Ticket #{mensajeImpresion.id} impreso</>
            : <><AlertTriangle size={15} /> No se pudo imprimir la cuenta #{mensajeImpresion.id}</>}
        </div>
      )}
    </div>
  );
}