import { useState } from "react";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import { generarFacturaPDF } from "../utils/factura";
import { usePrinter } from "../hooks/usePrinter";
import {
  Receipt,
  Banknote,
  CreditCard,
  Smartphone,
  Download,
  Printer,
  BadgePercent,
  CheckCircle2,
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

  // Verde corporativo
  accent:         "#059669",
  accentDark:     "#047857",
  accentDeep:     "#065f46",
  accentSubtle:   "#ecfdf5",
  accentBorder:   "#6ee7b7",
  accentShadow:   "rgba(5,150,105,0.22)",

  // Header
  headerBg:       "#0f172a",
  headerBorder:   "#1e293b",

  // Resumen
  resumeBg:       "#f8fafc",
  resumeBorder:   "#e2e8f0",

  // Efectivo
  efectivoBg:     "#f8fafc",
  efectivoBorder: "#e2e8f0",

  // Vuelto
  vueltoBg:       "#ecfdf5",
  vueltoBorder:   "#6ee7b7",

  // Toggle check
  checkActive:    "#ecfdf5",
  checkActiveBorder:"#6ee7b7",
  checkInactive:  "#f1f5f9",
  checkInactiveBorder:"#e2e8f0",

  // Método pago
  metodoBg:       "#ffffff",
  metodoBorder:   "#e2e8f0",
  metodoActiveBg: "#ecfdf5",
  metodoActiveBorder:"#059669",
  metodoActiveText:"#047857",
  metodoText:     "#64748b",

  // Botones
  btnCancelBg:    "#ffffff",
  btnCancelBorder:"#e2e8f0",
  btnCancelText:  "#475569",

  // Cobrar
  cobrarBg:       "#059669",
  cobrarHover:    "#047857",
  cobrarDisabled: "#6ee7b7",
  cobrarShadow:   "rgba(5,150,105,0.30)",

  modalShadow:    "0 32px 80px rgba(15,23,42,0.24), 0 4px 20px rgba(15,23,42,0.08)",
};

// ─── Datos estáticos ─────────────────────────────────────────────────────────
interface MetodoPago {
  id: string;
  label: string;
  Icon: React.FC<{ size?: number; strokeWidth?: number; color?: string }>;
}

const METODOS: MetodoPago[] = [
  { id: "Efectivo", label: "Efectivo", Icon: Banknote    },
  { id: "Tarjeta",  label: "Tarjeta",  Icon: CreditCard  },
  { id: "SINPE",    label: "SINPE",    Icon: Smartphone  },
];

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Props {
  cuentaId: number;
  total: number;
  onClose: () => void;
  onCobrado: () => void;
}

interface DetalleCuenta {
  id: number;
  producto: string;
  cantidad: number;
  precio_unitario: number;
}

