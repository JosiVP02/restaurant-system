// src/components/NuevaOrdenModal.tsx
//
// Equivalente móvil de NuevaOrdenModal.tsx (Desktop). Misma lógica e
// idénticos endpoints (POST /cuentas/abrir/:mesaId, POST
// /cuentas/:id/agregar-productos o /agregar-directo). La diferencia es
// de layout: en Desktop el catálogo y el carrito están lado a lado en
// un modal ancho; en una pantalla móvil eso no entra, así que se separa
// en dos "pasos" dentro del mismo modal: 1) elegir productos, 2) revisar
// carrito y confirmar. Un badge flotante con el contador de items permite
// saltar al carrito en cualquier momento.

import { useEffect, useState } from "react";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import type { Producto, ProductoCarritoItem, ConfirmState } from "../services";

interface Props {
  mesaId: number;
  cuentaId: number;
  modo?: "cocina" | "directo";
  onClose: () => void;
  onOrdenCreada: (nuevoCuentaId?: number) => void;
}

export default function NuevaOrdenModal({
  mesaId,
  cuentaId,
  modo = "cocina",
  onClose,
  onOrdenCreada,
}: Props) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<ProductoCarritoItem[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista] = useState<"catalogo" | "carrito">("catalogo");
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const esDirecto = modo === "directo";
  const colorAccento = esDirecto ? "#2563eb" : "#16a34a";
  const colorAccentoSuave = esDirecto ? "#eff6ff" : "#ecfdf5";
  const colorAccentoBorde = esDirecto ? "#bfdbfe" : "#bbf7d0";

  useEffect(() => {
    api
      .get("/productos")
      .then((res) => setProductos(res.data))
      .catch((error) => console.error(error));
  }, []);

  function agregarProducto(producto: Producto) {
    setOrden((prev) => {
      // Si ya está en el carrito, solo sube la cantidad (mejor UX táctil
      // que duplicar filas, aunque el Desktop sí duplica filas separadas;
      // el resultado neto enviado al backend es equivalente).
      const existente = prev.find((i) => i.productoId === producto.id);
      if (existente) {
        return prev.map((i) =>
          i.productoId === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: Date.now() + Math.random(),
          productoId: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: 1,
          observacion: "",
        },
      ];
    });
  }

  function aumentarCantidad(id: number) {
    setOrden((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cantidad: item.cantidad + 1 } : item))
    );
  }

  function disminuirCantidad(id: number) {
    setOrden((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item))
        .filter((item) => item.cantidad > 0)
    );
  }

  function eliminarProducto(id: number) {
    setOrden((prev) => prev.filter((item) => item.id !== id));
  }

  function actualizarObservacion(id: number, observacion: string) {
    setOrden((prev) => prev.map((o) => (o.id === id ? { ...o, observacion } : o)));
  }

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const total = orden.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  const cantidadTotal = orden.reduce((acc, item) => acc + item.cantidad, 0);

  function crearOrden() {
    if (orden.length === 0) return;

    setConfirm({
      titulo: esDirecto ? "Agregar a cuenta" : "Enviar orden a cocina",
      descripcion: `${cantidadTotal} ${cantidadTotal === 1 ? "item" : "items"} · ₡${total.toLocaleString()}`,
      tipo: "default",
      textoConfirmar: esDirecto ? "Agregar" : "Enviar",
      onConfirmar: async () => {
        setConfirm(null);
        try {
          setGuardando(true);

          let idCuentaActual = cuentaId;
          if (!idCuentaActual) {
            const res = await api.post(`/cuentas/abrir/${mesaId}`);
            idCuentaActual = Number(res.data.id);
            if (!idCuentaActual) {
              alert("No se pudo crear la cuenta. Intente nuevamente.");
              setGuardando(false);
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
      onClose();
      return;
    }
    setConfirm({
      titulo: "¿Descartar orden?",
      descripcion: "Perderás los productos seleccionados",
      tipo: "danger",
      textoConfirmar: "Descartar",
      onConfirmar: () => {
        setConfirm(null);
        onClose();
      },
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "white",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid #eef2f0",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={handleCancelar}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "white",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: colorAccentoSuave,
            border: `1px solid ${colorAccentoBorde}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          {esDirecto ? "⚡" : "📋"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1f2937" }}>
            {esDirecto ? "Agregar a Cuenta" : "Nueva Orden"}
          </h2>
          <p style={{ margin: 0, fontSize: 11.5, color: "#94a3b8" }}>
            Mesa {mesaId} · Cuenta #{cuentaId || "—"}
          </p>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", borderBottom: "1px solid #eef2f0" }}>
        {(["catalogo", "carrito"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            style={{
              flex: 1,
              padding: "12px 0",
              border: "none",
              background: "white",
              borderBottom: vista === v ? `2.5px solid ${colorAccento}` : "2.5px solid transparent",
              color: vista === v ? colorAccento : "#94a3b8",
              fontWeight: 700,
              fontSize: 13.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {v === "catalogo" ? "🔍 Productos" : "🛒 Carrito"}
            {v === "carrito" && cantidadTotal > 0 && (
              <span
                style={{
                  background: colorAccento,
                  color: "white",
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 20,
                  padding: "1px 7px",
                }}
              >
                {cantidadTotal}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {vista === "catalogo" ? (
          <div style={{ padding: 16 }}>
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
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 38px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  fontSize: 15,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {productosFiltrados.length === 0 && (
              <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", marginTop: 30 }}>
                No se encontraron productos
              </p>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {productosFiltrados.map((producto) => {
                const enCarrito = orden.find((i) => i.productoId === producto.id);
                return (
                  <button
                    key={producto.id}
                    onClick={() => agregarProducto(producto)}
                    style={{
                      background: enCarrito ? colorAccentoSuave : "#f8fafc",
                      border: `1.5px solid ${enCarrito ? colorAccentoBorde : "#e5e7eb"}`,
                      borderRadius: 12,
                      padding: 14,
                      textAlign: "left",
                      position: "relative",
                    }}
                  >
                    {enCarrito && (
                      <span
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          background: colorAccento,
                          color: "white",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "2px 7px",
                        }}
                      >
                        {enCarrito.cantidad}
                      </span>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "#1f2937", marginBottom: 6 }}>
                      {producto.nombre}
                    </div>
                    <div style={{ color: colorAccento, fontWeight: 800, fontSize: 14.5 }}>
                      ₡{producto.precio.toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            {orden.length === 0 && (
              <div style={{ textAlign: "center", padding: "50px 10px", color: "#94a3b8" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🛒</div>
                <p style={{ margin: 0, fontSize: 14 }}>Seleccione productos para agregar</p>
              </div>
            )}

            {orden.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <strong style={{ fontSize: 14.5, color: "#1f2937" }}>{item.nombre}</strong>
                  <span style={{ fontWeight: 800, color: colorAccento, fontSize: 14.5 }}>
                    ₡{(item.precio * item.cantidad).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      onClick={() => disminuirCantidad(item.id)}
                      style={{ width: 36, height: 36, border: "none", background: "#f1f5f9", fontWeight: 700, fontSize: 17 }}
                    >
                      −
                    </button>
                    <span style={{ width: 36, textAlign: "center", fontWeight: 700, fontSize: 15 }}>
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => aumentarCantidad(item.id)}
                      style={{ width: 36, height: 36, border: "none", background: "#f1f5f9", fontWeight: 700, fontSize: 17 }}
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => eliminarProducto(item.id)}
                    style={{
                      marginLeft: "auto",
                      width: 36,
                      height: 36,
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#dc2626",
                      borderRadius: 8,
                    }}
                  >
                    🗑
                  </button>
                </div>

                <textarea
                  placeholder="Observaciones para cocina..."
                  value={item.observacion}
                  onChange={(e) => actualizarObservacion(item.id, e.target.value)}
                  rows={2}
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    resize: "none",
                    fontSize: 13,
                    color: "#475569",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div
        style={{
          borderTop: "1px solid #eef2f0",
          padding: "14px 18px",
          paddingBottom: "calc(14px + env(safe-area-inset-bottom, 0px))",
          background: "#fafafa",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>Total</span>
          <span style={{ fontSize: 21, fontWeight: 800, color: colorAccento }}>
            ₡{total.toLocaleString()}
          </span>
        </div>

        <button
          onClick={crearOrden}
          disabled={guardando || orden.length === 0}
          style={{
            width: "100%",
            background: guardando || orden.length === 0 ? "#cbd5e1" : colorAccento,
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "15px 0",
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {guardando ? "Guardando..." : esDirecto ? "Agregar a Cuenta" : "Crear Orden"}
        </button>
      </div>

      {confirm && <ConfirmModal {...confirm} onCancelar={() => setConfirm(null)} />}
    </div>
  );
}