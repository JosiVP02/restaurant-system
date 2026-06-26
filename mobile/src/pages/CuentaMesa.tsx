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
import { TbArrowLeft, TbClipboardList, TbBolt, TbClock, TbArrowsRightLeft, TbLockOpen, TbCurrencyDollar, TbPlus, TbMinus, TbTrash, TbToolsKitchen2, TbReceipt } from "react-icons/tb";
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
import { useWebSocket } from "../hooks/useWebSocket";

// ─── Estilos de botón reutilizables ─────────────────────────────────────────

function btnEstilo(background: string, color: string): CSSProperties {
  return {
    background,
    color,
    border: "none",
    padding: "13px 8px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 12.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "-0.01em",
  };
}

function btnEstiloOutline(color: string, border: string, background = "white"): CSSProperties {
  return {
    background,
    color,
    border: `1.5px solid ${border}`,
    padding: "13px 8px",
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 12.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    fontFamily: "inherit",
    letterSpacing: "-0.01em",
  };
}

// ─── Componente ─────────────────────────────────────────────────────────────

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

  useWebSocket(["cuenta_actualizada", "mesas_actualizadas"], () => {
    obtenerCuenta();
    cargarMesa();
  });

  useEffect(() => {
    if (!mesaId) return;
    obtenerCuenta();
    cargarMesa();
  }, [mesaId, obtenerCuenta, cargarMesa]);

  const subtotal = consumidos.reduce(
    (acc, item) => acc + item.cantidad * item.precio_unitario,
    0
  );
  const servicio = Math.round(subtotal * 0.1);
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
    <div
      style={{
        minHeight: "100dvh",
        background: "#f1f5f3",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#0f1a13",
          color: "white",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          onClick={() => navigate("/mesas")}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white",
            width: 38,
            height: 38,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          <TbArrowLeft size={18} />
        </button>

        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: "rgba(22,163,74,0.2)",
            border: "1px solid rgba(22,163,74,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <TbToolsKitchen2 size={16} color="#4ade80" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.02em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {nombreMesa || `Mesa ${mesaId}`}
          </h1>
          <p style={{ margin: "2px 0 0", color: "#6b9e7e", fontSize: 12, fontWeight: 500 }}>
            Cuenta #{cuentaId || "—"}
          </p>
        </div>

        <span
          style={{
            background: "rgba(34,197,94,0.15)",
            color: "#86efac",
            border: "1px solid rgba(34,197,94,0.3)",
            padding: "5px 11px",
            borderRadius: 20,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.06em",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#4ade80",
              display: "inline-block",
            }}
          />
          ABIERTA
        </span>
      </div>

      {/* ── CONTENIDO ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 16px 220px" }}>

        {/* RESUMEN */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            border: "1px solid #e8eeeb",
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          <div style={{ padding: "14px 18px 0" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 10,
                fontSize: 13.5,
              }}
            >
              <span style={{ color: "#64748b", fontWeight: 500 }}>Subtotal</span>
              <strong style={{ color: "#1f2937", fontVariantNumeric: "tabular-nums" }}>
                ₡{subtotal.toLocaleString()}
              </strong>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 12,
                fontSize: 13.5,
              }}
            >
              <span style={{ color: "#64748b", fontWeight: 500 }}>Servicio 10%</span>
              <strong style={{ color: "#1f2937", fontVariantNumeric: "tabular-nums" }}>
                ₡{servicio.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* Total destacado */}
          <div
            style={{
              background: "#f0fdf4",
              borderTop: "1px solid #d1fae5",
              padding: "12px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>Total</span>
            <span
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#16a34a",
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ₡{totalCuenta.toLocaleString()}
            </span>
          </div>
        </div>

        {/* PRODUCTOS */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            border: "1px solid #e8eeeb",
            padding: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <TbReceipt size={15} color="#94a3b8" />
            <h2
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Productos consumidos
            </h2>
          </div>

          {consumidos.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 10px",
                color: "#94a3b8",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <TbReceipt size={22} color="#cbd5e1" />
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: "#94a3b8", fontWeight: 500 }}>
                Sin productos registrados
              </p>
            </div>
          )}

          {consumidos.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#f8fafc",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 10,
                border: "1px solid #e8eeeb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#1f2937",
                      lineHeight: 1.3,
                    }}
                  >
                    {item.producto}
                  </h3>
                  <p style={{ margin: "3px 0 0", color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>
                    ₡{item.precio_unitario.toLocaleString()} c/u
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#16a34a",
                    flexShrink: 0,
                    marginLeft: 12,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  ₡{(item.cantidad * item.precio_unitario).toLocaleString()}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* Stepper cantidad */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 9,
                    overflow: "hidden",
                    background: "white",
                  }}
                >
                  <button
                    onClick={() => restarProducto(item.id)}
                    style={{
                      width: 36,
                      height: 36,
                      border: "none",
                      background: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#64748b",
                    }}
                  >
                    <TbMinus size={14} />
                  </button>
                  <strong
                    style={{
                      width: 34,
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#1f2937",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.cantidad}
                  </strong>
                  <button
                    onClick={() => sumarProducto(item.id)}
                    style={{
                      width: 36,
                      height: 36,
                      border: "none",
                      background: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "#64748b",
                    }}
                  >
                    <TbPlus size={14} />
                  </button>
                </div>

                <button
                  onClick={() => eliminarProducto(item.id)}
                  style={{
                    marginLeft: "auto",
                    background: "#fef2f2",
                    color: "#dc2626",
                    border: "1.5px solid #fecaca",
                    padding: "8px 13px",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <TbTrash size={13} />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BARRA DE ACCIONES FIJA ─────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "white",
          borderTop: "1px solid #e8eeeb",
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          boxShadow: "0 -4px 24px rgba(0,0,0,0.07)",
          zIndex: 100,
        }}
      >
        <button
          onClick={() => setMostrarNuevaOrden(true)}
          style={btnEstilo("#16a34a", "white")}
        >
          <TbClipboardList size={15} />
          Nueva orden
        </button>

        <button
          onClick={() => setMostrarAgregarDirecto(true)}
          style={btnEstiloOutline("#2563eb", "#bfdbfe", "#eff6ff")}
        >
          <TbBolt size={15} />
          Agregar
        </button>

        <button
          onClick={() => setMostrarActividad(true)}
          style={btnEstiloOutline("#475569", "#e2e8f0")}
        >
          <TbClock size={15} />
          Actividad
        </button>

        <button
          onClick={() => setMostrarTransferir(true)}
          style={btnEstiloOutline("#2563eb", "#bfdbfe", "#eff6ff")}
        >
          <TbArrowsRightLeft size={15} />
          Transferir
        </button>

        <button
          onClick={liberarMesa}
          style={btnEstiloOutline("#ea580c", "#fed7aa", "#fff7ed")}
        >
          <TbLockOpen size={15} />
          Liberar
        </button>

        <button
          onClick={() => setMostrarCobro(true)}
          style={btnEstilo("#dc2626", "white")}
        >
          <TbCurrencyDollar size={15} />
          Cobrar
        </button>
      </div>

      {/* ── MODALES ────────────────────────────────────────────────────────── */}
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
        <ActividadMesaModal
          cuentaId={cuentaId}
          onClose={() => setMostrarActividad(false)}
        />
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