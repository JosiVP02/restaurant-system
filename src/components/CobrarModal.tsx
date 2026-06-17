import { useState } from "react";
import { api } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import { generarFacturaPDF } from "../utils/factura";
import { usePrinter } from "../hooks/usePrinter";

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

const metodos = [
  { id: "Efectivo", icon: "💵" },
  { id: "Tarjeta", icon: "💳" },
  { id: "SINPE",   icon: "📱" },
];

export default function CobrarModal({ cuentaId, total, onClose, onCobrado }: Props) {
  const { imprimirPrecuenta } = usePrinter();

  const [metodo,          setMetodo]          = useState("Efectivo");
  const [aplicarServicio, setAplicarServicio] = useState(true);
  const [recibido,        setRecibido]        = useState(0);
  const [cobrando,        setCobrando]        = useState(false);
  const [descargarPDF,    setDescargarPDF]    = useState(true);
  const [imprimir,        setImprimir]        = useState(false);
  const [confirm,         setConfirm]         = useState<any>(null);

  const servicio   = aplicarServicio ? total * 0.1 : 0;
  const totalFinal = total + servicio;
  const vuelto     = metodo === "Efectivo" ? Math.max(recibido - totalFinal, 0) : 0;

  async function handleImprimirFactura(idCuenta: number) {
    const cfgRes    = await api.get("/configuracion");
    const cfg       = cfgRes.data;
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

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(15,31,26,0.55)",
      backdropFilter: "blur(2px)",
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 9999, padding: 20,
    }}>
      <div style={{
        width: "560px", maxWidth: "95vw",
        background: "white", borderRadius: 20, overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>

        {/* HEADER */}
        <div style={{
          padding: "24px 28px",
          background: "linear-gradient(135deg, #16a34a, #15803d)",
          color: "white",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}>
              🧾
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em" }}>
                Cobrar Cuenta
              </h2>
              <p style={{ margin: 0, marginTop: 2, opacity: 0.85, fontSize: 13.5 }}>
                Cuenta #{cuentaId} · Confirmar pago
              </p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: "24px 28px", maxHeight: "65vh", overflowY: "auto" }}>

          {/* RESUMEN */}
          <div style={{
            background: "#f8fafc", border: "1px solid #eef2f0",
            padding: 20, borderRadius: 14, marginBottom: 22,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14.5, color: "#475569" }}>
              <span>Subtotal</span>
              <strong style={{ color: "#1f2937" }}>₡{total.toLocaleString()}</strong>
            </div>

            <label style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10, marginBottom: 10, padding: "10px 12px", borderRadius: 10,
              background: aplicarServicio ? "#ecfdf5" : "#f1f5f9",
              border: aplicarServicio ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              cursor: "pointer", transition: "background 0.15s",
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>
                Aplicar servicio 10%
              </span>
              <input
                type="checkbox" checked={aplicarServicio}
                onChange={e => setAplicarServicio(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#16a34a" }}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 14.5, color: "#475569" }}>
              <span>Servicio</span>
              <strong style={{ color: "#1f2937" }}>₡{servicio.toLocaleString()}</strong>
            </div>

            <div style={{ height: 1, background: "#e2e8f0", marginBottom: 14 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#1f2937" }}>Total</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: "#16a34a", letterSpacing: "-0.02em" }}>
                ₡{totalFinal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* MÉTODO */}
          <h3 style={{
            margin: "0 0 12px", fontSize: 14, fontWeight: 700,
            color: "#334155", textTransform: "uppercase", letterSpacing: "0.06em",
          }}>
            Método de Pago
          </h3>

          <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
            {metodos.map(({ id: m, icon }) => (
              <button key={m} onClick={() => setMetodo(m)} style={{
                flex: 1, padding: "16px 10px", borderRadius: 12, cursor: "pointer",
                border:      metodo === m ? "2px solid #16a34a" : "2px solid #e2e8f0",
                background:  metodo === m ? "#ecfdf5" : "white",
                fontWeight: 700, fontSize: 13.5,
                color:       metodo === m ? "#15803d" : "#475569",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 6, transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                {m}
              </button>
            ))}
          </div>

          {/* EFECTIVO */}
          {metodo === "Efectivo" && (
            <div style={{ background: "#fafafa", border: "1px solid #eef2f0", borderRadius: 14, padding: 18, marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Monto recibido
              </label>
              <div style={{ position: "relative", marginTop: 8 }}>
                <span style={{
                  position: "absolute", left: 14, top: "50%",
                  transform: "translateY(-50%)", color: "#94a3b8", fontWeight: 700,
                }}>₡</span>
                <input
                  type="number" value={recibido}
                  onChange={e => setRecibido(Number(e.target.value))}
                  style={{
                    width: "100%", padding: "14px 14px 14px 32px",
                    borderRadius: 10, border: "1px solid #d1d5db",
                    fontSize: 18, fontWeight: 700, color: "#1f2937",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{
                marginTop: 14, padding: "16px 18px",
                background: "#ecfdf5", border: "1px solid #bbf7d0",
                borderRadius: 12, display: "flex",
                justifyContent: "space-between", alignItems: "center",
              }}>
                <strong style={{ color: "#166534", fontSize: 14 }}>Vuelto</strong>
                <span style={{ fontSize: 24, fontWeight: 800, color: "#16a34a" }}>
                  ₡{vuelto.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* OPCIONES DE FACTURA */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 10 }}>
            Factura
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10, padding: "10px 12px", borderRadius: 10,
              background: descargarPDF ? "#ecfdf5" : "#f1f5f9",
              border: descargarPDF ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              cursor: "pointer", transition: "background 0.15s",
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>Descargar factura PDF</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Guarda el PDF en tu computadora</div>
              </div>
              <input
                type="checkbox" checked={descargarPDF}
                onChange={e => setDescargarPDF(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#16a34a", flexShrink: 0 }}
              />
            </label>

            <label style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10, padding: "10px 12px", borderRadius: 10,
              background: imprimir ? "#ecfdf5" : "#f1f5f9",
              border: imprimir ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              cursor: "pointer", transition: "background 0.15s",
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>Imprimir factura térmica</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Envía a la impresora configurada</div>
              </div>
              <input
                type="checkbox" checked={imprimir}
                onChange={e => setImprimir(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "#16a34a", flexShrink: 0 }}
              />
            </label>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          padding: "18px 28px", borderTop: "1px solid #eef2f0",
          display: "flex", justifyContent: "flex-end", gap: 10,
          background: "#fafafa",
        }}>
          <button onClick={onClose} style={{
            padding: "12px 22px", borderRadius: 10,
            border: "1px solid #d1d5db", background: "white",
            color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}>
            Cancelar
          </button>

          <button
            onClick={() => setConfirm({ accion: cobrar })}
            disabled={cobrando}
            style={{
              flex: 1, padding: "14px", border: "none", borderRadius: 12,
              background: cobrando
                ? "#86efac"
                : "linear-gradient(135deg, #16a34a, #22c55e)",
              color: "white", fontWeight: 800, fontSize: 15,
              cursor: cobrando ? "default" : "pointer",
              boxShadow: "0 8px 20px rgba(34,197,94,.25)",
              transition: "all .15s ease",
            }}
            onMouseEnter={e => { if (!cobrando) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {cobrando ? "Procesando…" : "💰 Cobrar Cuenta"}
          </button>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          titulo="Cobrar cuenta"
          descripcion={`Total: ₡${totalFinal.toLocaleString()}\n\nMétodo: ${metodo}`}
          tipo="money"
          textoConfirmar="Cobrar"
          onConfirmar={() => { confirm.accion(); setConfirm(null); }}
          onCancelar={() => setConfirm(null)}
        />
      )}
    </div>
  );
}