// ─── Componente ──────────────────────────────────────────────────────────────
export default function CobrarModal({ cuentaId, total, onClose, onCobrado }: Props) {
  const { imprimirPrecuenta } = usePrinter();

  const [metodo,          setMetodo]          = useState("Efectivo");
  const [aplicarServicio, setAplicarServicio] = useState(true);
  const [recibido,        setRecibido]        = useState(0);
  const [cobrando,        setCobrando]        = useState(false);
  const [descargarPDF,    setDescargarPDF]    = useState(false);
  const [imprimir,        setImprimir]        = useState(false);
  const [confirm,         setConfirm]         = useState<any>(null);

  // ── Lógica intacta ────────────────────────────────────────────────────────
  const servicio   = aplicarServicio ? total * 0.1 : 0;
  const totalFinal = total + servicio;
  const vuelto     = metodo === "Efectivo" ? Math.max(recibido - totalFinal, 0) : 0;
  const insuficiente = metodo === "Efectivo" && recibido > 0 && recibido < totalFinal;

  async function handleImprimirFactura(idCuenta: number) {
    const cfgRes     = await api.get("/configuracion");
    const cfg        = cfgRes.data;
    const detalleRes = await api.get(`/cuentas/${idCuenta}/detalle`);
    const items: DetalleCuenta[] = detalleRes.data;
    const sub = items.reduce((a, i) => a + i.cantidad * i.precio_unitario, 0);

    await imprimirPrecuenta({
      negocio:     cfg.nombre_negocio || "POSKEY",
      direccion:   cfg.direccion      || "",
      telefono:    cfg.telefono       || "",
      num_factura: String(idCuenta).padStart(6, "0"),
      fecha:       new Date().toLocaleString("es-CR"),
      cajero:      "",
      cliente:     "Consumidor Final",
      lineas: items.map(i => ({
        nombre:      i.producto,
        cantidad:    i.cantidad,
        precio_unit: i.precio_unitario,
        subtotal:    i.cantidad * i.precio_unitario,
      })),
      subtotal:    sub,
      impuesto:    0,
      total:       sub * 1.1,
      metodo_pago: metodo,
    });
  }

  async function cobrar() {
    if (metodo === "Efectivo" && recibido < totalFinal) {
      alert("El monto recibido es insuficiente.");
      return;
    }
    try {
      setCobrando(true);
      await api.post(`/cuentas/${cuentaId}/cerrar`, null, {
        params: { metodo, aplicar_servicio: aplicarServicio },
      });
      if (descargarPDF) await generarFacturaPDF(cuentaId);
      if (imprimir)     await handleImprimirFactura(cuentaId);
      onCobrado();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al procesar el cobro.");
    } finally {
      setCobrando(false);
    }
  }

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
      zIndex:         9999,
      padding:        20,
    }}>
      <div style={{
        width:        "560px",
        maxWidth:     "95vw",
        background:   C.surface,
        borderRadius: 20,
        overflow:     "hidden",
        boxShadow:    C.modalShadow,
        fontFamily:   "'Inter', system-ui, sans-serif",
        border:       `1px solid ${C.border}`,
        display:      "flex",
        flexDirection:"column",
      }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{
          padding:    "22px 28px",
          background: C.headerBg,
          borderBottom:`1px solid ${C.headerBorder}`,
          display:    "flex",
          alignItems: "center",
          gap:        16,
          flexShrink: 0,
        }}>
          <div style={{
            width:          46,
            height:         46,
            borderRadius:   13,
            background:     "rgba(5,150,105,0.18)",
            border:         "1.5px solid rgba(110,231,183,0.3)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            flexShrink:     0,
          }}>
            <Receipt size={22} color="#6ee7b7" strokeWidth={2} />
          </div>
          <div>
            <h2 style={{
              margin:        0,
              fontSize:      18,
              fontWeight:    800,
              letterSpacing: "-0.02em",
              color:         "#f8fafc",
              lineHeight:    1.2,
            }}>
              Cobrar Cuenta
            </h2>
            <p style={{
              margin:    0,
              marginTop: 3,
              fontSize:  12.5,
              color:     "#64748b",
              fontWeight:500,
            }}>
              Cuenta{" "}
              <span style={{
                color:        "#94a3b8",
                fontWeight:   700,
                background:   "rgba(255,255,255,0.08)",
                padding:      "1px 7px",
                borderRadius: 5,
                fontSize:     12,
                border:       "1px solid rgba(255,255,255,0.1)",
              }}>
                #{cuentaId}
              </span>
              {" "}· Confirmar pago
            </p>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div style={{
          padding:    "24px 28px",
          maxHeight:  "65vh",
          overflowY:  "auto",
          display:    "flex",
          flexDirection:"column",
          gap:        22,
        }}>

          {/* ── Resumen de totales ─────────────────────────────────────── */}
          <div style={{
            background:   C.resumeBg,
            border:       `1.5px solid ${C.resumeBorder}`,
            borderRadius: 14,
            overflow:     "hidden",
          }}>
            {/* Subtotal */}
            <div style={{
              padding:        "14px 18px",
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center",
              borderBottom:   `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 14, color: C.textSecondary, fontWeight: 500 }}>
                Subtotal
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
                ₡{total.toLocaleString()}
              </span>
            </div>

            {/* Toggle servicio */}
            <div style={{
              padding:        "12px 18px",
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center",
              borderBottom:   `1px solid ${C.border}`,
              background:     aplicarServicio ? C.accentSubtle : C.surfaceSubtle,
              transition:     "background 0.15s",
              cursor:         "pointer",
            }}
            onClick={() => setAplicarServicio(!aplicarServicio)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width:          30,
                  height:         30,
                  borderRadius:   8,
                  background:     aplicarServicio ? C.accentSubtle : "#f1f5f9",
                  border:         `1.5px solid ${aplicarServicio ? C.accentBorder : C.border}`,
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  flexShrink:     0,
                  transition:     "all 0.15s",
                }}>
                  <BadgePercent
                    size={15}
                    color={aplicarServicio ? C.accent : C.textMuted}
                    strokeWidth={2.2}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textLabel }}>
                    Cargo por servicio
                  </div>
                  <div style={{ fontSize: 11.5, color: C.textMuted, fontWeight: 500, marginTop: 1 }}>
                    10% sobre el subtotal
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  fontSize:   14,
                  fontWeight: 700,
                  color:      aplicarServicio ? C.accent : C.textMuted,
                  transition: "color 0.15s",
                }}>
                  ₡{servicio.toLocaleString()}
                </span>
                {/* Toggle pill */}
                <div style={{
                  width:        44,
                  height:       24,
                  borderRadius: 12,
                  background:   aplicarServicio ? C.accent : "#e2e8f0",
                  position:     "relative",
                  transition:   "background 0.2s",
                  flexShrink:   0,
                }}>
                  <div style={{
                    position:   "absolute",
                    top:        3,
                    left:       aplicarServicio ? 23 : 3,
                    width:      18,
                    height:     18,
                    borderRadius:"50%",
                    background: "white",
                    boxShadow:  "0 1px 4px rgba(0,0,0,0.18)",
                    transition: "left 0.2s",
                  }} />
                </div>
              </div>
            </div>

            {/* Total final */}
            <div style={{
              padding:        "18px 18px",
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center",
            }}>
              <span style={{
                fontSize:      13,
                fontWeight:    800,
                color:         C.textLabel,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}>
                Total a cobrar
              </span>
              <span style={{
                fontSize:      30,
                fontWeight:    800,
                color:         C.accent,
                letterSpacing: "-0.03em",
                lineHeight:    1,
              }}>
                ₡{totalFinal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ── Método de pago ────────────────────────────────────────── */}
          <div>
            <div style={{
              fontSize:      11,
              fontWeight:    800,
              color:         C.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom:  10,
            }}>
              Método de pago
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {METODOS.map(({ id: m, label, Icon }) => {
                const activo = metodo === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMetodo(m)}
                    style={{
                      flex:          1,
                      padding:       "14px 10px",
                      borderRadius:  12,
                      cursor:        "pointer",
                      border:        `2px solid ${activo ? C.metodoActiveBorder : C.metodoBorder}`,
                      background:    activo ? C.metodoActiveBg : C.metodoBg,
                      fontWeight:    700,
                      fontSize:      13,
                      color:         activo ? C.metodoActiveText : C.metodoText,
                      display:       "flex",
                      flexDirection: "column",
                      alignItems:    "center",
                      gap:           8,
                      transition:    "all 0.15s",
                      fontFamily:    "inherit",
                      boxShadow:     activo ? `0 0 0 3px ${C.accentShadow}` : "none",
                    }}
                  >
                    <div style={{
                      width:          36,
                      height:         36,
                      borderRadius:   10,
                      background:     activo ? C.accentSubtle : "#f1f5f9",
                      border:         `1.5px solid ${activo ? C.accentBorder : C.border}`,
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      transition:     "all 0.15s",
                    }}>
                      <Icon
                        size={17}
                        strokeWidth={2.2}
                        color={activo ? C.accent : C.textMuted}
                      />
                    </div>
                    {label}
                    {activo && (
                      <div style={{
                        width:        6,
                        height:       6,
                        borderRadius: "50%",
                        background:   C.accent,
                        marginTop:    -4,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Panel efectivo ────────────────────────────────────────── */}
          {metodo === "Efectivo" && (
            <div style={{
              background:   C.efectivoBg,
              border:       `1.5px solid ${insuficiente ? "#fca5a5" : C.efectivoBorder}`,
              borderRadius: 14,
              padding:      "18px",
              transition:   "border-color 0.2s",
            }}>
              <div style={{
                fontSize:      11,
                fontWeight:    800,
                color:         C.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom:  10,
              }}>
                Monto recibido
              </div>

              <div style={{ position: "relative" }}>
                <span style={{
                  position:  "absolute",
                  left:      15,
                  top:       "50%",
                  transform: "translateY(-50%)",
                  color:     C.textMuted,
                  fontWeight:800,
                  fontSize:  16,
                  pointerEvents:"none",
                }}>
                  ₡
                </span>
                <input
                  type="number"
                  value={recibido || ""}
                  placeholder="0"
                  onChange={e => setRecibido(Number(e.target.value))}
                  style={{
                    width:        "100%",
                    padding:      "14px 14px 14px 34px",
                    borderRadius: 10,
                    border:       `1.5px solid ${insuficiente ? "#fca5a5" : C.borderStrong}`,
                    fontSize:     22,
                    fontWeight:   800,
                    color:        C.textPrimary,
                    boxSizing:    "border-box",
                    fontFamily:   "inherit",
                    outline:      "none",
                    background:   C.surface,
                    transition:   "border-color 0.15s, box-shadow 0.15s",
                    letterSpacing:"-0.02em",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = C.accent;
                    e.currentTarget.style.boxShadow  = `0 0 0 3px ${C.accentShadow}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = insuficiente ? "#fca5a5" : C.borderStrong;
                    e.currentTarget.style.boxShadow   = "none";
                  }}
                />
              </div>

              {/* Monto insuficiente */}
              {insuficiente && (
                <p style={{
                  margin:     "8px 0 0",
                  fontSize:   12,
                  color:      "#dc2626",
                  fontWeight: 600,
                }}>
                  Faltan ₡{(totalFinal - recibido).toLocaleString()} para completar el pago
                </p>
              )}

              {/* Vuelto */}
              {recibido >= totalFinal && (
                <div style={{
                  marginTop:      14,
                  padding:        "14px 16px",
                  background:     C.vueltoBg,
                  border:         `1.5px solid ${C.vueltoBorder}`,
                  borderRadius:   12,
                  display:        "flex",
                  justifyContent: "space-between",
                  alignItems:     "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={16} color={C.accent} strokeWidth={2.2} />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: C.accentDeep }}>
                      Vuelto
                    </span>
                  </div>
                  <span style={{
                    fontSize:      22,
                    fontWeight:    800,
                    color:         C.accent,
                    letterSpacing: "-0.02em",
                  }}>
                    ₡{vuelto.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Opciones de factura ───────────────────────────────────── */}
          <div>
            <div style={{
              fontSize:      11,
              fontWeight:    800,
              color:         C.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom:  10,
            }}>
              Factura
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* PDF */}
              <div
                onClick={() => setDescargarPDF(!descargarPDF)}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  gap:            12,
                  padding:        "13px 16px",
                  borderRadius:   12,
                  background:     descargarPDF ? C.accentSubtle : C.surfaceSubtle,
                  border:         `1.5px solid ${descargarPDF ? C.accentBorder : C.border}`,
                  cursor:         "pointer",
                  transition:     "all 0.15s",
                  userSelect:     "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width:          34,
                    height:         34,
                    borderRadius:   9,
                    background:     descargarPDF ? C.accentSubtle : "#f1f5f9",
                    border:         `1.5px solid ${descargarPDF ? C.accentBorder : C.border}`,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    flexShrink:     0,
                    transition:     "all 0.15s",
                  }}>
                    <Download size={15} color={descargarPDF ? C.accent : C.textMuted} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textLabel }}>
                      Descargar factura PDF
                    </div>
                    <div style={{ fontSize: 11.5, color: C.textMuted, fontWeight: 500, marginTop: 2 }}>
                      Guarda el PDF en tu computadora
                    </div>
                  </div>
                </div>
                {/* Toggle */}
                <div style={{
                  width:        44,
                  height:       24,
                  borderRadius: 12,
                  background:   descargarPDF ? C.accent : "#e2e8f0",
                  position:     "relative",
                  transition:   "background 0.2s",
                  flexShrink:   0,
                }}>
                  <div style={{
                    position:   "absolute",
                    top:        3,
                    left:       descargarPDF ? 23 : 3,
                    width:      18,
                    height:     18,
                    borderRadius:"50%",
                    background: "white",
                    boxShadow:  "0 1px 4px rgba(0,0,0,0.18)",
                    transition: "left 0.2s",
                  }} />
                </div>
              </div>

              {/* Impresora */}
              <div
                onClick={() => setImprimir(!imprimir)}
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  gap:            12,
                  padding:        "13px 16px",
                  borderRadius:   12,
                  background:     imprimir ? C.accentSubtle : C.surfaceSubtle,
                  border:         `1.5px solid ${imprimir ? C.accentBorder : C.border}`,
                  cursor:         "pointer",
                  transition:     "all 0.15s",
                  userSelect:     "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width:          34,
                    height:         34,
                    borderRadius:   9,
                    background:     imprimir ? C.accentSubtle : "#f1f5f9",
                    border:         `1.5px solid ${imprimir ? C.accentBorder : C.border}`,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    flexShrink:     0,
                    transition:     "all 0.15s",
                  }}>
                    <Printer size={15} color={imprimir ? C.accent : C.textMuted} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textLabel }}>
                      Imprimir factura térmica
                    </div>
                    <div style={{ fontSize: 11.5, color: C.textMuted, fontWeight: 500, marginTop: 2 }}>
                      Envía a la impresora configurada
                    </div>
                  </div>
                </div>
                {/* Toggle */}
                <div style={{
                  width:        44,
                  height:       24,
                  borderRadius: 12,
                  background:   imprimir ? C.accent : "#e2e8f0",
                  position:     "relative",
                  transition:   "background 0.2s",
                  flexShrink:   0,
                }}>
                  <div style={{
                    position:   "absolute",
                    top:        3,
                    left:       imprimir ? 23 : 3,
                    width:      18,
                    height:     18,
                    borderRadius:"50%",
                    background: "white",
                    boxShadow:  "0 1px 4px rgba(0,0,0,0.18)",
                    transition: "left 0.2s",
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div style={{
          padding:        "18px 28px",
          borderTop:      `1px solid ${C.border}`,
          display:        "flex",
          justifyContent: "flex-end",
          gap:            10,
          background:     C.surfaceSubtle,
          flexShrink:     0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding:      "12px 22px",
              borderRadius: 10,
              border:       `1.5px solid ${C.btnCancelBorder}`,
              background:   C.btnCancelBg,
              color:        C.btnCancelText,
              fontWeight:   700,
              fontSize:     14,
              cursor:       "pointer",
              fontFamily:   "inherit",
              letterSpacing:"-0.01em",
              transition:   "background 0.12s, border-color 0.12s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background    = "#f1f5f9";
              e.currentTarget.style.borderColor   = "#cbd5e1";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background    = C.btnCancelBg;
              e.currentTarget.style.borderColor   = C.btnCancelBorder;
            }}
          >
            Cancelar
          </button>

          <button
            onClick={() => setConfirm({ accion: cobrar })}
            disabled={cobrando}
            style={{
              flex:         1,
              padding:      "13px 24px",
              border:       "none",
              borderRadius: 12,
              background:   cobrando ? C.cobrarDisabled : C.cobrarBg,
              color:        "white",
              fontWeight:   800,
              fontSize:     15,
              cursor:       cobrando ? "default" : "pointer",
              fontFamily:   "inherit",
              letterSpacing:"-0.02em",
              boxShadow:    cobrando ? "none" : `0 6px 20px ${C.cobrarShadow}`,
              transition:   "all 0.15s",
              display:      "flex",
              alignItems:   "center",
              justifyContent:"center",
              gap:          9,
            }}
            onMouseEnter={e => {
              if (!cobrando) {
                e.currentTarget.style.background  = C.cobrarHover;
                e.currentTarget.style.transform   = "translateY(-1px)";
                e.currentTarget.style.boxShadow   = `0 8px 24px ${C.cobrarShadow}`;
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background    = cobrando ? C.cobrarDisabled : C.cobrarBg;
              e.currentTarget.style.transform     = "translateY(0)";
              e.currentTarget.style.boxShadow     = cobrando ? "none" : `0 6px 20px ${C.cobrarShadow}`;
            }}
          >
            <Receipt size={17} strokeWidth={2.2} color={cobrando ? "#a7f3d0" : "white"} />
            {cobrando ? "Procesando…" : "Cobrar Cuenta"}
          </button>
        </div>
      </div>

      {/* ── ConfirmModal (sin tocar) ──────────────────────────────────── */}
      {confirm && (
        <ConfirmModal
          titulo="Cobrar cuenta"
          descripcion={`Total: ₡${totalFinal.toLocaleString()} · Método: ${metodo}`}
          tipo="money"
          textoConfirmar="Cobrar"
          onConfirmar={() => { confirm.accion(); setConfirm(null); }}
          onCancelar={() => setConfirm(null)}
        />
      )}
    </div>
  );
}