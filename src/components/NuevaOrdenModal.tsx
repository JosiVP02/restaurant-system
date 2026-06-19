import { useEffect, useState } from "react";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import {
  Zap,
  ClipboardList,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ChefHat,
  CreditCard,
} from "lucide-react";

// ─── Paleta base (slate/zinc) ───────────────────────────────────────────────
const BASE = {
  overlay:       "rgba(15,23,42,0.62)",
  surface:       "#ffffff",
  surfaceSubtle: "#f8fafc",
  border:        "#e2e8f0",
  borderInput:   "#cbd5e1",

  textPrimary:   "#0f172a",
  textSecondary: "#475569",
  textMuted:     "#94a3b8",
  textLabel:     "#334155",

  btnCancelBg:   "#ffffff",
  btnCancelBorder:"#e2e8f0",
  btnCancelText: "#475569",

  modalShadow:   "0 32px 80px rgba(15,23,42,0.24), 0 4px 20px rgba(15,23,42,0.08)",

  // Estado vacío / carrito
  emptyBg:       "#f8fafc",

  // Controles cantidad
  qtyBg:         "#f1f5f9",
  qtyBorder:     "#e2e8f0",
  qtyText:       "#334155",

  // Eliminar
  deleteBg:      "#fef2f2",
  deleteBorder:  "#fecaca",
  deleteText:    "#dc2626",

  // Producto card
  cardBg:        "#f8fafc",
  cardBorder:    "#e2e8f0",

  // Panel orden
  panelBg:       "#f8fafc",
  panelBorder:   "#e2e8f0",
  itemBg:        "#ffffff",
  itemBorder:    "#e2e8f0",
};

// ─── Acento dinámico por modo ───────────────────────────────────────────────
function getAccent(esDirecto: boolean) {
  return esDirecto
    ? {
        primary:     "#2563eb",
        hover:       "#1d4ed8",
        subtle:      "#eff6ff",
        border:      "#bfdbfe",
        shadow:      "rgba(37,99,235,0.22)",
        iconBg:      "#eff6ff",
        iconBorder:  "#bfdbfe",
        badgeBg:     "#2563eb",
        disabledBg:  "#dbeafe",
        disabledText:"#93c5fd",
      }
    : {
        primary:     "#059669",
        hover:       "#047857",
        subtle:      "#ecfdf5",
        border:      "#6ee7b7",
        shadow:      "rgba(5,150,105,0.22)",
        iconBg:      "#f0fdf4",
        iconBorder:  "#bbf7d0",
        badgeBg:     "#059669",
        disabledBg:  "#d1fae5",
        disabledText:"#6ee7b7",
      };
}

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface Producto {
  id: number;
  nombre: string;
  precio: number;
}

interface Props {
  mesaId: number;
  cuentaId: number;
  modo?: "cocina" | "directo";
  onClose: () => void;
  onOrdenCreada: (nuevoCuentaId?: number) => void;
}

interface ItemOrden {
  id: number;
  productoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  observacion: string;
}

