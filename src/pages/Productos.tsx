import { useEffect, useState } from "react";
import { api } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";





interface Producto {
  id: number;
  nombre: string;
  precio: number;
}

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [guardando, setGuardando] = useState(false);

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
      // Al confirmar el primero, abre el segundo
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

  return (
      <div
        style={{
          padding: "28px 32px",
          fontFamily: "'Inter', system-ui, sans-serif",
          background: "#f4f6f5",

          height: "100vh",
          overflowY: "auto",

          boxSizing: "border-box",
        }}
      >
      {/* ENCABEZADO */}
      <div
        style={{
          marginBottom: 22,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 800,
              color: "#1f2937",
              letterSpacing: "-0.01em",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            🍔 Productos
          </h1>
          <p style={{ margin: 0, marginTop: 4, fontSize: 14, color: "#94a3b8" }}>
            {productosFiltrados.length}{" "}
            {productosFiltrados.length === 1 ? "producto" : "productos"}
            {busqueda ? " encontrados" : " en el catálogo"}
          </p>
        </div>

        <button
          onClick={abrirCrear}
          style={{
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "white",
            border: "none",
            padding: "12px 22px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(22,163,74,0.25)",
            whiteSpace: "nowrap",
          }}
        >
          + Nuevo Producto
        </button>
      </div>

      {/* BUSCADOR */}
      <div style={{ marginBottom: 16, position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 16,
            pointerEvents: "none",
          }}
        >
          🔍
        </span>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 14px 12px 42px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: 14,
            boxSizing: "border-box",
            outline: "none",
            background: "white",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda("")}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* TABLA */}
      <div
        style={{
          background: "white",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        {productosFiltrados.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 10px", color: "#94a3b8" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>
              {busqueda ? "🔍" : "📦"}
            </div>
            <p style={{ margin: 0, fontSize: 14.5 }}>
              {busqueda
                ? `Sin resultados para "${busqueda}"`
                : "No hay productos registrados todavía"}
            </p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "14px 20px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    borderBottom: "1px solid #eef2f0",
                    width: 80,
                  }}
                >
                  ID
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "14px 20px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    borderBottom: "1px solid #eef2f0",
                  }}
                >
                  Nombre
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "14px 20px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    borderBottom: "1px solid #eef2f0",
                    width: 140,
                  }}
                >
                  Precio
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "14px 20px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    borderBottom: "1px solid #eef2f0",
                    width: 160,
                  }}
                >
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>
              {productosFiltrados.map((producto, index) => (
                <tr
                  key={producto.id}
                  style={{
                    borderBottom:
                      index === productosFiltrados.length - 1
                        ? "none"
                        : "1px solid #f1f5f9",
                  }}
                >
                  <td
                    style={{
                      padding: "14px 20px",
                      color: "#94a3b8",
                      fontWeight: 600,
                    }}
                  >
                    #{producto.id}
                  </td>
                  <td
                    style={{
                      padding: "14px 20px",
                      color: "#1f2937",
                      fontWeight: 600,
                    }}
                  >
                    {producto.nombre}
                  </td>
                  <td
                    style={{
                      padding: "14px 20px",
                      textAlign: "right",
                      color: "#16a34a",
                      fontWeight: 800,
                    }}
                  >
                    ₡{producto.precio.toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: "14px 20px",
                      textAlign: "right",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 8,
                      }}
                    >
                      <button
                        onClick={() => abrirEditar(producto)}
                        style={{
                          background: "white",
                          color: "#2563eb",
                          border: "1px solid #bfdbfe",
                          padding: "7px 12px",
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 12.5,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Precio
                      </button>

                      <button
                        onClick={() => eliminarProducto(producto)}
                        style={{
                          background: "#fef2f2",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          padding: "7px 12px",
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 12.5,
                          cursor: "pointer",
                        }}
                      >
                        🗑 Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CREAR / EDITAR PRECIO */}
      {mostrarModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,31,26,0.55)",
            backdropFilter: "blur(2px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              width: 440,
              maxWidth: "95vw",
              background: "white",
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
            }}
          >
            {/* Cabecera */}
            <div
              style={{
                padding: "20px 26px",
                borderBottom: "1px solid #eef2f0",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "#ecfdf5",
                  border: "1px solid #bbf7d0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {editando ? "💲" : "🍔"}
              </div>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#1f2937",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {editando ? "Editar Precio" : "Nuevo Producto"}
                </h2>
                <p style={{ margin: 0, marginTop: 2, fontSize: 13, color: "#94a3b8" }}>
                  {editando
                    ? `${editando.nombre} · #${editando.id}`
                    : "Agregar al catálogo"}
                </p>
              </div>
            </div>

            <div style={{ padding: "22px 26px" }}>
              {/* Campo Nombre: solo visible al crear */}
              {!editando && (
                <>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "#334155",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 8,
                    }}
                  >
                    Nombre del producto
                  </label>
                  <input
                    placeholder="Ej. Casado de pollo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid #d1d5db",
                      fontSize: 14,
                      boxSizing: "border-box",
                      outline: "none",
                      marginBottom: 18,
                    }}
                  />
                </>
              )}

              {/* Precio actual al editar */}
              {editando && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "10px 14px",
                    marginBottom: 18,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#64748b" }}>Precio actual</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#16a34a" }}>
                    ₡{editando.precio.toLocaleString()}
                  </span>
                </div>
              )}

              <label
                style={{
                  display: "block",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 8,
                }}
              >
                {editando ? "Nuevo precio" : "Precio"}
              </label>

              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
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
                    padding: "12px 14px 12px 28px",
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    fontSize: 14,
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "16px 26px",
                borderTop: "1px solid #eef2f0",
                background: "#fafafa",
              }}
            >
              <button
                onClick={cerrarModal}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: "white",
                  color: "#475569",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                onClick={guardarProducto}
                disabled={guardando || (!editando && !nombre.trim()) || !precio}
                style={{
                  flex: 1,
                  padding: 13,
                  borderRadius: 10,
                  border: "none",
                  background:
                    guardando || (!editando && !nombre.trim()) || !precio
                      ? "#86efac"
                      : "#16a34a",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor:
                    guardando || (!editando && !nombre.trim()) || !precio
                      ? "default"
                      : "pointer",
                  boxShadow:
                    guardando || (!editando && !nombre.trim()) || !precio
                      ? "none"
                      : "0 4px 12px rgba(22,163,74,0.25)",
                  transition: "all 0.15s",
                }}
              >
                {guardando
                  ? "Guardando..."
                  : editando
                  ? "Guardar Precio"
                  : "Crear Producto"}
              </button>
            </div>
          </div>
        </div>
      )}

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