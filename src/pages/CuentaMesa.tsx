import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../services/api";

import NuevaOrdenModal from "../components/NuevaOrdenModal";
import CobrarModal from "../components/CobrarModal";
import TransferirMesaModal from "../components/TransferirMesaModal";
import ActividadMesaModal from "../components/ActividadMesaModal";
import ConfirmModal from "../components/ConfirmModal";

import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../hooks/useWebSocket";
import { usePrinter } from "../hooks/usePrinter";

import {
  ArrowLeft, ClipboardList, Zap, Clock3, ArrowRightLeft,
  Unlock, Printer, DollarSign, Trash2, Plus, Minus,
  ShoppingBag, AlertTriangle, Receipt,
} from "lucide-react";

// ─── Paleta ───────────────────────────────────────────────
const C = {
  bg:           "#f4f6f5",
  surface:      "#ffffff",
  border:       "#e4e9e6",
  borderHover:  "#c8d5cf",
  accent:       "#16a34a",
  accentLight:  "#f0fdf4",
  accentMid:    "#bbf7d0",
  text:         "#0f1f1a",
  textSub:      "#5a7068",
  textMuted:    "#96aaa4",
  danger:       "#dc2626",
  dangerLight:  "#fff7f7",
  dangerBorder: "#fca5a5",
  blue:         "#2563eb",
  blueLight:    "#eff6ff",
  blueBorder:   "#bfdbfe",
  orange:       "#ea580c",
  orangeLight:  "#fff7ed",
  orangeBorder: "#fed7aa",
  purple:       "#7c3aed",
  purpleLight:  "#f5f3ff",
  purpleBorder: "#ddd6fe",
};

interface DetalleCuenta {
  id: number;
  producto: string;
  cantidad: number;
  precio_unitario: number;
}

// ─── Botón base reutilizable ──────────────────────────────
function Btn({
  onClick, disabled = false, variant = "ghost", children, full = false, size = "md",
}: {
  onClick: () => void; disabled?: boolean;
  variant?: "primary"|"cobrar"|"ghost"|"blue"|"orange"|"purple"|"danger";
  children: React.ReactNode; full?: boolean; size?: "sm"|"md"|"lg";
}) {
  const pad  = size === "sm" ? "6px 12px" : size === "lg" ? "13px 16px" : "9px 14px";
  const fz   = size === "sm" ? 11 : size === "lg" ? 14 : 12;
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: `linear-gradient(135deg,${C.accent},#15803d)`, color:"white", border:"none", boxShadow:"0 2px 8px rgba(22,163,74,.22)" },
    cobrar:  { background: "linear-gradient(135deg,#dc2626,#b91c1c)",      color:"white", border:"none", boxShadow:"0 2px 10px rgba(220,38,38,.25)" },
    ghost:   { background: C.surface, color: C.textSub,  border:`1px solid ${C.border}` },
    blue:    { background: C.blueLight,   color: C.blue,   border:`1px solid ${C.blueBorder}` },
    orange:  { background: C.orangeLight, color: C.orange, border:`1px solid ${C.orangeBorder}` },
    purple:  { background: C.purpleLight, color: C.purple, border:`1px solid ${C.purpleBorder}` },
    danger:  { background: C.dangerLight, color: C.danger, border:`1px solid ${C.dangerBorder}` },
  };
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        display:"inline-flex", alignItems:"center", justifyContent: full ? "center" : undefined,
        gap:6, padding:pad, borderRadius:9,
        fontSize:fz, fontWeight:600, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? .45 : 1, transition:"opacity .15s",
        width: full ? "100%" : undefined,
        fontFamily:"'Inter',system-ui,sans-serif",
        ...variants[variant],
      }}
    >
      {children}
    </button>
  );
}

