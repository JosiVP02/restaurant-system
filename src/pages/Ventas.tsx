import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { generarFacturaPDF } from "../utils/factura";
import { usePrinter } from "../hooks/usePrinter";




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

  const month = String(
    fecha.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    fecha.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const hace = (d: number) => {

  const x = new Date();

  x.setDate(
    x.getDate() - d
  );

  const year = x.getFullYear();

  const month = String(
    x.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    x.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};





const fmtDT = (iso: string|null) => !iso ? "—" : new Date(iso).toLocaleString("es-CR",{dateStyle:"short",timeStyle:"short"});

// ── paleta original clara ─────────────────────────────────────
const C = {
  bg:      "#f1f5f9",
  card:    "#ffffff",
  cardB:   "#f8fafc",
  border:  "#e2e8f0",
  green:   "#16a34a",
  greenLt: "#dcfce7",
  greenB:  "#86efac",
  blue:    "#2563eb",
  blueLt:  "#dbeafe",
  blueB:   "#93c5fd",
  violet:  "#7c3aed",
  violetLt:"#ede9fe",
  violetB: "#c4b5fd",
  amber:   "#d97706",
  amberLt: "#fef3c7",
  amberB:  "#fcd34d",
  slate:   "#0f172a",
  text:    "#1e293b",
  muted:   "#64748b",
  dim:     "#94a3b8",
  border2: "#f1f5f9",
};
const PIE = [C.green, C.blue, C.violet, C.amber];
const METODO_C: Record<string,string> = { Efectivo: C.green, Tarjeta: C.blue, SINPE: C.violet };
const METODO_I: Record<string,string> = { Efectivo: "💵", Tarjeta: "💳", SINPE: "📱" };

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.slate, border:"none", borderRadius:10, padding:"10px 14px", boxShadow:"0 8px 24px rgba(0,0,0,0.2)" }}>
      <p style={{ margin:0, fontSize:11, color:"#94a3b8", marginBottom:4 }}>{label}</p>
      {payload.map((p:any) => (
        <p key={p.dataKey} style={{ margin:0, fontSize:14, fontWeight:700, color:"#fff" }}>{fmt(p.value)}</p>
      ))}
    </div>
  );
}

