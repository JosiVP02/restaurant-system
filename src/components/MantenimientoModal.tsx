import { useEffect, useState } from "react";
import { X, Trash2, CalendarRange, AlertTriangle, Loader2 } from "lucide-react";
import { api } from "../services/api";

interface Props {
  onClose: () => void;
}

interface Resumen {
  ordenes_borrables: number;
  detalles_orden_borrables: number;
  cuentas_borrables?: number;
  detalles_cuenta_borrables?: number;
  pagos_borrables?: number;
  ordenes_de_cuentas_borrables?: number;
}

type Vista = "menu" | "ordenes" | "cuentas";

const PALABRA_CONFIRMACION = "ELIMINAR";

export default function MantenimientoModal({ onClose }: Props) {
  const [vista, setVista] = useState<Vista>("menu");
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);
  const [textoConfirmacion, setTextoConfirmacion] = useState("");
  const [resultado, setResultado] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");

  // Bloquear scroll del fondo mientras el modal está abierto
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  async function cargarResumenOrdenes() {
    setCargandoResumen(true);
    setError("");
    try {
      const res = await api.get("/mantenimiento/resumen");
      setResumen(res.data);
    } catch (e: any) {
      setError("No se pudo cargar el resumen. Verifique la conexión con el servidor.");
    } finally {
      setCargandoResumen(false);
    }
  }

  async function cargarResumenCuentas() {
    if (!desde || !hasta) return;
    setCargandoResumen(true);
    setError("");
    try {
      const res = await api.get("/mantenimiento/resumen", { params: { desde, hasta } });
      setResumen(res.data);
    } catch (e: any) {
      setError("No se pudo cargar el resumen. Verifique la conexión con el servidor.");
    } finally {
      setCargandoResumen(false);
    }
  }

  function irAVista(v: Vista) {
    setVista(v);
    setResumen(null);
    setTextoConfirmacion("");
    setResultado("");
    setError("");
    if (v === "ordenes") cargarResumenOrdenes();
  }

  useEffect(() => {
    if (vista === "cuentas" && desde && hasta) {
      cargarResumenCuentas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, vista]);

  async function ejecutarLimpiezaOrdenes() {
    setEjecutando(true);
    setError("");
    try {
      const res = await api.delete("/mantenimiento/ordenes");
      setResultado(
        `Se eliminaron ${res.data.ordenes_eliminadas} órdenes y ${res.data.detalles_eliminados} productos asociados.`
      );
      setTextoConfirmacion("");
      cargarResumenOrdenes();
    } catch (e: any) {
      setError("Ocurrió un error al eliminar. No se realizaron cambios.");
    } finally {
      setEjecutando(false);
    }
  }

  async function ejecutarLimpiezaCuentas() {
    setEjecutando(true);
    setError("");
    try {
      const res = await api.delete("/mantenimiento/cuentas", { params: { desde, hasta } });
      setResultado(
        `Se eliminaron ${res.data.cuentas_eliminadas} cuentas, ${res.data.ordenes_eliminadas} órdenes y sus productos asociados.`
      );
      setTextoConfirmacion("");
      cargarResumenCuentas();
    } catch (e: any) {
      setError("Ocurrió un error al eliminar. No se realizaron cambios.");
    } finally {
      setEjecutando(false);
    }
  }

  const confirmacionValida = textoConfirmacion.trim().toUpperCase() === PALABRA_CONFIRMACION;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 31, 26, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 18,
          width: "100%",
          maxWidth: 540,
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: "1px solid #eef2f0",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f1f1a" }}>
              Mantenimiento de base de datos
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
              Libera espacio eliminando registros antiguos
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f3",
              border: "none",
              borderRadius: 8,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748b",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {vista === "menu" && (
            <div style={{ display: "grid", gap: 12 }}>
              <button
                onClick={() => irAVista("ordenes")}
                style={cardBotonStyle}
              >
                <Trash2 size={20} color="#475569" style={{ flexShrink: 0 }} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: "#1f2937" }}>
                    Limpiar órdenes entregadas
                  </div>
                  <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>
                    Elimina órdenes ya entregadas que no pertenecen a una mesa activa
                  </div>
                </div>
              </button>

              <button
                onClick={() => irAVista("cuentas")}
                style={cardBotonStyle}
              >
                <CalendarRange size={20} color="#475569" style={{ flexShrink: 0 }} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: "#1f2937" }}>
                    Eliminar histórico de cuentas
                  </div>
                  <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 2 }}>
                    Elimina cuentas cerradas o anuladas dentro de un rango de fechas
                  </div>
                </div>
              </button>
            </div>
          )}

          {vista === "ordenes" && (
            <VistaAccion
              titulo="Limpiar órdenes entregadas"
              descripcion="Esta acción eliminará permanentemente las órdenes con todos sus productos marcados como ENTREGADO, siempre que ya no pertenezcan a una mesa con cuenta activa. Las órdenes de mesas abiertas nunca se tocan."
              cargandoResumen={cargandoResumen}
              resumenItems={
                resumen
                  ? [
                      { label: "Órdenes a eliminar", valor: resumen.ordenes_borrables },
                      { label: "Productos asociados", valor: resumen.detalles_orden_borrables },
                    ]
                  : []
              }
              sinDatos={resumen?.ordenes_borrables === 0}
              textoConfirmacion={textoConfirmacion}
              setTextoConfirmacion={setTextoConfirmacion}
              confirmacionValida={confirmacionValida}
              ejecutando={ejecutando}
              resultado={resultado}
              error={error}
              onVolver={() => irAVista("menu")}
              onEjecutar={ejecutarLimpiezaOrdenes}
            />
          )}

          {vista === "cuentas" && (
            <VistaAccion
              titulo="Eliminar histórico de cuentas"
              descripcion="Esta acción eliminará permanentemente las cuentas cerradas o anuladas dentro del rango seleccionado, junto con sus productos, pagos y órdenes asociadas. Las cuentas con mesa activa nunca se incluyen, sin importar la fecha."
              cargandoResumen={cargandoResumen}
              resumenItems={
                resumen
                  ? [
                      { label: "Cuentas a eliminar", valor: resumen.cuentas_borrables ?? 0 },
                      { label: "Productos de cuenta", valor: resumen.detalles_cuenta_borrables ?? 0 },
                      { label: "Pagos asociados", valor: resumen.pagos_borrables ?? 0 },
                      { label: "Órdenes asociadas", valor: resumen.ordenes_de_cuentas_borrables ?? 0 },
                    ]
                  : []
              }
              sinDatos={resumen ? (resumen.cuentas_borrables ?? 0) === 0 : false}
              requiereFechas
              desde={desde}
              hasta={hasta}
              setDesde={setDesde}
              setHasta={setHasta}
              textoConfirmacion={textoConfirmacion}
              setTextoConfirmacion={setTextoConfirmacion}
              confirmacionValida={confirmacionValida}
              ejecutando={ejecutando}
              resultado={resultado}
              error={error}
              onVolver={() => irAVista("menu")}
              onEjecutar={ejecutarLimpiezaCuentas}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const cardBotonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  padding: "16px 16px",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
};

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponente: vista de una acción de borrado (resumen + confirmación)
// ─────────────────────────────────────────────────────────────────────────────

interface VistaAccionProps {
  titulo: string;
  descripcion: string;
  cargandoResumen: boolean;
  resumenItems: { label: string; valor: number }[];
  sinDatos?: boolean;
  requiereFechas?: boolean;
  desde?: string;
  hasta?: string;
  setDesde?: (v: string) => void;
  setHasta?: (v: string) => void;
  textoConfirmacion: string;
  setTextoConfirmacion: (v: string) => void;
  confirmacionValida: boolean;
  ejecutando: boolean;
  resultado: string;
  error: string;
  onVolver: () => void;
  onEjecutar: () => void;
}

function VistaAccion({
  titulo,
  descripcion,
  cargandoResumen,
  resumenItems,
  sinDatos,
  requiereFechas,
  desde,
  hasta,
  setDesde,
  setHasta,
  textoConfirmacion,
  setTextoConfirmacion,
  confirmacionValida,
  ejecutando,
  resultado,
  error,
  onVolver,
  onEjecutar,
}: VistaAccionProps) {
  const fechasIncompletas = requiereFechas && (!desde || !hasta);
  const puedeEjecutar = confirmacionValida && !ejecutando && !sinDatos && !fechasIncompletas;

  return (
    <div>
      <button
        onClick={onVolver}
        style={{
          background: "none",
          border: "none",
          color: "#64748b",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          padding: 0,
          marginBottom: 16,
        }}
      >
        ← Volver
      </button>

      <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800, color: "#0f1f1a" }}>
        {titulo}
      </h3>
      <p style={{ margin: "0 0 18px", fontSize: 13.5, color: "#64748b", lineHeight: 1.6 }}>
        {descripcion}
      </p>

      {requiereFechas && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde?.(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta?.(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* RESUMEN */}
      {(!requiereFechas || (desde && hasta)) && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            marginBottom: 18,
          }}
        >
          {cargandoResumen ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 13 }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              Calculando registros afectados…
            </div>
          ) : resumenItems.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {resumenItems.map((item) => (
                <div
                  key={item.label}
                  style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}
                >
                  <span style={{ color: "#64748b" }}>{item.label}</span>
                  <strong style={{ color: item.valor > 0 ? "#0f1f1a" : "#94a3b8" }}>
                    {item.valor.toLocaleString()}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Sin datos todavía.</p>
          )}
        </div>
      )}

      {sinDatos && (
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
          No hay registros que cumplan los criterios de eliminación en este momento.
        </p>
      )}

      {resultado && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 18,
            fontSize: 13.5,
            color: "#15803d",
            fontWeight: 600,
          }}
        >
          {resultado}
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 18,
            fontSize: 13.5,
            color: "#dc2626",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      {!sinDatos && !fechasIncompletas && (
        <div
          style={{
            border: "1px solid #fed7aa",
            background: "#fff7ed",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
            <AlertTriangle size={18} color="#c2410c" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 13, color: "#9a3412", lineHeight: 1.6 }}>
              Esta acción no se puede deshacer. Para confirmar, escriba{" "}
              <strong>{PALABRA_CONFIRMACION}</strong> en el campo de abajo.
            </p>
          </div>
          <input
            type="text"
            value={textoConfirmacion}
            onChange={(e) => setTextoConfirmacion(e.target.value)}
            placeholder={PALABRA_CONFIRMACION}
            style={{
              ...inputStyle,
              marginBottom: 12,
              borderColor: textoConfirmacion && !confirmacionValida ? "#fca5a5" : "#fed7aa",
            }}
          />
          <button
            onClick={onEjecutar}
            disabled={!puedeEjecutar}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 10,
              border: "none",
              background: puedeEjecutar
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "#e2e8f0",
              color: puedeEjecutar ? "white" : "#94a3b8",
              fontWeight: 800,
              fontSize: 14,
              cursor: puedeEjecutar ? "pointer" : "not-allowed",
            }}
          >
            {ejecutando ? "Eliminando…" : "Eliminar permanentemente"}
          </button>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#64748b",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 13.5,
  boxSizing: "border-box",
  outline: "none",
};