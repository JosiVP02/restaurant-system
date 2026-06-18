import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../services/api";

import NuevaOrdenModal from "../components/NuevaOrdenModal";
import CobrarModal from "../components/CobrarModal";
import TransferirMesaModal from "../components/TransferirMesaModal";

import ActividadMesaModal from "../components/ActividadMesaModal";

import { useNavigate } from "react-router-dom";



import ConfirmModal from "../components/ConfirmModal";

import { usePrinter } from "../hooks/usePrinter";



interface DetalleCuenta {
  id: number;
  producto: string;
  cantidad: number;
  precio_unitario: number;
}




export default function CuentaMesa() {
  const { mesaId } = useParams();

  const navigate = useNavigate();

  const [cuentaId, setCuentaId] =
    useState<number>(0);

  const [consumidos, setConsumidos] =
    useState<DetalleCuenta[]>([]);

  const [
    mostrarNuevaOrden,
    setMostrarNuevaOrden
  ] = useState(false);

  const [
    mostrarCobro,
    setMostrarCobro
  ] = useState(false);


const [nombreMesa, setNombreMesa] = useState<string>("");


const [
  mostrarTransferir,
  setMostrarTransferir
] = useState(false);


const [
  mostrarActividad,
  setMostrarActividad
] = useState(false);



const [confirm, setConfirm] = useState<{
  titulo: string;
  descripcion?: string;
  tipo?: "default" | "warning" | "danger";
  textoCon?: string;
  accion: () => void;
} | null>(null);

const [confirm2, setConfirm2] = useState<{
  accion: () => void;
} | null>(null);



const { imprimirPrecuenta } = usePrinter();
const [errorPrec, setErrorPrec] = useState("");

async function handleImprimirCuenta() {
  try {
    setErrorPrec("");
    const [cfgRes] = await Promise.all([api.get("/configuracion")]);
    const cfg = cfgRes.data;
    await imprimirPrecuenta({
      negocio:     cfg.nombre_negocio || "POSKEY",
      direccion:   cfg.direccion || "",
      telefono:    cfg.telefono || "",
      num_factura: String(cuentaId).padStart(6, "0"),
      fecha:       new Date().toLocaleString("es-CR"),
      cajero:      "",
      cliente:     "Consumidor Final",
      lineas: consumidos.map(i => ({
        nombre:      i.producto,
        cantidad:    i.cantidad,
        precio_unit: i.precio_unitario,
        subtotal:    i.cantidad * i.precio_unitario,
      })),
      subtotal,
      impuesto: 0,
      total:    totalCuenta,
      metodo_pago: "—",
    });
  } catch (e: any) {
    setErrorPrec(e.message ?? String(e));
  }
}


async function cargarMesa() {
  try {
    const res = await api.get(`/mesas/${mesaId}`);
    if (res.data?.nombre) setNombreMesa(res.data.nombre);
  } catch (error) {
    console.error(error);
  }
}



  async function cargarCuenta(
    idCuenta: number
  ) {
    try {
      const res = await api.get(
        `/cuentas/${idCuenta}/detalle`
      );

      setConsumidos(res.data);
    } catch (error) {
      console.error(error);
    }
  }




async function obtenerCuenta() {
  try {
    const res = await api.get(
      `/cuentas/mesa/${mesaId}`
    );

    if (res.data && res.data.id) {

    const idCuenta = Number(res.data.id);

    setCuentaId(idCuenta);

    await cargarCuenta(idCuenta);

    return;
  }

  setCuentaId(0);
  setConsumidos([]);

  } catch (error) {
    console.error(error);
  }
}





useEffect(() => {
  if (!mesaId) return;

  obtenerCuenta();
  cargarMesa();

  const intervalo = setInterval(() => {
    obtenerCuenta();
  }, 2000);

  return () => clearInterval(intervalo);

}, [mesaId]);




const subtotal =
  consumidos.reduce(
    (acc, item) =>
      acc +
      item.cantidad *
      item.precio_unitario,
    0
  );

const servicio =
  subtotal * 0.10;

const totalCuenta =
  subtotal + servicio;



const [
  mostrarAgregarDirecto,
  setMostrarAgregarDirecto
] = useState(false);



async function sumarProducto(detalleId: number) {
  setConfirm({
    titulo: "Sumar 1 unidad",
    tipo: "default",
    textoCon: "Confirmar",
    accion: async () => {
      await api.post(`/detalle/${detalleId}/sumar`);
      cargarCuenta(cuentaId);
    },
  });
}

async function restarProducto(detalleId: number) {
  setConfirm({
    titulo: "Restar 1 unidad",
    tipo: "warning",
    textoCon: "Confirmar",
    accion: async () => {
      await api.post(`/detalle/${detalleId}/restar`);
      cargarCuenta(cuentaId);
    },
  });
}

async function eliminarProducto(detalleId: number) {
  setConfirm({
    titulo: "Eliminar producto",
    descripcion: "Esta acción no se puede deshacer",
    tipo: "danger",
    textoCon: "Eliminar",
    accion: async () => {
      await api.delete(`/detalle/${detalleId}`);
      cargarCuenta(cuentaId);
    },
  });
}

async function liberarMesa() {
  setConfirm({
    titulo: "Liberar mesa",
    descripcion: "Se anulará la cuenta activa y todos sus productos",
    tipo: "danger",
    textoCon: "Sí, liberar",
    accion: () => {
      setConfirm2({
        accion: async () => {
          await api.post(`/mesas/${mesaId}/liberar`);
          window.location.href = "/mesas";
        },
      });
    },
  });
}















    
  return (
  <div
    style={{
      maxWidth: "1400px",
      margin: "0 auto",
      padding: "28px 24px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}
  >
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 350px",
        gap: "24px",
        alignItems: "start",
      }}
    >
      {/* IZQUIERDA */}

      <div>
        {/* HEADER */}

        <div
          style={{
            background: "linear-gradient(135deg, #16241f, #0f1f1a)",
            color: "white",
            padding: "24px 28px",
            borderRadius: "16px",
            boxShadow:
              "0 4px 16px rgba(0,0,0,0.12)",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <button
              onClick={() => navigate("/mesas")}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
                padding: "10px 16px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ← Volver
            </button>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                🍽️ {nombreMesa || `Mesa ${mesaId}`}
              </h1>

              <p
                style={{
                  color: "#9cc2b0",
                  marginTop: 6,
                  marginBottom: 0,
                  fontSize: 14,
                }}
              >
                Cuenta #{cuentaId || "—"}
              </p>
            </div>
          </div>

          <span
            style={{
              background: "rgba(34,197,94,0.18)",
              color: "#86efac",
              border: "1px solid rgba(34,197,94,0.35)",
              padding: "8px 16px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "700",
              letterSpacing: "0.05em",
            }}
          >
            ● ABIERTA
          </span>
        </div>

        {/* PRODUCTOS */}

        <div
          style={{
            background: "white",
            padding: "24px",
            borderRadius: "16px",
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: 18,
              fontSize: 18,
              fontWeight: 800,
              color: "#1f2937",
            }}
          >
            Productos Consumidos
          </h2>

          {consumidos.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "48px 10px",
                color: "#94a3b8",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>🧾</div>
              <p style={{ margin: 0, fontSize: 14.5 }}>
                No hay productos registrados todavía
              </p>
            </div>
          )}

          {consumidos.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#f8fafc",
                borderRadius: 14,
                padding: 16,
                marginBottom: 12,
                border:
                  "1px solid #eef2f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 15.5,
                      fontWeight: 700,
                      color: "#1f2937",
                    }}
                  >
                    {item.producto}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      marginTop: 2,
                      color: "#94a3b8",
                      fontSize: 13,
                    }}
                  >
                    ₡
                    {item.precio_unitario.toLocaleString()} c/u
                  </p>
                </div>

                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 18,
                    color: "#16a34a",
                  }}
                >
                  ₡
                  {(
                    item.cantidad *
                    item.precio_unitario
                  ).toLocaleString()}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems:
                    "center",
                  marginTop: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "white",
                  }}
                >
                  <button
                    onClick={() =>
                      restarProducto(
                        item.id
                      )
                    }
                    style={{
                      width: 34,
                      height: 34,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 16,
                      color: "#475569",
                    }}
                  >
                    −
                  </button>

                  <strong style={{ width: 36, textAlign: "center", fontSize: 15 }}>
                    {item.cantidad}
                  </strong>

                  <button
                    onClick={() =>
                      sumarProducto(
                        item.id
                      )
                    }
                    style={{
                      width: 34,
                      height: 34,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 16,
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
                  style={{
                    marginLeft:
                      "auto",
                    background:
                      "#fef2f2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    padding:
                      "9px 14px",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DERECHA */}

      <div>
        <div
          style={{
            position: "sticky",
            top: 20,
            background: "white",
            padding: 24,
            borderRadius: 16,
            boxShadow:
              "0 2px 10px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            style={{
              margin: 0,
              marginBottom: 16,
              fontSize: 17,
              fontWeight: 800,
              color: "#1f2937",
            }}
          >
            Resumen
          </h2>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              marginBottom: 10,
              fontSize: 14.5,
              color: "#475569",
            }}
          >
            <span>Subtotal</span>

            <strong style={{ color: "#1f2937" }}>
              ₡
              {subtotal.toLocaleString()}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              marginBottom: 14,
              fontSize: 14.5,
              color: "#475569",
            }}
          >
            <span>
              Servicio 10%
            </span>

            <strong style={{ color: "#1f2937" }}>
              ₡
              {servicio.toLocaleString()}
            </strong>
          </div>

          <div style={{ height: 1, background: "#e2e8f0", marginBottom: 14 }} />

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 17, fontWeight: 800, color: "#1f2937" }}>
              Total
            </span>

            <span
              style={{
                color: "#16a34a",
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              ₡
              {totalCuenta.toLocaleString()}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
            }}
            >




              <button
                onClick={() => setMostrarNuevaOrden(true)}
                style={{
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "white",
                  border: "none",
                  padding: "13px 12px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14.5,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(22,163,74,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                📋 Nueva Orden
              </button>

              <button
                onClick={() => setMostrarAgregarDirecto(true)}
                style={{
                  background: "white",
                  color: "#2563eb",
                  border: "1px solid #bfdbfe",
                  padding: "13px 12px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                ⚡ Agregar a Cuenta
              </button>



            <button
                onClick={() =>
                  setMostrarActividad(true)
                }
                style={{
                  background: "white",
                  color: "#475569",
                  border: "1px solid #e2e8f0",
                  padding: "13px 12px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14.5,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                🕓 Actividad
              </button>




            <button
              onClick={() =>
                setMostrarTransferir(true)
              }
              style={{
                background: "white",
                color: "#2563eb",
                border: "1px solid #bfdbfe",
                padding: "13px 12px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14.5,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              🔄 Transferir Mesa
            </button>

            <button
               onClick={liberarMesa}
              style={{
                background:
                  "white",
                color: "#f97316",
                border: "1px solid #fed7aa",
                padding: "13px 12px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14.5,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              🔓 Liberar Mesa
            </button>



            <button
              onClick={handleImprimirCuenta}
              disabled={consumidos.length === 0}
              style={{
                background: "white",
                color: "#7c3aed",
                border: "1px solid #ddd6fe",
                padding: "13px 12px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14.5,
                cursor: consumidos.length === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: consumidos.length === 0 ? 0.5 : 1,
              }}
            >
              🖨️ Imprimir Cuenta
            </button>

            {errorPrec && (
              <p style={{ fontSize:12, color:"#dc2626", margin:0, padding:"8px 12px", background:"#fef2f2", borderRadius:8 }}>
                ⚠️ {errorPrec}
              </p>
            )}



            <button
              onClick={() =>
                setMostrarCobro(
                  true
                )
              }
              style={{
                background:
                  "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "white",
                border: "none",
                padding: "14px 12px",
                borderRadius: 10,
                fontWeight:
                  "800",
                fontSize: 15,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(220,38,38,0.25)",
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              💰 Cobrar
            </button>
          </div>
        </div>
      </div>
    </div>


      {mostrarNuevaOrden && (
        <NuevaOrdenModal
          mesaId={Number(mesaId)}
          cuentaId={cuentaId}
          onClose={() => setMostrarNuevaOrden(false)}
          onOrdenCreada={(nuevoCuentaId) => {
            if (nuevoCuentaId) setCuentaId(nuevoCuentaId); // 👈
            obtenerCuenta();
            setMostrarNuevaOrden(false);
          }}
        />
      )}

    {mostrarCobro && (
      <CobrarModal
        cuentaId={cuentaId}
        total={subtotal}
        onClose={() =>
          setMostrarCobro(false)
        }
        onCobrado={async () => {

          setMostrarCobro(false);

          setCuentaId(0);

          setConsumidos([]);

          await obtenerCuenta();
        }}
      />
    )}

{
      mostrarTransferir && (
        <TransferirMesaModal
          cuentaId={cuentaId}
          mesaActual={Number(mesaId)}
          onClose={() =>
            setMostrarTransferir(false)
          }
          onTransferida={(
              nuevaMesaId
            ) => {

              navigate(
                `/cuenta/${nuevaMesaId}`
              );
            }}
        />
      )
    }


    {
      mostrarActividad && (
        <ActividadMesaModal
          cuentaId={cuentaId}
          onClose={() =>
            setMostrarActividad(
              false
            )
          }
        />
      )
    }



      {mostrarAgregarDirecto && (
        <NuevaOrdenModal
          mesaId={Number(mesaId)}
          cuentaId={cuentaId}
          modo="directo"
          onClose={() => setMostrarAgregarDirecto(false)}
          onOrdenCreada={(nuevoCuentaId) => {
            if (nuevoCuentaId) setCuentaId(nuevoCuentaId); // 👈
            obtenerCuenta();
            setMostrarAgregarDirecto(false);
          }}
        />
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


    {confirm2 && (
      <ConfirmModal
        titulo="¿Está completamente seguro?"
        descripcion="Se eliminara la cuenta y se liberara la mesa"
        tipo="danger"
        textoConfirmar="Eliminar definitivamente"
        onConfirmar={() => {
          confirm2.accion();
          setConfirm2(null);
        }}
        onCancelar={() => setConfirm2(null)}
      />
    )}




  </div>

  );
}