function Panel({ children, title, style }: { children: React.ReactNode; title?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden", ...style }}>
      {title && (
        <div style={{ padding:"14px 18px 0 18px" }}>
          <span style={{ fontSize:12, fontWeight:800, color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em" }}>{title}</span>
        </div>
      )}
      <div style={{ padding: title ? "12px 18px 18px" : "18px" }}>{children}</div>
    </div>
  );
}














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
    <div style={{ padding: "20px 26px" }}>
      {loading ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8", fontSize: 13 }}>Cargando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 80px 80px",
                        padding: "6px 12px", fontSize: 10, fontWeight: 700, color: "#94a3b8",
                        textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span>Producto</span>
            <span style={{ textAlign: "center" }}>Cant.</span>
            <span style={{ textAlign: "right" }}>P. Unit.</span>
            <span style={{ textAlign: "right" }}>Total</span>
          </div>
          {items.map((item, i) => (
            <div key={item.id} style={{
              display: "grid", gridTemplateColumns: "1fr 56px 80px 80px",
              alignItems: "center", padding: "10px 12px", borderRadius: 10,
              background: i % 2 === 0 ? "#f8fafc" : "white", border: "1px solid #f1f5f9",
            }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1f2937" }}>{item.producto}</span>
              <span style={{ textAlign: "center", fontSize: 13, fontWeight: 800, color: "white",
                             background: "#475569", borderRadius: 6, padding: "2px 0", margin: "0 6px" }}>
                {item.cantidad}
              </span>
              <span style={{ textAlign: "right", fontSize: 12.5, color: "#64748b" }}>{fmt(item.precio_unitario)}</span>
              <span style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: "#1f2937" }}>
                {fmt(item.cantidad * item.precio_unitario)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14, marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Subtotal</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{fmt(cuenta.subtotal ?? 0)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px",
                      background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>Total cobrado</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>{fmt(cuenta.total)}</span>
        </div>
      </div>
    </div>
  );
}









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

  useEffect(() => { cargar(hoy(), hoy(), 1); }, []);

  const totalPages = Math.ceil(totalC / 25);
  const totalPagos = resumen?.metodos_pago.reduce((a,m) => a+m.monto, 0) ?? 0;
  const pieData    = resumen?.metodos_pago.map(m => ({ name:m.metodo, value:m.monto })) ?? [];
  const horaData   = resumen?.ventas_por_hora ?? [];
  const diaData    = resumen?.ventas_por_dia.map(v => ({ dia:v.dia.slice(5), monto:v.monto })) ?? [];

  return (
    <div style={{ height:"100vh", overflowY:"auto", background:C.bg, fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", color:C.text }}>
      <div style={{ padding:"22px 24px 60px", display:"flex", flexDirection:"column", gap:16 }}>

        {/* ── HEADER ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ margin:0, fontSize:20, fontWeight:900, color:C.slate, letterSpacing:"-0.5px" }}>
              📊 Reportes de Ventas
            </h1>
            <p style={{ margin:"2px 0 0", fontSize:12, color:C.muted }}>
              {resumen ? `${resumen.fecha_inicio}  →  ${resumen.fecha_fin}` : "Seleccioná un período"}
            </p>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            {/* presets */}
            <div style={{ display:"flex", background:C.card, borderRadius:9, border:`1px solid ${C.border}`, overflow:"hidden" }}>
              {(["hoy","semana","mes"] as const).map(p => (
                <button key={p} onClick={() => applyPreset(p)} style={{
                  padding:"7px 16px", border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
                  background: preset===p ? C.green : "transparent",
                  color: preset===p ? "#fff" : C.muted,
                  transition:"all 0.15s",
                }}>
                  {p==="hoy"?"Hoy":p==="semana"?"7 días":"30 días"}
                </button>
              ))}
            </div>

            {/* rango custom */}
            <div style={{ display:"flex", alignItems:"center", gap:6, background:C.card, borderRadius:9, border:`1px solid ${C.border}`, padding:"5px 12px" }}>
              <input type="date" value={fi} onChange={e=>setFi(e.target.value)} style={{ background:"transparent", border:"none", color:C.text, fontSize:12, outline:"none", cursor:"pointer" }}/>
              <span style={{ color:C.dim, fontSize:11 }}>→</span>
              <input type="date" value={ff} onChange={e=>setFf(e.target.value)} style={{ background:"transparent", border:"none", color:C.text, fontSize:12, outline:"none", cursor:"pointer" }}/>
            </div>

            <button onClick={buscar} style={{ padding:"8px 20px", borderRadius:9, border:"none", background:C.slate, color:"#fff", fontWeight:800, fontSize:12, cursor:"pointer" }}>
              Buscar
            </button>

            {loading && <div style={{ width:14, height:14, borderRadius:99, border:`2px solid ${C.border}`, borderTopColor:C.green, animation:"spin 0.7s linear infinite" }}/>}
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display:"flex", gap:2, background:C.card, borderRadius:10, border:`1px solid ${C.border}`, padding:4 }}>
          {(["dashboard","cuentas"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex:1, padding:"9px 0", borderRadius:7, border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
              background: tab===t ? C.slate : "transparent",
              color: tab===t ? "#fff" : C.muted,
              transition:"all 0.15s",
            }}>
              {t==="dashboard" ? "📈 Resumen" : "🧾 Cuentas"}
            </button>
          ))}
        </div>

        {/* ══ DASHBOARD ══ */}
        {tab==="dashboard" && resumen && (
          <>
            {/* KPI cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {[
                { label:"Ventas totales",    value:fmt(resumen.total_ventas),    sub:`Subtotal ${fmt(resumen.total_subtotal)}`, color:C.green,  bg:C.greenLt,  accent:C.greenB  },
                { label:"Cargo por servicio",value:fmt(resumen.total_servicio),  sub:`${resumen.total_ventas ? ((resumen.total_servicio/resumen.total_ventas)*100).toFixed(1) : 0}% del total`, color:C.amber,  bg:C.amberLt,  accent:C.amberB  },
                { label:"Cuentas cobradas",  value:String(resumen.total_cuentas),sub:"transacciones",                          color:C.blue,   bg:C.blueLt,   accent:C.blueB   },
                { label:"Ticket promedio",   value:fmt(resumen.ticket_promedio), sub:"por cuenta",                             color:C.violet, bg:C.violetLt, accent:C.violetB },
              ].map(k => (
                <div key={k.label} style={{ background:k.bg, border:`1.5px solid ${k.accent}`, borderRadius:14, overflow:"hidden" }}>
                  <div style={{ padding:"20px 20px 16px" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:k.color, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10, opacity:0.8 }}>{k.label}</div>
                    <div style={{ fontSize:26, fontWeight:900, color:k.color, letterSpacing:"-1px", lineHeight:1 }}>{k.value}</div>
                    <div style={{ fontSize:11, color:k.color, opacity:0.6, marginTop:6 }}>{k.sub}</div>
                  </div>
                  <div style={{ height:3, background:k.color, opacity:0.35 }}/>
                </div>
              ))}
            </div>

            {/* área + donut */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:12 }}>
              <Panel title="Ventas por hora">
                {horaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={horaData} margin={{ top:4, right:4, left:0, bottom:0 }}>
                      <defs>
                        <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.green} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                      <XAxis dataKey="hora" tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false}/>
                      <YAxis tickFormatter={fmtK} tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} width={60}/>
                      <Tooltip content={<Tip/>}/>
                      <Area type="monotone" dataKey="monto" stroke={C.green} strokeWidth={2.5}
                        fill="url(#gGrad)" dot={false} activeDot={{ r:4, fill:C.green, strokeWidth:0 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height:240, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:13 }}>Sin datos</div>
                )}
              </Panel>

              <Panel title="Métodos de pago">
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%"
                          innerRadius={44} outerRadius={68} paddingAngle={3} startAngle={90} endAngle={-270}>
                          {pieData.map((_,i) => <Cell key={i} fill={PIE[i%PIE.length]} strokeWidth={0}/>)}
                        </Pie>
                        <Tooltip formatter={(v:any)=>fmt(v)} contentStyle={{ background:C.slate, border:"none", borderRadius:8, fontSize:12, color:"#fff" }}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:8 }}>
                      {resumen.metodos_pago.map((m,i) => (
                        <div key={m.metodo}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <div style={{ width:8, height:8, borderRadius:2, background:PIE[i%PIE.length] }}/>
                              <span style={{ fontSize:12, color:C.muted }}>{m.metodo}</span>
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color:C.text }}>{pct(m.monto, totalPagos)}</span>
                          </div>
                          <div style={{ background:C.border, borderRadius:99, height:5 }}>
                            <div style={{ width:pct(m.monto,totalPagos), height:"100%", borderRadius:99, background:PIE[i%PIE.length], transition:"width 0.5s" }}/>
                          </div>
                          <div style={{ textAlign:"right", fontSize:11, color:C.dim, marginTop:2 }}>{fmt(m.monto)}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ height:200, display:"flex", alignItems:"center", justifyContent:"center", color:C.muted, fontSize:13 }}>Sin ventas</div>
                )}
              </Panel>
            </div>

            {/* top productos + barras por día */}
            <div style={{ display:"grid", gridTemplateColumns: diaData.length > 1 ? "1fr 1fr" : "1fr", gap:12 }}>
              <Panel title="Productos más vendidos">
                {resumen.top_productos.length === 0 ? (
                  <p style={{ color:C.muted, fontSize:13, margin:0 }}>Sin ventas en el período</p>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                    {resumen.top_productos.slice(0,8).map((p,i) => {
                      const max = resumen.top_productos[0]?.total ?? 1;
                      const medalBg = i===0?"#f59e0b": i===1?"#94a3b8": i===2?"#c2703e": C.border;
                      const medalTxt = i<3?"#fff":C.muted;
                      return (
                        <div key={p.nombre} style={{ display:"grid", gridTemplateColumns:"28px 1fr 64px 88px", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:10, background: i===0?"#fffbeb":C.bg, border:`1px solid ${i===0?"#fde68a":C.border}` }}>
                          <div style={{ width:24, height:24, borderRadius:6, background:medalBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:medalTxt, flexShrink:0 }}>{i+1}</div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:4 }}>{p.nombre}</div>
                            <div style={{ background:C.border, borderRadius:99, height:4 }}>
                              <div style={{ width:`${(p.total/max)*100}%`, height:"100%", borderRadius:99, background:i===0?"#f59e0b":C.green, transition:"width 0.5s" }}/>
                            </div>
                          </div>
                          <span style={{ fontSize:11, color:C.muted, textAlign:"right" }}>{p.cantidad} uds</span>
                          <span style={{ fontSize:13, fontWeight:800, color:C.green, textAlign:"right" }}>{fmt(p.total)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>

              {diaData.length > 1 && (
                <Panel title="Ventas por día">
                  <ResponsiveContainer width="100%" height={290}>
                    <BarChart data={diaData} margin={{ top:4, right:4, left:0, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                      <XAxis dataKey="dia" tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false}/>
                      <YAxis tickFormatter={fmtK} tick={{ fontSize:11, fill:C.muted }} axisLine={false} tickLine={false} width={60}/>
                      <Tooltip content={<Tip/>}/>
                      <Bar dataKey="monto" fill={C.blue} radius={[5,5,0,0]} maxBarSize={44}/>
                    </BarChart>
                  </ResponsiveContainer>
                </Panel>
              )}
            </div>

            {/* desglose métodos */}
            {resumen.metodos_pago.length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                {resumen.metodos_pago.map((m,i) => {
                  const bg  = [C.greenLt, C.blueLt, C.violetLt][i] ?? C.bg;
                  const col = PIE[i%PIE.length];
                  return (
                    <div key={m.metodo} style={{ background:bg, border:`1.5px solid ${col}44`, borderRadius:14, padding:"18px 20px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div>
                          <div style={{ fontSize:11, fontWeight:700, color:col, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>{METODO_I[m.metodo]??""} {m.metodo}</div>
                          <div style={{ fontSize:26, fontWeight:900, color:col, letterSpacing:"-1px" }}>{fmt(m.monto)}</div>
                        </div>
                        <div style={{ fontSize:15, fontWeight:800, color:col, background:`${col}18`, padding:"6px 10px", borderRadius:8 }}>{pct(m.monto, totalPagos)}</div>
                      </div>
                      {m.subtotal !== undefined && (
                        <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${col}33`, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                          <div>
                            <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>Subtotal</div>
                            <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{fmt(m.subtotal)}</div>
                          </div>
                          <div>
                            <div style={{ fontSize:10, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>Servicio</div>
                            <div style={{ fontSize:14, fontWeight:700, color:C.amber }}>{fmt(m.servicio??0)}</div>
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
        {tab==="cuentas" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {resumen && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                {[
                  { l:"Total cuentas", v:String(totalC),              c:C.blue,   bg:C.blueLt   },
                  { l:"Ventas",        v:fmt(resumen.total_ventas),    c:C.green,  bg:C.greenLt  },
                  { l:"Servicio",      v:fmt(resumen.total_servicio),  c:C.amber,  bg:C.amberLt  },
                  { l:"Promedio",      v:fmt(resumen.ticket_promedio), c:C.violet, bg:C.violetLt },
                ].map(s => (
                  <div key={s.l} style={{ background:s.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px" }}>
                    <div style={{ fontSize:10, color:s.c, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6, opacity:0.8 }}>{s.l}</div>
                    <div style={{ fontSize:20, fontWeight:900, color:s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
                  <thead>
                    <tr style={{ background:C.bg, borderBottom:`1px solid ${C.border}` }}>
                      {["#","Mesa","Apertura","Cierre","Método","Subtotal","Servicio","Total",""].map(h => (
                        <th key={h} style={{ padding:"12px 14px", textAlign:"left", fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.07em", whiteSpace:"nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cuentas.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign:"center", padding:"56px 0", color:C.muted, fontSize:14 }}>Sin cuentas cobradas en este período</td></tr>
                    )}
                    {cuentas.map((c) => (
                      <tr key={c.id}
                        style={{ borderBottom:`1px solid ${C.border2}`, transition:"background 0.1s", background:"transparent" }}
                        onMouseEnter={e=>(e.currentTarget.style.background="#f0fdf4")}
                        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}
                      >
                        <td style={{ padding:"11px 14px", fontSize:11, color:C.dim }}>#{c.id}</td>
                        <td style={{ padding:"11px 14px", fontSize:13, fontWeight:700, color:C.text }}>🍽️ {c.mesa}</td>
                        <td style={{ padding:"11px 14px", fontSize:11, color:C.muted, whiteSpace:"nowrap" }}>{fmtDT(c.fecha_apertura)}</td>
                        <td style={{ padding:"11px 14px", fontSize:11, color:C.muted, whiteSpace:"nowrap" }}>{fmtDT(c.fecha_cierre)}</td>
                        <td style={{ padding:"11px 14px" }}>
                          <span style={{ padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700, background:`${METODO_C[c.metodo]??C.muted}18`, color:METODO_C[c.metodo]??C.muted }}>
                            {METODO_I[c.metodo]??""} {c.metodo}
                          </span>
                        </td>
                        <td style={{ padding:"11px 14px", fontSize:12, color:C.muted }}>{fmt(c.subtotal??0)}</td>
                        <td style={{ padding:"11px 14px", fontSize:12, color:C.amber }}>{fmt(c.servicio??0)}</td>
                        <td style={{ padding:"11px 14px", fontSize:14, fontWeight:800, color:C.green, whiteSpace:"nowrap" }}>{fmt(c.total)}</td>

                        <td style={{ padding:"11px 14px", whiteSpace:"nowrap" }}>
                          <div style={{ display:"flex", gap:6 }}>
                            <button
                              onClick={() => setCuentaModal(c)}
                              style={{ padding:"5px 10px", borderRadius:7, border:`1px solid ${C.border}`, background:C.bg, color:C.slate, fontSize:12, fontWeight:700, cursor:"pointer" }}
                            >
                              👁️ Ver
                            </button>
                            <button
                              onClick={() => generarFacturaPDF(c.id)}
                              style={{ padding:"5px 10px", borderRadius:7, border:`1px solid ${C.border}`, background:C.bg, color:C.blue, fontSize:12, fontWeight:700, cursor:"pointer" }}
                            >
                              ⬇️ PDF
                            </button>
                            <button
                              onClick={() => handleImprimirCuenta(c.id)}
                              style={{ padding:"5px 10px", borderRadius:7, border:"1px solid #ddd6fe", background:"#f5f3ff", color:C.violet, fontSize:12, fontWeight:700, cursor:"pointer" }}
                            >
                              🖨️
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalC > 25 && (
                <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:C.bg }}>
                  <span style={{ fontSize:12, color:C.muted }}>{totalC} cuentas · pág <b style={{color:C.text}}>{pagina}</b> de <b style={{color:C.text}}>{totalPages}</b></span>
                  <div style={{ display:"flex", gap:6 }}>
                    {[
                      { label:"«",      disabled:pagina===1,          fn:()=>goPage(1) },
                      { label:"← Ant",  disabled:pagina===1,          fn:()=>goPage(pagina-1) },
                      { label:"Sig →",  disabled:pagina>=totalPages,  fn:()=>goPage(pagina+1) },
                      { label:"»",      disabled:pagina>=totalPages,  fn:()=>goPage(totalPages) },
                    ].map(b => (
                      <button key={b.label} disabled={b.disabled} onClick={b.fn} style={{
                        padding:"6px 13px", borderRadius:7, border:`1px solid ${C.border}`,
                        background:C.card, color:b.disabled?C.dim:C.text,
                        fontSize:12, fontWeight:600, cursor:b.disabled?"default":"pointer", opacity:b.disabled?0.4:1,
                      }}>{b.label}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>



      {/* Modal detalle */}
      {cuentaModal && (
        <div
          onClick={() => setCuentaModal(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(15,31,26,0.55)", backdropFilter: "blur(3px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 20, width: "100%", maxWidth: 480,
              boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
              fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden",
            }}
          >
            <div style={{
              background: "linear-gradient(135deg, #1e3a2f, #0f1f1a)",
              padding: "22px 26px", display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700,
                              letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Cuenta #{cuentaModal.id}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "white", marginTop: 4 }}>
                  🍽️ {cuentaModal.mesa}
                </div>
              </div>
              <button
                onClick={() => setCuentaModal(null)}
                style={{
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "white", borderRadius: 8, padding: "7px 14px",
                  fontSize: 12, cursor: "pointer", fontWeight: 700,
                }}
              >
                ✕ Cerrar
              </button>
            </div>
            <CuentaDetalleBody cuentaId={cuentaModal.id} cuenta={cuentaModal} />
          </div>
        </div>
      )}

      {/* Toast impresión */}
      {mensajeImpresion && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600,
          whiteSpace: "nowrap", zIndex: 2000,
          background: mensajeImpresion.ok ? "#f0fdf4" : "#fff7ed",
          border: `1px solid ${mensajeImpresion.ok ? "#bbf7d0" : "#fed7aa"}`,
          color: mensajeImpresion.ok ? "#15803d" : "#c2410c",
        }}>
          {mensajeImpresion.ok
            ? `✅ Ticket de cuenta #${mensajeImpresion.id} impreso`
            : `⚠️ No se pudo imprimir la cuenta #${mensajeImpresion.id}`}
        </div>
      )}




    </div>
  );
}