// src/pages/CuentaMesa.tsx
//
// Equivalente móvil de CuentaMesa.tsx (Desktop). Mismos endpoints,
// mismos cálculos (subtotal, servicio 10%, total), mismos modales.
// Cambia el layout: Desktop usa grid de 2 columnas (productos | resumen
// fijo a la derecha); aquí todo se apila en una sola columna y las
// acciones quedan en una barra fija al fondo para que estén siempre
// accesibles con el pulgar.
//
// Excluido a propósito (acordado): imprimir precuenta / descargar PDF.
// liberarMesa, transferir, cobrar, actividad, nueva orden y agregar
// directo se mantienen exactamente igual que en Desktop.

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import { api } from "../services/api";
import { useServerGuard, esErrorDeConexion } from "../hooks/useServerGuard";
import { useToast } from "../hooks/useToast";
import ToastStack from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import NuevaOrdenModal from "../components/NuevaOrdenModal";
import CobrarModal from "../components/CobrarModal";
import TransferirMesaModal from "../components/TransferirMesaModal";
import ActividadMesaModal from "../components/ActividadMesaModal";
import type { DetalleCuenta, ConfirmState } from "../services";

function btnEstilo(background: string, color: string): CSSProperties {
  return {
    background,
    color,
    border: "none",
    padding: "13px 8px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };
}

function btnEstiloOutline(color: string, border: string): CSSProperties {
  return {
    background: "white",
    color,
    border: `1px solid ${border}`,
    padding: "13px 8px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };
}

export default function CuentaMesa() {
  useServerGuard();

  const { mesaId } = useParams();
  const navigate = useNavigate();
  const { toasts, toast } = useToast();

  const [cuentaId, setCuentaId] = useState<number>(0);
  const [consumidos, setConsumidos] = useState<DetalleCuenta[]>([]);
  const [nombreMesa, setNombreMesa] = useState("");

  const [mostrarNuevaOrden, setMostrarNuevaOrden] = useState(false);
  const [mostrarAgregarDirecto, setMostrarAgregarDirecto] = useState(false);
  const [mostrarCobro, setMostrarCobro] = useState(false);
  const [mostrarTransferir, setMostrarTransferir] = useState(false);
  const [mostrarActividad, setMostrarActividad] = useState(false);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirm2, setConfirm2] = useState<{ accion: () => void } | null>(null);

  const cargarCuenta = useCallback(async (idCuenta: number) => {
    try {
      const res = await api.get(`/cuentas/${idCuenta}/detalle`);
      setConsumidos(res.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const obtenerCuenta = useCallback(async () => {
    try {
      const res = await api.get(`/cuentas/mesa/${mesaId}`);
      if (res.data && res.data.id) {
        const idCuenta = Number(res.data.id);
        setCuentaId(idCuenta);
        await cargarCuenta(idCuenta);
        return;
      }
      setCuentaId(0);
      setConsumidos([]);
    } catch (error) {
      if (esErrorDeConexion(error)) {
        navigate("/connect", { state: { motivo: "No se pudo conectar con el servidor." } });
        return;
      }
      console.error(error);
    }
  }, [mesaId, cargarCuenta, navigate]);


  const cargarMesa = useCallback(async () => {
    try {
      const res = await api.get(`/mesas/${mesaId}`);
      if (res.data?.nombre) setNombreMesa(res.data.nombre);
    } catch (error) {
      console.error(error);
    }
  }, [mesaId]);



    

useEffect(() => {
  if (!mesaId) return;

  obtenerCuenta();
  cargarMesa();

  const intervalo = setInterval(() => {
    obtenerCuenta();
    cargarMesa();
  }, 2000);

  return () => clearInterval(intervalo);

}, [mesaId, obtenerCuenta, cargarMesa]);



  const subtotal = consumidos.reduce((acc, item) => acc + item.cantidad * item.precio_unitario, 0);
  const servicio = subtotal * 0.1;
  const totalCuenta = subtotal + servicio;

  function sumarProducto(detalleId: number) {
    setConfirm({
      titulo: "Sumar 1 unidad",
      tipo: "default",
      textoConfirmar: "Confirmar",
      onConfirmar: async () => {
        setConfirm(null);
        await api.post(`/detalle/${detalleId}/sumar`);
        cargarCuenta(cuentaId);
      },
    });
  }

  function restarProducto(detalleId: number) {
    setConfirm({
      titulo: "Restar 1 unidad",
      tipo: "warning",
      textoConfirmar: "Confirmar",
      onConfirmar: async () => {
        setConfirm(null);
        await api.post(`/detalle/${detalleId}/restar`);
        cargarCuenta(cuentaId);
      },
    });
  }

  function eliminarProducto(detalleId: number) {
    setConfirm({
      titulo: "Eliminar producto",
      descripcion: "Esta acción no se puede deshacer",
      tipo: "danger",
      textoConfirmar: "Eliminar",
      onConfirmar: async () => {
        setConfirm(null);
        await api.delete(`/detalle/${detalleId}`);
        cargarCuenta(cuentaId);
      },
    });
  }

  function liberarMesa() {
    setConfirm({
      titulo: "Liberar mesa",
      descripcion: "Se anulará la cuenta activa y todos sus productos",
      tipo: "danger",
      textoConfirmar: "Sí, liberar",
      onConfirmar: () => {
        setConfirm(null);
        setConfirm2({
          accion: async () => {
            await api.post(`/mesas/${mesaId}/liberar`);
            navigate("/mesas", { replace: true });
          },
        });
      },
    });
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#f1f5f3", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* HEADER */}
      <div
        style={{
          background: "linear-gradient(135deg, #16241f, #0f1f1a)",
          color: "white",
          padding: "16px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate("/mesas")}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "white",
            width: 38,
            height: 38,
            borderRadius: 10,
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          ←
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, overflow: "hidden", textOverflow: "ellipsis" }}>
            🍽️ {nombreMesa || `Mesa ${mesaId}`}
          </h1>
          <p style={{ margin: "3px 0 0", color: "#9cc2b0", fontSize: 12.5 }}>
            Cuenta #{cuentaId || "—"}
          </p>
        </div>

        <span
          style={{
            background: "rgba(34,197,94,0.18)",
            color: "#86efac",
            border: "1px solid rgba(34,197,94,0.35)",
            padding: "6px 12px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          ● ABIERTA
        </span>
      </div>

      {/* CONTENIDO */}
      <div style={{ padding: "16px 16px 220px" }}>
        {/* RESUMEN */}
        <div style={{ background: "white", padding: 18, borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, color: "#475569" }}>
            <span>Subtotal</span>
            <strong style={{ color: "#1f2937" }}>₡{subtotal.toLocaleString()}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14, color: "#475569" }}>
            <span>Servicio 10%</span>
            <strong style={{ color: "#1f2937" }}>₡{servicio.toLocaleString()}</strong>
          </div>
          <div style={{ height: 1, background: "#e2e8f0", marginBottom: 10 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "#1f2937" }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#16a34a" }}>
              ₡{totalCuenta.toLocaleString()}
            </span>
          </div>
        </div>

        {/* PRODUCTOS */}
        <div style={{ background: "white", padding: 18, borderRadius: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 15.5, fontWeight: 800, color: "#1f2937" }}>
            Productos Consumidos
          </h2>

          {consumidos.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 10px", color: "#94a3b8" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
              <p style={{ margin: 0, fontSize: 13.5 }}>No hay productos registrados todavía</p>
            </div>
          )}

          {consumidos.map((item) => (
            <div key={item.id} style={{ background: "#f8fafc", borderRadius: 14, padding: 14, marginBottom: 10, border: "1px solid #eef2f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "#1f2937" }}>{item.producto}</h3>
                  <p style={{ margin: "2px 0 0", color: "#94a3b8", fontSize: 12 }}>
                    ₡{item.precio_unitario.toLocaleString()} c/u
                  </p>
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#16a34a", flexShrink: 0, marginLeft: 8 }}>
                  ₡{(item.cantidad * item.precio_unitario).toLocaleString()}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", background: "white" }}>
                  <button
                    onClick={() => restarProducto(item.id)}
                    style={{ width: 38, height: 38, border: "none", background: "transparent", fontWeight: 700, fontSize: 17, color: "#475569" }}
                  >
                    −
                  </button>
                  <strong style={{ width: 36, textAlign: "center", fontSize: 15 }}>{item.cantidad}</strong>
                  <button
                    onClick={() => sumarProducto(item.id)}
                    style={{ width: 38, height: 38, border: "none", background: "transparent", fontWeight: 700, fontSize: 17, color: "#475569" }}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => eliminarProducto(item.id)}
                  style={{ marginLeft: "auto", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "9px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12.5 }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BARRA DE ACCIONES FIJA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "white",
          borderTop: "1px solid #e2e8f0",
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
          zIndex: 100,
        }}
      >
        <button
          onClick={() => setMostrarNuevaOrden(true)}
          style={btnEstilo("linear-gradient(135deg, #22c55e, #16a34a)", "white")}
        >
          📋 Nueva Orden
        </button>

        <button onClick={() => setMostrarAgregarDirecto(true)} style={btnEstiloOutline("#2563eb", "#bfdbfe")}>
          ⚡ Agregar
        </button>

        <button onClick={() => setMostrarActividad(true)} style={btnEstiloOutline("#475569", "#e2e8f0")}>
          🕓 Actividad
        </button>

        <button onClick={() => setMostrarTransferir(true)} style={btnEstiloOutline("#2563eb", "#bfdbfe")}>
          🔄 Transferir
        </button>

        <button onClick={liberarMesa} style={btnEstiloOutline("#f97316", "#fed7aa")}>
          🔓 Liberar
        </button>

        <button onClick={() => setMostrarCobro(true)} style={btnEstilo("linear-gradient(135deg, #ef4444, #dc2626)", "white")}>
          💰 Cobrar
        </button>
      </div>

      {/* MODALES */}
      {mostrarNuevaOrden && (
        <NuevaOrdenModal
          mesaId={Number(mesaId)}
          cuentaId={cuentaId}
          onClose={() => setMostrarNuevaOrden(false)}
          onOrdenCreada={(nuevoCuentaId) => {
            if (nuevoCuentaId) setCuentaId(nuevoCuentaId);
            obtenerCuenta();
            setMostrarNuevaOrden(false);
            toast("Orden enviada a cocina");
          }}
        />
      )}

      {mostrarAgregarDirecto && (
        <NuevaOrdenModal
          mesaId={Number(mesaId)}
          cuentaId={cuentaId}
          modo="directo"
          onClose={() => setMostrarAgregarDirecto(false)}
          onOrdenCreada={(nuevoCuentaId) => {
            if (nuevoCuentaId) setCuentaId(nuevoCuentaId);
            obtenerCuenta();
            setMostrarAgregarDirecto(false);
            toast("Productos agregados");
          }}
        />
      )}

      {mostrarCobro && (
        <CobrarModal
          cuentaId={cuentaId}
          total={subtotal}
          onClose={() => setMostrarCobro(false)}
          onCobrado={async () => {
            setMostrarCobro(false);
            setCuentaId(0);
            setConsumidos([]);
            await obtenerCuenta();
            toast("Cuenta cobrada");
          }}
        />
      )}

      {mostrarTransferir && (
        <TransferirMesaModal
          cuentaId={cuentaId}
          mesaActual={Number(mesaId)}
          onClose={() => setMostrarTransferir(false)}
          onTransferida={(nuevaMesaId) => navigate(`/cuenta/${nuevaMesaId}`)}
        />
      )}

      {mostrarActividad && (
        <ActividadMesaModal cuentaId={cuentaId} onClose={() => setMostrarActividad(false)} />
      )}

      {confirm && <ConfirmModal {...confirm} onCancelar={() => setConfirm(null)} />}

      {confirm2 && (
        <ConfirmModal
          titulo="¿Está completamente seguro?"
          descripcion="Se eliminará la cuenta y se liberará la mesa"
          tipo="danger"
          textoConfirmar="Eliminar definitivamente"
          onConfirmar={() => {
            confirm2.accion();
            setConfirm2(null);
          }}
          onCancelar={() => setConfirm2(null)}
        />
      )}

      <ToastStack toasts={toasts} />
    </div>
  );
}