// ─── Componente ─────────────────────────────────────────────────────────────
export default function NuevaOrdenModal({
  mesaId,
  cuentaId,
  modo = "cocina",
  onClose,
  onOrdenCreada,
}: Props) {
  const [productos, setProductos]   = useState<Producto[]>([]);
  const [busqueda, setBusqueda]     = useState("");
  const [orden, setOrden]           = useState<ItemOrden[]>([]);
  const [guardando, setGuardando]   = useState(false);

  const [confirm, setConfirm] = useState<{
    titulo: string;
    descripcion?: string;
    tipo?: "default" | "warning" | "danger";
    textoCon?: string;
    accion: () => void;
  } | null>(null);

  // ── Lógica intacta ────────────────────────────────────────────────────────
  async function cargarProductos() {
    try {
      const res = await api.get("/productos");
      setProductos(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => { cargarProductos(); }, []);

  function agregarProducto(producto: Producto) {
    setOrden([
      ...orden,
      {
        id: Date.now() + Math.random(),
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: 1,
        observacion: "",
      },
    ]);
  }

  function aumentarCantidad(id: number) {
    setOrden(orden.map((item) =>
      item.id === id ? { ...item, cantidad: item.cantidad + 1 } : item
    ));
  }

  function disminuirCantidad(id: number) {
    setOrden(
      orden
        .map((item) => item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item)
        .filter((item) => item.cantidad > 0)
    );
  }

  function eliminarProducto(id: number) {
    setOrden(orden.filter((item) => item.id !== id));
  }

  async function crearOrden() {
    if (orden.length === 0) return;
    setConfirm({
      titulo: esDirecto ? "Agregar a cuenta" : "Enviar orden a cocina",
      descripcion: `${cantidadTotal} ${cantidadTotal === 1 ? "item" : "items"} · ₡${total.toLocaleString()}`,
      tipo: "default",
      textoCon: esDirecto ? "Agregar" : "Enviar",
      accion: async () => {
        try {
          setGuardando(true);
          let idCuentaActual = cuentaId;
          if (!idCuentaActual) {
            const res = await api.post(`/cuentas/abrir/${mesaId}`);
            idCuentaActual = Number(res.data.id);
            if (!idCuentaActual) {
              alert("No se pudo crear la cuenta. Intente nuevamente.");
              return;
            }
          }
          const endpoint =
            modo === "cocina"
              ? `/cuentas/${idCuentaActual}/agregar-productos`
              : `/cuentas/${idCuentaActual}/agregar-directo`;
          await api.post(endpoint, {
            productos: orden.map((item) => ({
              producto_id: item.productoId,
              cantidad: item.cantidad,
              observacion: item.observacion,
            })),
          });
          onOrdenCreada(idCuentaActual);
          onClose();
        } catch (error) {
          console.error(error);
          alert("Error al crear la orden");
        } finally {
          setGuardando(false);
        }
      },
    });
  }

  function handleCancelar() {
    if (orden.length === 0) { onClose(); return; }
    setConfirm({
      titulo: "¿Descartar orden?",
      descripcion: "Perderás los productos seleccionados",
      tipo: "danger",
      textoCon: "Descartar",
      accion: onClose,
    });
  }

  // ── Derivados ─────────────────────────────────────────────────────────────
  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const total         = orden.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  const cantidadTotal = orden.reduce((acc, item) => acc + item.cantidad, 0);
  const esDirecto     = modo === "directo";
  const A             = getAccent(esDirecto);
  const btnActive     = !guardando && orden.length > 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     BASE.overlay,
        backdropFilter: "blur(3px)",
        display:        "flex",
        justifyContent: "center",
        alignItems:     "center",
        zIndex:         9999,
        padding:        20,
      }}
    >
      <div
        style={{
          width:        "1200px",
          maxWidth:     "95vw",
          height:       "750px",
          maxHeight:    "92vh",
          background:   BASE.surface,
          borderRadius: 20,
          overflow:     "hidden",
          display:      "flex",
          flexDirection:"column",
          boxShadow:    BASE.modalShadow,
          fontFamily:   "'Inter', system-ui, sans-serif",
          border:       `1px solid ${BASE.border}`,
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            padding:      "20px 28px",
            borderBottom: `1px solid ${BASE.border}`,
            display:      "flex",
            alignItems:   "center",
            gap:          16,
            background:   BASE.surface,
            flexShrink:   0,
          }}
        >
          {/* Icono modo */}
          <div
            style={{
              width:          46,
              height:         46,
              borderRadius:   13,
              background:     A.iconBg,
              border:         `1.5px solid ${A.iconBorder}`,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
            }}
          >
            {esDirecto
              ? <Zap size={20} color={A.primary} strokeWidth={2.2} />
              : <ClipboardList size={20} color={A.primary} strokeWidth={2.2} />
            }
          </div>

          <div style={{ flex: 1 }}>
            <h2
              style={{
                margin:        0,
                fontSize:      18,
                fontWeight:    800,
                letterSpacing: "-0.02em",
                color:         BASE.textPrimary,
                lineHeight:    1.2,
              }}
            >
              {esDirecto ? "Agregar a Cuenta" : "Nueva Orden"}
            </h2>
            <p style={{ margin: 0, marginTop: 3, fontSize: 12.5, color: BASE.textMuted, fontWeight: 500 }}>
              Mesa{" "}
              <span style={{
                color: BASE.textSecondary, fontWeight: 700,
                background: "#f1f5f9", padding: "1px 7px",
                borderRadius: 5, fontSize: 12, border: `1px solid ${BASE.border}`,
              }}>
                {mesaId}
              </span>
              {cuentaId ? (
                <>
                  {" "}· Cuenta{" "}
                  <span style={{
                    color: BASE.textSecondary, fontWeight: 700,
                    background: "#f1f5f9", padding: "1px 7px",
                    borderRadius: 5, fontSize: 12, border: `1px solid ${BASE.border}`,
                  }}>
                    #{cuentaId}
                  </span>
                </>
              ) : null}
              {!esDirecto && (
                <span style={{
                  marginLeft: 8,
                  background: A.subtle,
                  color: A.primary,
                  border: `1px solid ${A.border}`,
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "1px 8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  verticalAlign: "middle",
                }}>
                  <ChefHat size={10} strokeWidth={2.5} /> Envío a cocina
                </span>
              )}
              {esDirecto && (
                <span style={{
                  marginLeft: 8,
                  background: A.subtle,
                  color: A.primary,
                  border: `1px solid ${A.border}`,
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "1px 8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  verticalAlign: "middle",
                }}>
                  <CreditCard size={10} strokeWidth={2.5} /> Directo a cuenta
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ── Contenido ──────────────────────────────────────────────────── */}
        <div
          style={{
            flex:               1,
            display:            "grid",
            gridTemplateColumns:"2fr 1fr",
            gap:                20,
            padding:            "20px 28px",
            overflow:           "hidden",
            minHeight:          0,
          }}
        >
          {/* ── Panel izquierdo: Productos ─────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

            {/* Buscador */}
            <div style={{ position: "relative", marginBottom: 14, flexShrink: 0 }}>
              <Search
                size={15}
                color={BASE.textMuted}
                strokeWidth={2.2}
                style={{
                  position: "absolute",
                  left: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="Buscar producto…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  width:        "100%",
                  padding:      "11px 14px 11px 38px",
                  borderRadius: 10,
                  border:       `1.5px solid ${BASE.borderInput}`,
                  fontSize:     14,
                  fontWeight:   500,
                  color:        BASE.textPrimary,
                  boxSizing:    "border-box",
                  outline:      "none",
                  background:   BASE.surface,
                  fontFamily:   "inherit",
                  boxShadow:    "0 1px 2px rgba(15,23,42,0.05)",
                  transition:   "border-color 0.15s, box-shadow 0.15s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = A.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${A.shadow}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = BASE.borderInput;
                  e.currentTarget.style.boxShadow = "0 1px 2px rgba(15,23,42,0.05)";
                }}
              />
            </div>

            {/* Grid de productos */}
            <div
              style={{
                display:       "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
                gap:           11,
                overflowY:     "auto",
                paddingRight:  4,
                alignContent:  "flex-start",
                flex:          1,
                minHeight:     0,
              }}
            >
              {productosFiltrados.length === 0 && (
                <div style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "48px 0",
                  gap: 10,
                  color: BASE.textMuted,
                }}>
                  <Search size={28} color={BASE.textMuted} strokeWidth={1.5} />
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 500 }}>
                    No se encontraron productos
                  </p>
                </div>
              )}

              {productosFiltrados.map((producto) => (
                <div
                  key={producto.id}
                  onClick={() => agregarProducto(producto)}
                  style={{
                    background:   BASE.cardBg,
                    border:       `1.5px solid ${BASE.cardBorder}`,
                    borderRadius: 13,
                    padding:      "14px 15px",
                    cursor:       "pointer",
                    transition:   "transform 0.12s, box-shadow 0.12s, border-color 0.12s, background 0.12s",
                    display:      "flex",
                    flexDirection:"column",
                    gap:          6,
                    userSelect:   "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform   = "translateY(-2px)";
                    e.currentTarget.style.boxShadow   = `0 8px 20px rgba(15,23,42,0.10)`;
                    e.currentTarget.style.borderColor = A.primary;
                    e.currentTarget.style.background  = A.subtle;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform   = "translateY(0)";
                    e.currentTarget.style.boxShadow   = "none";
                    e.currentTarget.style.borderColor = BASE.cardBorder;
                    e.currentTarget.style.background  = BASE.cardBg;
                  }}
                >
                  <div style={{
                    fontWeight:   700,
                    fontSize:     13.5,
                    color:        BASE.textPrimary,
                    lineHeight:   1.35,
                  }}>
                    {producto.nombre}
                  </div>
                  <div style={{
                    color:      A.primary,
                    fontWeight: 800,
                    fontSize:   15,
                    letterSpacing: "-0.01em",
                  }}>
                    ₡{producto.precio.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Panel derecho: Orden ───────────────────────────────────── */}
          <div
            style={{
              background:    BASE.panelBg,
              border:        `1.5px solid ${BASE.panelBorder}`,
              borderRadius:  14,
              padding:       "18px",
              display:       "flex",
              flexDirection: "column",
              overflow:      "hidden",
              minHeight:     0,
            }}
          >
            {/* Cabecera panel orden */}
            <div style={{
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center",
              marginBottom:   14,
              flexShrink:     0,
            }}>
              <span style={{
                fontSize:      11,
                fontWeight:    800,
                color:         BASE.textLabel,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}>
                Orden Actual
              </span>

              {cantidadTotal > 0 && (
                <span style={{
                  background:   A.badgeBg,
                  color:        "white",
                  fontSize:     11,
                  fontWeight:   700,
                  borderRadius: 20,
                  padding:      "3px 10px",
                  letterSpacing:"0.01em",
                }}>
                  {cantidadTotal} {cantidadTotal === 1 ? "item" : "items"}
                </span>
              )}
            </div>

            {/* Lista ítems */}
            <div style={{ flex: 1, overflowY: "auto", paddingRight: 2, minHeight: 0 }}>

              {/* Estado vacío */}
              {orden.length === 0 && (
                <div style={{
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  justifyContent: "center",
                  height:         "100%",
                  gap:            10,
                  color:          BASE.textMuted,
                  padding:        "0 10px",
                }}>
                  <div style={{
                    width:          56,
                    height:         56,
                    borderRadius:   16,
                    background:     BASE.surface,
                    border:         `1.5px solid ${BASE.border}`,
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                  }}>
                    <ShoppingCart size={24} color={BASE.textMuted} strokeWidth={1.5} />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, textAlign: "center", lineHeight: 1.5 }}>
                    Seleccione productos<br />para agregar a la orden
                  </p>
                </div>
              )}

              {/* Ítems de la orden */}
              {orden.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background:   BASE.itemBg,
                    border:       `1.5px solid ${BASE.itemBorder}`,
                    borderRadius: 12,
                    padding:      "12px 13px",
                    marginBottom: 9,
                  }}
                >
                  {/* Nombre + precio */}
                  <div style={{
                    display:        "flex",
                    justifyContent: "space-between",
                    alignItems:     "flex-start",
                    marginBottom:   10,
                    gap:            8,
                  }}>
                    <span style={{
                      fontSize:   13.5,
                      fontWeight: 700,
                      color:      BASE.textPrimary,
                      lineHeight: 1.3,
                      flex:       1,
                    }}>
                      {item.nombre}
                    </span>
                    <span style={{
                      fontWeight:    800,
                      color:         A.primary,
                      fontSize:      14,
                      flexShrink:    0,
                      letterSpacing: "-0.01em",
                    }}>
                      ₡{(item.precio * item.cantidad).toLocaleString()}
                    </span>
                  </div>

                  {/* Controles cantidad + eliminar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

                    {/* Stepper */}
                    <div style={{
                      display:      "flex",
                      alignItems:   "center",
                      border:       `1.5px solid ${BASE.qtyBorder}`,
                      borderRadius: 9,
                      overflow:     "hidden",
                      flexShrink:   0,
                    }}>
                      <button
                        onClick={() => disminuirCantidad(item.id)}
                        style={{
                          width:      30,
                          height:     30,
                          border:     "none",
                          background: BASE.qtyBg,
                          cursor:     "pointer",
                          display:    "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color:      BASE.qtyText,
                          flexShrink: 0,
                        }}
                      >
                        <Minus size={13} strokeWidth={2.5} />
                      </button>

                      <span style={{
                        width:      32,
                        textAlign:  "center",
                        fontWeight: 800,
                        fontSize:   14,
                        color:      BASE.textPrimary,
                        background: BASE.surface,
                        lineHeight: "30px",
                        borderLeft: `1px solid ${BASE.qtyBorder}`,
                        borderRight:`1px solid ${BASE.qtyBorder}`,
                      }}>
                        {item.cantidad}
                      </span>

                      <button
                        onClick={() => aumentarCantidad(item.id)}
                        style={{
                          width:      30,
                          height:     30,
                          border:     "none",
                          background: BASE.qtyBg,
                          cursor:     "pointer",
                          display:    "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color:      BASE.qtyText,
                          flexShrink: 0,
                        }}
                      >
                        <Plus size={13} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Precio unitario */}
                    <span style={{
                      fontSize:   12,
                      color:      BASE.textMuted,
                      fontWeight: 500,
                      flex:       1,
                    }}>
                      ₡{item.precio.toLocaleString()} c/u
                    </span>

                    {/* Eliminar */}
                    <button
                      onClick={() => eliminarProducto(item.id)}
                      title="Eliminar producto"
                      style={{
                        width:          30,
                        height:         30,
                        border:         `1.5px solid ${BASE.deleteBorder}`,
                        background:     BASE.deleteBg,
                        color:          BASE.deleteText,
                        borderRadius:   9,
                        cursor:         "pointer",
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        flexShrink:     0,
                        transition:     "background 0.12s, border-color 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background    = "#fee2e2";
                        e.currentTarget.style.borderColor   = "#fca5a5";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background    = BASE.deleteBg;
                        e.currentTarget.style.borderColor   = BASE.deleteBorder;
                      }}
                    >
                      <Trash2 size={13} strokeWidth={2.2} />
                    </button>
                  </div>

                  {/* Observación */}
                  <textarea
                    placeholder="Observaciones para cocina…"
                    value={item.observacion}
                    onChange={(e) =>
                      setOrden(orden.map((o) =>
                        o.id === item.id ? { ...o, observacion: e.target.value } : o
                      ))
                    }
                    rows={2}
                    style={{
                      width:       "100%",
                      marginTop:   10,
                      padding:     "8px 10px",
                      borderRadius:8,
                      border:      `1.5px solid ${BASE.border}`,
                      resize:      "none",
                      fontSize:    12,
                      color:       BASE.textSecondary,
                      boxSizing:   "border-box",
                      fontFamily:  "inherit",
                      background:  BASE.surfaceSubtle,
                      outline:     "none",
                      transition:  "border-color 0.12s",
                      lineHeight:  1.5,
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = A.border; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = BASE.border; }}
                  />
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{
              borderTop:      `1.5px solid ${BASE.border}`,
              paddingTop:     16,
              marginTop:      6,
              flexShrink:     0,
            }}>
              <div style={{
                display:        "flex",
                justifyContent: "space-between",
                alignItems:     "baseline",
              }}>
                <span style={{
                  fontSize:   13,
                  fontWeight: 700,
                  color:      BASE.textLabel,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  Total
                </span>
                <span style={{
                  fontSize:      26,
                  fontWeight:    800,
                  color:         orden.length > 0 ? A.primary : BASE.textMuted,
                  letterSpacing: "-0.03em",
                  lineHeight:    1,
                  transition:    "color 0.2s",
                }}>
                  ₡{total.toLocaleString()}
                </span>
              </div>

              {cantidadTotal > 0 && (
                <p style={{
                  margin:     "4px 0 0 0",
                  fontSize:   11.5,
                  color:      BASE.textMuted,
                  textAlign:  "right",
                  fontWeight: 500,
                }}>
                  {cantidadTotal} {cantidadTotal === 1 ? "producto" : "productos"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div
          style={{
            borderTop:      `1px solid ${BASE.border}`,
            padding:        "16px 28px",
            display:        "flex",
            justifyContent: "flex-end",
            gap:            10,
            background:     BASE.surfaceSubtle,
            flexShrink:     0,
          }}
        >
          <button
            onClick={handleCancelar}
            style={{
              padding:      "12px 24px",
              borderRadius: 10,
              border:       `1.5px solid ${BASE.btnCancelBorder}`,
              background:   BASE.btnCancelBg,
              color:        BASE.btnCancelText,
              fontWeight:   700,
              fontSize:     14,
              cursor:       "pointer",
              fontFamily:   "inherit",
              letterSpacing:"-0.01em",
              transition:   "background 0.12s, border-color 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background    = "#f1f5f9";
              e.currentTarget.style.borderColor   = "#cbd5e1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background    = BASE.btnCancelBg;
              e.currentTarget.style.borderColor   = BASE.btnCancelBorder;
            }}
          >
            Cancelar
          </button>

          <button
            onClick={crearOrden}
            disabled={!btnActive}
            style={{
              background:   btnActive ? A.primary : A.disabledBg,
              color:        btnActive ? "#ffffff" : A.disabledText,
              border:       "none",
              borderRadius: 10,
              padding:      "12px 28px",
              cursor:       btnActive ? "pointer" : "default",
              fontWeight:   700,
              fontSize:     14,
              fontFamily:   "inherit",
              letterSpacing:"-0.01em",
              boxShadow:    btnActive ? `0 4px 14px ${A.shadow}` : "none",
              transition:   "all 0.15s",
              display:      "flex",
              alignItems:   "center",
              gap:          8,
            }}
          >
            {esDirecto
              ? <CreditCard size={15} strokeWidth={2.2} color={btnActive ? "#fff" : A.disabledText} />
              : <ChefHat   size={15} strokeWidth={2.2} color={btnActive ? "#fff" : A.disabledText} />
            }
            {guardando
              ? "Guardando…"
              : esDirecto
              ? "Agregar a Cuenta"
              : "Enviar a Cocina"
            }
          </button>
        </div>
      </div>

      {/* ── ConfirmModal (sin tocar) ────────────────────────────────────── */}
      {confirm && (
        <ConfirmModal
          titulo={confirm.titulo}
          descripcion={confirm.descripcion}
          tipo={confirm.tipo}
          textoConfirmar={confirm.textoCon}
          onConfirmar={() => {
            confirm.accion();
            setConfirm(null);
          }}
          onCancelar={() => setConfirm(null)}
        />
      )}
    </div>
  );
}