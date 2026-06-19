import { useEffect, useState } from "react";
import { api } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import {
  Search, X, Pencil, Trash2,
  DollarSign, Plus, UtensilsCrossed,
} from "lucide-react";

interface Producto {
  id: number;
  nombre: string;
  precio: number;
}

// ── Paleta (idéntica a Ventas.tsx) ───────────────────────────
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
  blueMid:  "#d5dff4",
  blueB:    "#afc1e8",
  red:      "#b91c1c",
  redLt:    "#fef2f2",
  redMid:   "#fecaca",
  slate:    "#111827",
  text:     "#1f2937",
  muted:    "#6b7280",
  dim:      "#9ca3af",
  dimB:     "#d1d5db",
};

export default function Productos() {
  const [productos, setProductos]     = useState<Producto[]>([]);
  const [busqueda, setBusqueda]       = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando]       = useState<Producto | null>(null);
  const [nombre, setNombre]           = useState("");
  const [precio, setPrecio]           = useState("");
  const [guardando, setGuardando]     = useState(false);

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const [confirm, setConfirm] = useState<{
    titulo: string;
    descripcion?: string;
    tipo?: "default" | "warning" | "danger";
    textoCon?: string;
    accion: () => void;
  } | null>(null);

  const [confirmar2, setConfirmar2] = useState<{
    accion: () => void;
  } | null>(null);

  async function cargarProductos() {
    const res = await api.get("/productos");
    setProductos(res.data);
  }

  function abrirCrear() {
    setEditando(null);
    setNombre("");
    setPrecio("");
    setMostrarModal(true);
  }

  function abrirEditar(producto: Producto) {
    setEditando(producto);
    setNombre(producto.nombre);
    setPrecio(String(producto.precio));
    setMostrarModal(true);
  }

  function cerrarModal() {
    setMostrarModal(false);
    setEditando(null);
    setNombre("");
    setPrecio("");
  }

  async function guardarProducto() {
    if (!nombre.trim()) return;
    if (!precio) return;

    setConfirm({
      titulo: editando ? "Actualizar precio" : "Crear producto",
      descripcion: editando
        ? `${editando.nombre} · ₡${editando.precio.toLocaleString()} → ₡${Number(precio).toLocaleString()}`
        : `${nombre} · ₡${Number(precio).toLocaleString()}`,
      tipo: "default",
      textoCon: editando ? "Actualizar" : "Crear",
      accion: async () => {
        try {
          setGuardando(true);
          if (editando) {
            await api.put(`/productos/${editando.id}`, {
              nombre: editando.nombre,
              precio: Number(precio),
            });
          } else {
            await api.post("/productos", {
              nombre,
              precio: Number(precio),
            });
          }
          cerrarModal();
          cargarProductos();
        } catch (error) {
          console.error(error);
          alert("Error al guardar el producto");
        } finally {
          setGuardando(false);
        }
      },
    });
  }

  async function eliminarProducto(producto: Producto) {
    setConfirm({
      titulo: "Eliminar producto",
      descripcion: `"${producto.nombre}" será removido permanentemente del catálogo`,
      tipo: "danger",
      textoCon: "Sí, eliminar",
      accion: () => {
        setConfirmar2({
          accion: async () => {
            try {
              await api.delete(`/productos/${producto.id}`);
              cargarProductos();
            } catch (error) {
              console.error(error);
            }
          },
        });
      },
    });
  }

  useEffect(() => {
    cargarProductos();
  }, []);

  const disabledGuardar = guardando || (!editando && !nombre.trim()) || !precio;

  return (
    <div style={{
      padding: "20px 24px",
      fontFamily: "'Inter', system-ui, sans-serif",
      background: C.bg,
      height: "100vh",
      overflowY: "auto",
      boxSizing: "border-box",
      color: C.text,
    }}>

      {/* ── ENCABEZADO ── */}
      <div style={{
        marginBottom: 20,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap",
        paddingBottom: 16,
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
            flexShrink: 0,
          }}>
            <UtensilsCrossed size={18} />
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 800,
              color: C.slate,
              letterSpacing: "-0.3px",
            }}>
              Productos
            </h1>
            <p style={{ margin: "1px 0 0", fontSize: 11, color: C.muted }}>
              {productosFiltrados.length}{" "}
              {productosFiltrados.length === 1 ? "producto" : "productos"}
              {busqueda ? " encontrados" : " en el catálogo"}
            </p>
          </div>
        </div>

        <button
          onClick={abrirCrear}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: C.green,
            color: "white",
            border: "none",
            padding: "9px 18px",
            borderRadius: 9,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(22,135,61,0.2)",
            whiteSpace: "nowrap",
            letterSpacing: "0.01em",
          }}
        >
          <Plus size={15} />
          Nuevo producto
        </button>
      </div>

      {/* ── BUSCADOR ── */}
      <div style={{ marginBottom: 14, position: "relative" }}>
        <div style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: C.dim,
          display: "flex",
          pointerEvents: "none",
        }}>
          <Search size={15} />
        </div>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 36px 10px 38px",
            borderRadius: 9,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            boxSizing: "border-box",
            outline: "none",
            background: C.card,
            color: C.text,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda("")}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.dim,
              display: "flex",
              alignItems: "center",
              padding: 2,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── TABLA ── */}
      <div style={{
        background: C.card,
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${C.border}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        {productosFiltrados.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "52px 10px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            color: C.muted,
          }}>
            {busqueda
              ? <Search size={32} color={C.dimB} />
              : <UtensilsCrossed size={32} color={C.dimB} />}
            <p style={{ margin: 0, fontSize: 14 }}>
              {busqueda
                ? `Sin resultados para "${busqueda}"`
                : "No hay productos registrados todavía"}
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                {[
                  { label: "ID",      align: "left",  width: 72  },
                  { label: "Nombre",  align: "left",  width: undefined },
                  { label: "Precio",  align: "right", width: 130 },
                  { label: "Acciones",align: "right", width: 160 },
                ].map(h => (
                  <th key={h.label} style={{
                    textAlign: h.align as any,
                    padding: "11px 16px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    width: h.width,
                  }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {productosFiltrados.map((producto, index) => (
                <tr
                  key={producto.id}
                  style={{
                    borderBottom: index === productosFiltrados.length - 1 ? "none" : `1px solid ${C.border2}`,
                    transition: "background 0.1s",
                    background: "transparent",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.greenLt)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 16px", color: C.dim, fontFamily: "monospace", fontSize: 12 }}>
                    #{producto.id}
                  </td>
                  <td style={{ padding: "12px 16px", color: C.text, fontWeight: 600 }}>
                    {producto.nombre}
                  </td>
                  <td style={{
                    padding: "12px 16px",
                    textAlign: "right",
                    color: C.green,
                    fontWeight: 800,
                    fontSize: 14,
                  }}>
                    ₡{producto.precio.toLocaleString()}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <button
                        onClick={() => abrirEditar(producto)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          background: C.blueLt,
                          color: C.blue,
                          border: `1px solid ${C.blueMid}`,
                          padding: "6px 11px",
                          borderRadius: 7,
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        <Pencil size={12} /> Precio
                      </button>

                      <button
                        onClick={() => eliminarProducto(producto)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          background: C.redLt,
                          color: C.red,
                          border: `1px solid ${C.redMid}`,
                          padding: "6px 11px",
                          borderRadius: 7,
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── MODAL CREAR / EDITAR ── */}
      {mostrarModal && (
        <div
          onClick={cerrarModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(17,24,39,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 420,
              maxWidth: "95vw",
              background: C.card,
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            {/* Cabecera modal — slate, igual que modal de Ventas */}
            <div style={{
              background: C.slate,
              padding: "18px 22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.8)",
                  flexShrink: 0,
                }}>
                  {editando ? <DollarSign size={17} /> : <UtensilsCrossed size={17} />}
                </div>
                <div>
                  <div style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}>
                    {editando ? `#${editando.id}` : "Catálogo"}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>
                    {editando ? "Editar precio" : "Nuevo producto"}
                  </div>
                </div>
              </div>

              <button
                onClick={cerrarModal}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 30, height: 30,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 7,
                  color: "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 22px" }}>
              {/* Nombre — solo al crear */}
              {!editando && (
                <>
                  <label style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    marginBottom: 7,
                  }}>
                    Nombre del producto
                  </label>
                  <input
                    placeholder="Ej. Casado de pollo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 13px",
                      borderRadius: 9,
                      border: `1px solid ${C.border}`,
                      fontSize: 13,
                      boxSizing: "border-box",
                      outline: "none",
                      color: C.text,
                      marginBottom: 16,
                    }}
                  />
                </>
              )}

              {/* Precio actual — solo al editar */}
              {editando && (
                <div style={{
                  background: C.greenLt,
                  border: `1px solid ${C.greenMid}`,
                  borderRadius: 9,
                  padding: "10px 14px",
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Precio actual</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: C.green }}>
                    ₡{editando.precio.toLocaleString()}
                  </span>
                </div>
              )}

              <label style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 7,
              }}>
                {editando ? "Nuevo precio" : "Precio"}
              </label>

              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: C.dim,
                  fontWeight: 700,
                  fontSize: 14,
                  userSelect: "none",
                }}>
                  ₡
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "10px 13px 10px 28px",
                    borderRadius: 9,
                    border: `1px solid ${C.border}`,
                    fontSize: 13,
                    boxSizing: "border-box",
                    outline: "none",
                    color: C.text,
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: "flex",
              gap: 8,
              padding: "14px 22px",
              borderTop: `1px solid ${C.border}`,
              background: C.cardB,
            }}>
              <button
                onClick={cerrarModal}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 9,
                  border: `1px solid ${C.border}`,
                  background: C.card,
                  color: C.muted,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                onClick={guardarProducto}
                disabled={disabledGuardar}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  padding: "10px 0",
                  borderRadius: 9,
                  border: "none",
                  background: disabledGuardar ? C.greenB : C.green,
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: disabledGuardar ? "default" : "pointer",
                  boxShadow: disabledGuardar ? "none" : "0 2px 8px rgba(22,135,61,0.2)",
                  transition: "all 0.15s",
                }}
              >
                {guardando
                  ? "Guardando…"
                  : editando
                  ? <><DollarSign size={14} /> Guardar precio</>
                  : <><Plus size={14} /> Crear producto</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modales de confirmación ── */}
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

      {confirmar2 && (
        <ConfirmModal
          titulo="¿Está completamente seguro?"
          descripcion="Esta acción no se puede deshacer"
          tipo="danger"
          textoConfirmar="Eliminar definitivamente"
          onConfirmar={() => {
            confirmar2.accion();
            setConfirmar2(null);
          }}
          onCancelar={() => setConfirmar2(null)}
        />
      )}
    </div>
  );
}