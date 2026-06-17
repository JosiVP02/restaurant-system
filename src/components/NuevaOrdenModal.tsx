import { useEffect, useState } from "react";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";








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



export default function NuevaOrdenModal({
  mesaId,
  cuentaId,
  modo = "cocina",
  onClose,
  onOrdenCreada
}: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<ItemOrden[]>([]);
  const [guardando, setGuardando] = useState(false);

  async function cargarProductos() {
    try {
      const res = await api.get("/productos");
      setProductos(res.data);
    } catch (error) {
      console.error(error);
    }
  }




const [confirm, setConfirm] = useState<{
  titulo: string;
  descripcion?: string;
  tipo?: "default" | "warning" | "danger";
  textoCon?: string;
  accion: () => void;
} | null>(null);











  useEffect(() => {
    cargarProductos();
  }, []);





function agregarProducto(
  producto: Producto
) {

  setOrden([
    ...orden,
    {
      id:
        Date.now() +
        Math.random(),

      productoId:
        producto.id,

      nombre:
        producto.nombre,

      precio:
        producto.precio,

      cantidad: 1,

      observacion: "",
    },
  ]);
}






  function aumentarCantidad(id: number) {
    setOrden(
      orden.map((item) =>
        item.id === id
          ? {
              ...item,
              cantidad: item.cantidad + 1,
            }
          : item
      )
    );
  }



  function disminuirCantidad(id: number) {
    setOrden(
      orden
        .map((item) =>
          item.id === id
            ? {
                ...item,
                cantidad: item.cantidad - 1,
              }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  }



  function eliminarProducto(id: number) {
    setOrden(
      orden.filter(
        (item) => item.id !== id
      )
    );
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


          // DESPUÉS
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
  if (orden.length === 0) {
    onClose(); // sin productos → cierra directo sin preguntar
    return;
  }

  setConfirm({
    titulo: "¿Descartar orden?",
    descripcion: "Perderás los productos seleccionados",
    tipo: "danger",
    textoCon: "Descartar",
    accion: onClose,
  });
}










  const productosFiltrados =
    productos.filter((producto) =>
      producto.nombre
        .toLowerCase()
        .includes(
          busqueda.toLowerCase()
        )
    );





  const total = orden.reduce(
    (acc, item) =>
      acc +
      item.precio * item.cantidad,
    0
  
  );

  const cantidadTotal = orden.reduce(
    (acc, item) => acc + item.cantidad,
    0
  );

  const esDirecto = modo === "directo";

  const colorAccento = esDirecto ? "#2563eb" : "#16a34a";
  const colorAccentoSuave = esDirecto ? "#eff6ff" : "#ecfdf5";
  const colorAccentoBorde = esDirecto ? "#bfdbfe" : "#bbf7d0";




  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(15,31,26,0.55)",
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
          width: "1200px",
          maxWidth: "95vw",
          height: "750px",
          maxHeight: "92vh",
          background: "#fff",
          borderRadius: "20px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 28px",
            borderBottom:
              "1px solid #eef2f0",
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
              background: colorAccentoSuave,
              border: `1px solid ${colorAccentoBorde}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {esDirecto ? "⚡" : "📋"}
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                color: "#1f2937",
              }}
            >
              {esDirecto ? "Agregar a Cuenta" : "Nueva Orden"}
            </h2>
            <p
              style={{
                margin: 0,
                marginTop: 2,
                fontSize: 13,
                color: "#94a3b8",
              }}
            >
              Mesa {mesaId} · Cuenta #{cuentaId}
              {!esDirecto && " · Se enviará a cocina"}
            </p>
          </div>
        </div>

        {/* Contenido */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns:
              "2fr 1fr",
            gap: "20px",
            padding: "20px 28px",
            overflow: "hidden",
          }}
        >
          {/* Productos */}
          <div
            style={{
              display: "flex",
              flexDirection:
                "column",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", marginBottom: 14 }}>
              <span
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 15,
                  color: "#94a3b8",
                }}
              >
                🔍
              </span>
              <input
                type="text"
                placeholder="Buscar producto..."
                value={busqueda}
                onChange={(e) =>
                  setBusqueda(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 38px",
                  borderRadius:
                    "10px",
                  border:
                    "1px solid #d1d5db",
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill,minmax(180px,1fr))",
                gap: "12px",
                overflowY: "auto",
                paddingRight: 4,
                alignContent: "flex-start",
              }}
            >
              {productosFiltrados.length === 0 && (
                <p style={{ color: "#94a3b8", fontSize: 14, gridColumn: "1 / -1" }}>
                  No se encontraron productos
                </p>
              )}

              {productosFiltrados.map(
                (producto) => (
                  <div
                    key={producto.id}
                    onClick={() =>
                      agregarProducto(
                        producto
                      )
                    }
                    style={{
                      background:
                        "#f8fafc",
                      border:
                        "1px solid #e5e7eb",
                      borderRadius:
                        "12px",
                      padding:
                        "14px",
                      cursor:
                        "pointer",
                      transition:
                        "transform 0.12s, box-shadow 0.12s, border-color 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.08)";
                      e.currentTarget.style.borderColor = colorAccento;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    <div
                      style={{
                        fontWeight:
                          700,
                        fontSize: 14,
                        color: "#1f2937",
                        marginBottom: 8,
                      }}
                    >
                      {
                        producto.nombre
                      }
                    </div>

                    <div
                      style={{
                        color:
                          colorAccento,
                        fontWeight:
                          800,
                        fontSize: 15,
                      }}
                    >
                      ₡
                      {producto.precio.toLocaleString()}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Orden */}
          <div
            style={{
              background:
                "#f8fafc",
              border: "1px solid #eef2f0",
              borderRadius:
                "14px",
              padding: "18px",
              display: "flex",
              flexDirection:
                "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#334155",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Orden Actual
              </h3>

              {cantidadTotal > 0 && (
                <span
                  style={{
                    background: colorAccento,
                    color: "white",
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 20,
                    padding: "3px 10px",
                  }}
                >
                  {cantidadTotal} {cantidadTotal === 1 ? "item" : "items"}
                </span>
              )}
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {orden.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 10px",
                    color: "#94a3b8",
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
                  <p style={{ margin: 0, fontSize: 14 }}>
                    Seleccione productos para agregar
                  </p>
                </div>
              )}

              {orden.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <strong style={{ fontSize: 14, color: "#1f2937" }}>
                      {item.nombre}
                    </strong>

                    <span style={{ fontWeight: 800, color: colorAccento, fontSize: 14 }}>
                      ₡
                      {(
                        item.precio *
                        item.cantidad
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0,
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        overflow: "hidden",
                      }}
                    >
                      <button
                        onClick={() =>
                          disminuirCantidad(
                            item.id
                          )
                        }
                        style={{
                          width: 30,
                          height: 30,
                          border: "none",
                          background: "#f1f5f9",
                          cursor: "pointer",
                          fontWeight: 700,
                          color: "#475569",
                        }}
                      >
                        −
                      </button>

                      <span style={{ width: 32, textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                        {
                          item.cantidad
                        }
                      </span>

                      <button
                        onClick={() =>
                          aumentarCantidad(
                            item.id
                          )
                        }
                        style={{
                          width: 30,
                          height: 30,
                          border: "none",
                          background: "#f1f5f9",
                          cursor: "pointer",
                          fontWeight: 700,
                          color: "#475569",
                        }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        eliminarProducto(
                          item.id
                        )
                      }
                      title="Eliminar"
                      style={{
                        width: 30,
                        height: 30,
                        border: "1px solid #fecaca",
                        background: "#fef2f2",
                        color: "#dc2626",
                        borderRadius: 8,
                        cursor: "pointer",
                        marginLeft: "auto",
                      }}
                    >
                      🗑
                    </button>
                  </div>

                  <textarea
                    placeholder="Observaciones para cocina..."
                    value={item.observacion}
                    onChange={(e) =>
                      setOrden(
                        orden.map((o) =>
                          o.id === item.id
                            ? {
                                ...o,
                                observacion:
                                  e.target.value,
                              }
                            : o
                        )
                      )
                    }
                    rows={2}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      padding: 8,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      resize: "none",
                      fontSize: 12.5,
                      color: "#475569",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              ))}
            </div>

            <div
              style={{
                borderTop:
                  "1px solid #e2e8f0",
                paddingTop:
                  "14px",
                marginTop: 4,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1f2937" }}>
                Total
              </span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: colorAccento,
                  letterSpacing: "-0.02em",
                }}
              >
                ₡
                {total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop:
              "1px solid #eef2f0",
            padding: "16px 28px",
            display: "flex",
            justifyContent:
              "flex-end",
            gap: "10px",
            background: "#fafafa",
          }}
        >
          <button
             onClick={handleCancelar}
            style={{
              padding:
                "12px 22px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "white",
              color: "#475569",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>

          <button
            onClick={crearOrden}
            disabled={
              guardando ||
              orden.length === 0
            }
            style={{
              background:
                guardando || orden.length === 0 ? "#cbd5e1" : colorAccento,
              color: "white",
              border: "none",
              borderRadius:
                "10px",
              padding:
                "12px 26px",
              cursor: guardando || orden.length === 0 ? "default" : "pointer",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: guardando || orden.length === 0
                ? "none"
                : `0 4px 12px ${esDirecto ? "rgba(37,99,235,0.3)" : "rgba(22,163,74,0.3)"}`,
              transition: "all 0.15s",
            }}
          >
            {guardando
              ? "Guardando..."
              : esDirecto
              ? "Agregar a Cuenta"
              : "Crear Orden"}
          </button>
        </div>
      </div>


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