export default function CuentaMesa() {
  const { mesaId } = useParams();
  const navigate   = useNavigate();

  const [cuentaId,             setCuentaId]             = useState<number>(0);
  const [consumidos,           setConsumidos]           = useState<DetalleCuenta[]>([]);
  const [mostrarNuevaOrden,    setMostrarNuevaOrden]    = useState(false);
  const [mostrarCobro,         setMostrarCobro]         = useState(false);
  const [nombreMesa,           setNombreMesa]           = useState<string>("");
  const [mostrarTransferir,    setMostrarTransferir]    = useState(false);
  const [mostrarActividad,     setMostrarActividad]     = useState(false);
  const [mostrarAgregarDirecto,setMostrarAgregarDirecto]= useState(false);
  const [errorPrec,            setErrorPrec]            = useState("");

  const [confirm,  setConfirm]  = useState<{ titulo:string; descripcion?:string; tipo?:"default"|"warning"|"danger"; textoCon?:string; accion:()=>void }|null>(null);
  const [confirm2, setConfirm2] = useState<{ accion:()=>void }|null>(null);

  const { imprimirPrecuenta } = usePrinter();

  async function handleImprimirCuenta() {
    try {
      setErrorPrec("");
      const cfgRes = await api.get("/configuracion");
      const cfg    = cfgRes.data;
      await imprimirPrecuenta({
        negocio:     cfg.nombre_negocio || "POSKEY",
        direccion:   cfg.direccion || "",
        telefono:    cfg.telefono || "",
        num_factura: String(cuentaId).padStart(6, "0"),
        fecha:       new Date().toLocaleString("es-CR"),
        cajero:      "", cliente: "Consumidor Final",
        lineas: consumidos.map(i => ({
          nombre: i.producto, cantidad: i.cantidad,
          precio_unit: i.precio_unitario, subtotal: i.cantidad * i.precio_unitario,
        })),
        subtotal, impuesto: 0, total: totalCuenta, metodo_pago: "—",
      });
    } catch (e: any) { setErrorPrec(e.message ?? String(e)); }
  }

  async function cargarMesa() {
    try {
      const res = await api.get(`/mesas/${mesaId}`);
      if (res.data?.nombre) setNombreMesa(res.data.nombre);
    } catch {}
  }

  async function cargarCuenta(idCuenta: number) {
    try {
      const res = await api.get(`/cuentas/${idCuenta}/detalle`);
      setConsumidos(res.data);
    } catch {}
  }

  async function obtenerCuenta() {
    try {
      const res = await api.get(`/cuentas/mesa/${mesaId}`);
      if (res.data?.id) {
        const idCuenta = Number(res.data.id);
        setCuentaId(idCuenta);
        await cargarCuenta(idCuenta);
        return;
      }
      setCuentaId(0); setConsumidos([]);
    } catch {}
  }

  useWebSocket(["cuenta_actualizada","mesas_actualizadas"], obtenerCuenta);
  useEffect(() => { if (!mesaId) return; obtenerCuenta(); cargarMesa(); }, [mesaId]);

  const subtotal    = consumidos.reduce((acc,i) => acc + i.cantidad * i.precio_unitario, 0);
  const servicio    = subtotal * 0.10;
  const totalCuenta = subtotal + servicio;

  async function sumarProducto(id: number) {
    setConfirm({ titulo:"Sumar 1 unidad", tipo:"default", textoCon:"Confirmar",
      accion: async () => { await api.post(`/detalle/${id}/sumar`); cargarCuenta(cuentaId); } });
  }
  async function restarProducto(id: number) {
    setConfirm({ titulo:"Restar 1 unidad", tipo:"warning", textoCon:"Confirmar",
      accion: async () => { await api.post(`/detalle/${id}/restar`); cargarCuenta(cuentaId); } });
  }
  async function eliminarProducto(id: number) {
    setConfirm({ titulo:"Eliminar producto", descripcion:"Esta acción no se puede deshacer", tipo:"danger", textoCon:"Eliminar",
      accion: async () => { await api.delete(`/detalle/${id}`); cargarCuenta(cuentaId); } });
  }
  async function liberarMesa() {
    setConfirm({ titulo:"Liberar mesa", descripcion:"Se anulará la cuenta activa y todos sus productos", tipo:"danger", textoCon:"Sí, liberar",
      accion: () => { setConfirm2({ accion: async () => {
        await api.post(`/mesas/${mesaId}/liberar`);
        window.location.href = "/mesas";
      }}); },
    });
  }

  // ─── separador de sección ──────────────────────────────
  const SecLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize:9, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase",
      color: C.textMuted, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ height:1, width:10, background: C.border }} />
      {children}
      <div style={{ height:1, flex:1, background: C.border }} />
    </div>
  );

  return (
    <div style={{
      height:"100vh", display:"flex", flexDirection:"column",
      fontFamily:"'Inter',system-ui,sans-serif", background: C.bg, overflow:"hidden",
    }}>

      {/* ── HEADER ─────────────────────────────────────── */}
      <div style={{
        flexShrink:0, padding:"0 24px", height:64,
        background: C.surface, borderBottom:`1px solid ${C.border}`,
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:16,
      }}>
        {/* izq */}
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <button
            onClick={() => navigate("/mesas")}
            style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"6px 12px", borderRadius:8, border:`1px solid ${C.border}`,
              background: C.bg, color: C.textSub, fontSize:12, fontWeight:600,
              cursor:"pointer", fontFamily:"'Inter',system-ui,sans-serif",
            }}
          >
            <ArrowLeft size={13} strokeWidth={2.5} /> Mesas
          </button>

          <div style={{ width:1, height:32, background: C.border }} />

          <div>
            <div style={{ fontSize:22, fontWeight:800, color: C.text, letterSpacing:"-0.03em", lineHeight:1.1 }}>
              {nombreMesa || `Mesa ${mesaId}`}
            </div>
            <div style={{ fontSize:11, color: C.textMuted, marginTop:2, fontWeight:500 }}>
              Cuenta <span style={{ color: C.textSub, fontWeight:700 }}>#{cuentaId || "—"}</span>
            </div>
          </div>
        </div>

        {/* der */}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:6,
          padding:"5px 12px", borderRadius:99,
          background: C.accentLight, border:`1px solid ${C.accentMid}`,
          fontSize:11, fontWeight:700, color: C.accent, letterSpacing:".05em",
        }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background: C.accent }} />
          ABIERTA
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────── */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", gap:0 }}>

        {/* ═══ IZQUIERDA: productos ═══ */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px 20px 24px" }}>

          {/* título sección */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{
                width:32, height:32, borderRadius:8,
                background: C.accentLight, border:`1px solid ${C.accentMid}`,
                display:"flex", alignItems:"center", justifyContent:"center", color: C.accent,
              }}>
                <Receipt size={15} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color: C.text }}>Consumidos</div>
                <div style={{ fontSize:11, color: C.textMuted }}>{consumidos.length} producto{consumidos.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
          </div>

          {/* vacío */}
          {consumidos.length === 0 && (
            <div style={{
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              padding:"64px 20px", gap:12, color: C.textMuted,
              background: C.surface, borderRadius:14, border:`1px solid ${C.border}`,
            }}>
              <ShoppingBag size={36} strokeWidth={1.2} color={C.textMuted} />
              <div style={{ fontSize:13, fontWeight:500 }}>No hay productos registrados</div>
              <div style={{ fontSize:11, color: C.textMuted }}>Agrega una orden para comenzar</div>
            </div>
          )}

          {/* tabla de productos */}
          {consumidos.length > 0 && (
            <div style={{
              background: C.surface, borderRadius:14, border:`1px solid ${C.border}`,
              overflow:"hidden",
            }}>
              {/* cabecera tabla */}
              <div style={{
                display:"grid", gridTemplateColumns:"1fr 90px 100px 90px 36px",
                padding:"9px 16px",
                background: C.bg, borderBottom:`1px solid ${C.border}`,
                fontSize:9, fontWeight:700, color: C.textMuted,
                textTransform:"uppercase", letterSpacing:".08em", gap:8,
              }}>
                <span>Producto</span>
                <span style={{ textAlign:"center" }}>Precio u.</span>
                <span style={{ textAlign:"center" }}>Cantidad</span>
                <span style={{ textAlign:"right"  }}>Subtotal</span>
                <span />
              </div>

              {/* filas */}
              {consumidos.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    display:"grid", gridTemplateColumns:"1fr 90px 100px 90px 36px",
                    padding:"11px 16px", gap:8, alignItems:"center",
                    borderBottom: idx < consumidos.length - 1 ? `1px solid ${C.border}` : "none",
                    transition:"background .12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {/* nombre */}
                  <div style={{ fontSize:13, fontWeight:600, color: C.text }}>{item.producto}</div>

                  {/* precio unitario */}
                  <div style={{ fontSize:12, color: C.textSub, textAlign:"center" }}>
                    ₡{item.precio_unitario.toLocaleString()}
                  </div>

                  {/* control cantidad */}
                  <div style={{
                    display:"flex", alignItems:"center", justifyContent:"center", gap:0,
                    border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden",
                    background: C.bg, width:"fit-content", margin:"0 auto",
                  }}>
                    <button
                      onClick={() => restarProducto(item.id)}
                      style={{
                        width:28, height:28, border:"none", background:"transparent",
                        cursor:"pointer", color: C.textSub, display:"flex",
                        alignItems:"center", justifyContent:"center",
                        borderRight:`1px solid ${C.border}`,
                      }}
                    >
                      <Minus size={11} strokeWidth={2.5} />
                    </button>
                    <span style={{
                      minWidth:28, textAlign:"center", fontSize:13,
                      fontWeight:700, color: C.text, lineHeight:"28px",
                    }}>
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => sumarProducto(item.id)}
                      style={{
                        width:28, height:28, border:"none", background:"transparent",
                        cursor:"pointer", color: C.textSub, display:"flex",
                        alignItems:"center", justifyContent:"center",
                        borderLeft:`1px solid ${C.border}`,
                      }}
                    >
                      <Plus size={11} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* subtotal */}
                  <div style={{ fontSize:13, fontWeight:700, color: C.accent, textAlign:"right" }}>
                    ₡{(item.cantidad * item.precio_unitario).toLocaleString()}
                  </div>

                  {/* eliminar */}
                  <button
                    onClick={() => eliminarProducto(item.id)}
                    style={{
                      width:28, height:28, borderRadius:7, border:`1px solid ${C.border}`,
                      background: C.surface, cursor:"pointer", display:"flex",
                      alignItems:"center", justifyContent:"center", color: C.textMuted,
                      transition:"all .15s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background     = C.dangerLight;
                      (e.currentTarget as HTMLButtonElement).style.color          = C.danger;
                      (e.currentTarget as HTMLButtonElement).style.borderColor    = C.dangerBorder;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background     = C.surface;
                      (e.currentTarget as HTMLButtonElement).style.color          = C.textMuted;
                      (e.currentTarget as HTMLButtonElement).style.borderColor    = C.border;
                    }}
                  >
                    <Trash2 size={12} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ DERECHA: resumen + acciones ═══ */}
        <div style={{
          width:280, flexShrink:0,
          borderLeft:`1px solid ${C.border}`,
          background: C.surface,
          overflowY:"auto",
          display:"flex", flexDirection:"column",
        }}>
          <div style={{ padding:"20px 18px", display:"flex", flexDirection:"column", gap:20, flex:1 }}>

            {/* ── RESUMEN ── */}
            <section>
              <SecLabel>Resumen</SecLabel>
              <div style={{
                background: C.bg, borderRadius:12, border:`1px solid ${C.border}`,
                overflow:"hidden",
              }}>
                {[
                  { label:"Subtotal",    value: subtotal },
                  { label:"Servicio 10%",value: servicio },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"10px 14px", borderBottom:`1px solid ${C.border}`,
                    fontSize:12, color: C.textSub,
                  }}>
                    <span>{label}</span>
                    <span style={{ fontWeight:600, color: C.text }}>₡{value.toLocaleString()}</span>
                  </div>
                ))}
                {/* total */}
                <div style={{
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"14px", background: C.accentLight,
                }}>
                  <span style={{ fontSize:13, fontWeight:700, color: C.text }}>Total</span>
                  <span style={{ fontSize:22, fontWeight:800, color: C.accent, letterSpacing:"-0.02em" }}>
                    ₡{totalCuenta.toLocaleString()}
                  </span>
                </div>
              </div>
            </section>

            {/* ── COBRAR (acción primaria) ── */}
            <Btn onClick={() => setMostrarCobro(true)} variant="cobrar" full size="lg">
              <DollarSign size={16} strokeWidth={2.5} /> Cobrar
            </Btn>

            {/* ── ÓRDENES ── */}
            <section>
              <SecLabel>Agregar productos</SecLabel>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                <Btn onClick={() => setMostrarNuevaOrden(true)}    variant="primary" full>
                  <ClipboardList size={13} strokeWidth={2} /> Nueva orden
                </Btn>
                <Btn onClick={() => setMostrarAgregarDirecto(true)} variant="blue" full>
                  <Zap size={13} strokeWidth={2} /> Agregar a cuenta
                </Btn>
              </div>
            </section>

            {/* ── GESTIÓN ── */}
            <section>
              <SecLabel>Gestión</SecLabel>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                <Btn onClick={() => setMostrarActividad(true)}  variant="ghost" full>
                  <Clock3 size={13} strokeWidth={2} /> Actividad
                </Btn>
                <Btn onClick={() => setMostrarTransferir(true)} variant="ghost" full>
                  <ArrowRightLeft size={13} strokeWidth={2} /> Transferir mesa
                </Btn>
                <Btn
                  onClick={handleImprimirCuenta}
                  disabled={consumidos.length === 0}
                  variant="purple" full
                >
                  <Printer size={13} strokeWidth={2} /> Imprimir cuenta
                </Btn>

                {errorPrec && (
                  <div style={{
                    display:"flex", alignItems:"flex-start", gap:6,
                    padding:"8px 10px", borderRadius:8,
                    background:"#fef2f2", border:"1px solid #fecaca",
                    fontSize:11, color: C.danger, lineHeight:1.4,
                  }}>
                    <AlertTriangle size={12} strokeWidth={2} style={{ flexShrink:0, marginTop:1 }} />
                    {errorPrec}
                  </div>
                )}
              </div>
            </section>

            {/* ── ZONA PELIGROSA ── */}
            <section style={{ marginTop:"auto" }}>
              <SecLabel>Zona peligrosa</SecLabel>
              <Btn onClick={liberarMesa} variant="orange" full>
                <Unlock size={13} strokeWidth={2} /> Liberar mesa
              </Btn>
            </section>

          </div>
        </div>

      </div>

      {/* ── MODALES ─────────────────────────────────────── */}
      {mostrarNuevaOrden && (
        <NuevaOrdenModal
          mesaId={Number(mesaId)} cuentaId={cuentaId}
          onClose={() => setMostrarNuevaOrden(false)}
          onOrdenCreada={nuevoId => {
            if (nuevoId) setCuentaId(nuevoId);
            obtenerCuenta(); setMostrarNuevaOrden(false);
          }}
        />
      )}

      {mostrarCobro && (
        <CobrarModal
          cuentaId={cuentaId} total={subtotal}
          onClose={() => setMostrarCobro(false)}
          onCobrado={async () => {
            setMostrarCobro(false); setCuentaId(0); setConsumidos([]);
            await obtenerCuenta();
          }}
        />
      )}

      {mostrarTransferir && (
        <TransferirMesaModal
          cuentaId={cuentaId} mesaActual={Number(mesaId)}
          onClose={() => setMostrarTransferir(false)}
          onTransferida={nuevaMesaId => navigate(`/cuenta/${nuevaMesaId}`)}
        />
      )}

      {mostrarActividad && (
        <ActividadMesaModal
          cuentaId={cuentaId}
          onClose={() => setMostrarActividad(false)}
        />
      )}

      {mostrarAgregarDirecto && (
        <NuevaOrdenModal
          mesaId={Number(mesaId)} cuentaId={cuentaId} modo="directo"
          onClose={() => setMostrarAgregarDirecto(false)}
          onOrdenCreada={nuevoId => {
            if (nuevoId) setCuentaId(nuevoId);
            obtenerCuenta(); setMostrarAgregarDirecto(false);
          }}
        />
      )}

      {confirm && (
        <ConfirmModal
          titulo={confirm.titulo} descripcion={confirm.descripcion}
          tipo={confirm.tipo} textoConfirmar={confirm.textoCon}
          onConfirmar={() => { confirm.accion(); setConfirm(null); }}
          onCancelar={() => setConfirm(null)}
        />
      )}

      {confirm2 && (
        <ConfirmModal
          titulo="¿Está completamente seguro?"
          descripcion="Se eliminará la cuenta y se liberará la mesa"
          tipo="danger" textoConfirmar="Eliminar definitivamente"
          onConfirmar={() => { confirm2.accion(); setConfirm2(null); }}
          onCancelar={() => setConfirm2(null)}
        />
      )}

    </div>
  );
}