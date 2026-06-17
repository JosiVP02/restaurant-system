import { useEffect, useState } from "react";
import { api } from "../services/api";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, BaseDirectory, exists, mkdir } from "@tauri-apps/plugin-fs";
import { usePrinter } from "../hooks/usePrinter";

import { invoke } from "@tauri-apps/api/core";

import { QRCodeCanvas } from "qrcode.react";

interface Config {
  nombre_negocio: string;
  telefono: string;
  correo: string;
  direccion: string;
  logo: string;
  mensaje_factura: string;
  hora_inicio_operacion: string;
  hora_cierre_operacion: string;
}

const CARPETA_APP = "POSKEY";
const NOMBRE_LOGO = "logo.png";

export default function Configuracion() {
  const [config, setConfig] = useState<Config>({
    nombre_negocio: "",
    telefono: "",
    correo: "",
    direccion: "",
    logo: "",
    mensaje_factura: "Gracias por su visita",
    hora_inicio_operacion: "07:00",
    hora_cierre_operacion: "05:00",
  });

  const [rawConfig, setRawConfig]       = useState<Record<string, unknown>>({});
  const [guardando, setGuardando]       = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [logoPreview, setLogoPreview]   = useState<string>("");
  const [toast, setToast]               = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // ── IMPRESORA ─────────────────────────────────────────────
  const { imprimirPrecuenta } = usePrinter();
  const [vidInput, setVidInput] = useState("");
  const [pidInput, setPidInput] = useState("");
  const [testando, setTestando] = useState(false);


  const [red, setRed] = useState({
  host: "",
  ip: "",
  puerto: 8000,
  url: ""
});


useEffect(() => {
  async function cargarRed() {
    const info = await invoke("obtener_info_red");
    setRed(info as any);
  }

  cargarRed();
}, []);



  // Cargar VID/PID desde BD cuando llega rawConfig
  useEffect(() => {
    if (rawConfig.impresora_vid && rawConfig.impresora_pid) {
      setVidInput(Number(rawConfig.impresora_vid).toString(16).toUpperCase().padStart(4, "0"));
      setPidInput(Number(rawConfig.impresora_pid).toString(16).toUpperCase().padStart(4, "0"));
    }
  }, [rawConfig]);

  function guardarImpresora() {
    const vid = parseInt(vidInput, 16);
    const pid = parseInt(pidInput, 16);
    if (isNaN(vid) || isNaN(pid)) {
      showToast("VID/PID inválidos. Deben ser hexadecimales (ej: 04B8)", "err");
      return;
    }
    // Inyectar en rawConfig para que se guarde junto con "Guardar cambios"
    setRawConfig(prev => ({ ...prev, impresora_vid: vid, impresora_pid: pid }));
    showToast("VID/PID listos — presiona 'Guardar cambios' para confirmar en BD", "ok");
  }

  async function testImpresora() {
    const vid = parseInt(vidInput, 16);
    const pid = parseInt(pidInput, 16);
    if (isNaN(vid) || isNaN(pid)) {
      showToast("Configura el VID/PID primero", "err");
      return;
    }
    setTestando(true);
    try {
      await imprimirPrecuenta({
        negocio:     config.nombre_negocio || "POSKEY",
        direccion:   config.direccion || "",
        telefono:    config.telefono || "",
        num_factura: "TEST",
        fecha:       new Date().toLocaleString("es-CR"),
        cajero:      "Sistema",
        cliente:     "Prueba",
        lineas:      [{ nombre: "Producto prueba", cantidad: 1, precio_unit: 1000, subtotal: 1000 }],
        subtotal:    1000,
        impuesto:    0,
        total:       1000,
        metodo_pago: "—",
      });
      showToast("✅ Ticket de prueba impreso", "ok");
    } catch (e: any) {
      showToast(`Error: ${e.message ?? e}`, "err");
    } finally {
      setTestando(false);
    }
  }
  // ─────────────────────────────────────────────────────────

  async function cargar() {
    const res = await api.get("/configuracion");
    setRawConfig(res.data);
    setConfig({
      nombre_negocio:        res.data.nombre_negocio || "",
      telefono:              res.data.telefono || "",
      correo:                res.data.correo || "",
      direccion:             res.data.direccion || "",
      logo:                  res.data.logo || "",
      mensaje_factura:       res.data.mensaje_factura || "Gracias por su visita",
      hora_inicio_operacion: res.data.hora_inicio_operacion,
      hora_cierre_operacion: res.data.hora_cierre_operacion,
    });
    await cargarPreviewLogo(res.data.logo);
  }

  async function cargarPreviewLogo(logo: string) {
    if (!logo) { setLogoPreview(""); return; }
    try {
      const bytes = await readFile(`${CARPETA_APP}/${NOMBRE_LOGO}`, { baseDir: BaseDirectory.AppData });
      const blob = new Blob([bytes], { type: "image/png" });
      setLogoPreview(URL.createObjectURL(blob));
    } catch { setLogoPreview(""); }
  }

  async function seleccionarLogo() {
    const seleccionado = await open({
      multiple: false,
      filters: [{ name: "Imagen", extensions: ["png", "jpg", "jpeg"] }],
    });
    if (!seleccionado || typeof seleccionado !== "string") return;
    setSubiendoLogo(true);
    try {
      const bytes = await readFile(seleccionado);
      const carpetaExiste = await exists(CARPETA_APP, { baseDir: BaseDirectory.AppData });
      if (!carpetaExiste) await mkdir(CARPETA_APP, { baseDir: BaseDirectory.AppData, recursive: true });
      await writeFile(`${CARPETA_APP}/${NOMBRE_LOGO}`, bytes, { baseDir: BaseDirectory.AppData });
      const blob = new Blob([bytes], { type: "image/png" });
      setLogoPreview(URL.createObjectURL(blob));
      setConfig(c => ({ ...c, logo: NOMBRE_LOGO }));
      showToast("Logo cargado, recuerda guardar cambios", "ok");
    } catch (err) {
      console.error(err);
      showToast("No se pudo cargar el logo", "err");
    } finally { setSubiendoLogo(false); }
  }

  async function quitarLogo() {
    setConfig(c => ({ ...c, logo: "" }));
    setLogoPreview("");
  }

  async function guardar() {
    setGuardando(true);
    try {
      await api.put("/configuracion", { ...rawConfig, ...config });
      showToast("Configuración guardada correctamente", "ok");
      window.dispatchEvent(new CustomEvent("config-actualizada", {
        detail: { nombre_negocio: config.nombre_negocio }
      }));
    } catch { showToast("Error al guardar la configuración", "err"); }
    finally { setGuardando(false); }
  }

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => { cargar(); }, []);

  const field = (label: string, description: string, children: React.ReactNode) => (
    <div style={{
      background: "white", borderRadius: 14, border: "1px solid #e2e8f0",
      padding: "20px 24px", display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 24,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{label}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{description}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );

  const inputStyle: React.CSSProperties = {
    padding: "9px 14px", borderRadius: 9, border: "1px solid #cbd5e1",
    fontSize: 14, fontFamily: "'Inter', system-ui, sans-serif",
    color: "#0f172a", outline: "none", background: "#f8fafc",
    width: 180, boxSizing: "border-box",
  };

  const impresoraConfigurada = vidInput.length === 4 && pidInput.length === 4;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      overflow: "hidden", fontFamily: "'Inter', system-ui, sans-serif", background: "#f1f5f3",
    }}>
      {/* HEADER */}
      <div style={{ flexShrink: 0, padding: "24px 32px", borderBottom: "1px solid #e2e8f0", background: "#f1f5f3" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f1f1a", display: "flex", alignItems: "center", gap: 10 }}>
          ⚙️ Configuración
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>Ajustes generales del sistema</p>
      </div>

      {/* CONTENIDO */}
      <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "28px 32px",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 24,
                alignItems: "flex-start",
              }}
            >

          {/* ── COLUMNA IZQUIERDA: todos los ajustes ── */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>

          {/* Negocio */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 12 }}>
            Negocio
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {field("Nombre del negocio", "Aparece en tickets y reportes",
              <input style={{ ...inputStyle, width: 220 }} value={config.nombre_negocio}
                onChange={e => setConfig({ ...config, nombre_negocio: e.target.value })}
                placeholder="Ej: La Trattoria" />
            )}
          </div>

          {/* Horario */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 12 }}>
            Horario de operación
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40 }}>
            {field("Hora de apertura", "Inicio del turno operativo",
              <input type="time" style={inputStyle} value={config.hora_inicio_operacion}
                onChange={e => setConfig({ ...config, hora_inicio_operacion: e.target.value })} />
            )}
            {field("Hora de cierre", "Fin del turno operativo",
              <input type="time" style={inputStyle} value={config.hora_cierre_operacion}
                onChange={e => setConfig({ ...config, hora_cierre_operacion: e.target.value })} />
            )}
          </div>

          {/* Facturación */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 12, marginTop: 30 }}>
            Facturación
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {field("Teléfono", "Aparece en la factura",
              <input style={inputStyle} value={config.telefono}
                onChange={e => setConfig({ ...config, telefono: e.target.value })} />
            )}
            {field("Correo", "Correo del negocio",
              <input style={{ ...inputStyle, width: 250 }} value={config.correo}
                onChange={e => setConfig({ ...config, correo: e.target.value })} />
            )}
            {field("Dirección", "Aparece en la factura",
              <input style={{ ...inputStyle, width: 320 }} value={config.direccion}
                onChange={e => setConfig({ ...config, direccion: e.target.value })} />
            )}
            {field("Mensaje final", "Pie de factura",
              <input style={{ ...inputStyle, width: 320 }} value={config.mensaje_factura}
                onChange={e => setConfig({ ...config, mensaje_factura: e.target.value })} />
            )}
          </div>

          {/* ── IMPRESORA TÉRMICA ── */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 12 }}>
            Impresora Térmica
          </div>
          <div style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px", marginBottom: 32 }}>

            {/* Estado */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: impresoraConfigurada ? "#22c55e" : "#94a3b8", flexShrink: 0 }}/>
              <span style={{ fontSize: 13, color: impresoraConfigurada ? "#15803d" : "#94a3b8", fontWeight: 600 }}>
                {impresoraConfigurada
                  ? `Configurada — VID: ${vidInput}  PID: ${pidInput}`
                  : "Sin impresora configurada"}
              </span>
            </div>

            {/* Instrucciones */}
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginBottom: 18, fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
              <strong style={{ color: "#0f172a" }}>¿Cómo obtener el VID y PID?</strong><br/>
              1. Conecta la impresora por USB<br/>
              2. Abre el <strong>Administrador de Dispositivos</strong> de Windows<br/>
              3. Busca la impresora en "Dispositivos de interfaz universal de bus serie"<br/>
              4. Clic derecho → Propiedades → Detalles → ID de Hardware<br/>
              5. Verás algo como: <code style={{ background: "#e2e8f0", padding: "1px 6px", borderRadius: 4 }}>USB\VID_04B8&PID_0202</code>
            </div>

            {/* Inputs */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  VID (hex)
                </label>
                <input
                  value={vidInput}
                  onChange={e => setVidInput(e.target.value.toUpperCase())}
                  placeholder="04B8"
                  maxLength={4}
                  style={{ ...inputStyle, width: 100, fontFamily: "monospace", letterSpacing: "0.1em" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                  PID (hex)
                </label>
                <input
                  value={pidInput}
                  onChange={e => setPidInput(e.target.value.toUpperCase())}
                  placeholder="0202"
                  maxLength={4}
                  style={{ ...inputStyle, width: 100, fontFamily: "monospace", letterSpacing: "0.1em" }}
                />
              </div>
              <button onClick={guardarImpresora} style={{
                padding: "9px 18px", borderRadius: 9, border: "none",
                background: "linear-gradient(135deg,#16a34a,#22c55e)",
                color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>
                💾 Aplicar
              </button>
              {impresoraConfigurada && (
                <button onClick={testImpresora} disabled={testando} style={{
                  padding: "9px 18px", borderRadius: 9,
                  border: "1px solid #ddd6fe", background: "#f5f3ff",
                  color: "#7c3aed", fontWeight: 700, fontSize: 13,
                  cursor: testando ? "default" : "pointer",
                  opacity: testando ? 0.6 : 1,
                }}>
                  {testando ? "Imprimiendo…" : "🖨️ Test"}
                </button>
              )}
            </div>
          </div>

          {/* Logo */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 12 }}>
            Logo
          </div>
          <div style={{ marginBottom: 40 }}>
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 24px", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 76, height: 76, borderRadius: 12, border: "1px dashed #cbd5e1", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  : <span style={{ fontSize: 22, opacity: 0.4 }}>🖼️</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Logo del restaurante</div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>Se mostrará en la parte superior de la factura. PNG o JPG.</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {logoPreview && (
                  <button onClick={quitarLogo} style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #fed7aa", background: "#fff7ed", color: "#c2410c", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}>
                    Quitar
                  </button>
                )}
                <button onClick={seleccionarLogo} disabled={subiendoLogo} style={{ padding: "9px 16px", borderRadius: 9, border: "1px solid #cbd5e1", background: subiendoLogo ? "#f1f5f9" : "white", color: "#0f172a", fontWeight: 600, fontSize: 13, cursor: subiendoLogo ? "default" : "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {subiendoLogo ? "Cargando…" : "Seleccionar imagen"}
                </button>
              </div>
            </div>
          </div>

          {/* BOTÓN GUARDAR */}
          <button onClick={guardar} disabled={guardando} style={{
            padding: "12px 32px", borderRadius: 10, border: "none",
            background: guardando ? "#86efac" : "linear-gradient(135deg, #22c55e, #15803d)",
            color: "white", fontWeight: 700, fontSize: 14,
            cursor: guardando ? "default" : "pointer",
            fontFamily: "'Inter', system-ui, sans-serif",
            boxShadow: "0 4px 12px rgba(34,197,94,0.3)", transition: "opacity 0.15s",
          }}>
            {guardando ? "Guardando…" : "💾 Guardar cambios"}
          </button>

          </div>
          {/* ── FIN COLUMNA IZQUIERDA ── */}

          {/* ── COLUMNA DERECHA: QR / red ── */}
          <div
            style={{
              width: 380,
              position: "sticky",
              top: 24,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 18,
                padding: 24,
                boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  marginBottom: 20,
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                🌐 POSKEY Mobile
              </h3>

              <div style={{ marginBottom: 10 }}>
                <strong>Host:</strong> {red.host}
              </div>

              <div style={{ marginBottom: 10 }}>
                <strong>IP:</strong> {red.ip}
              </div>

              <div style={{ marginBottom: 10 }}>
                <strong>Puerto:</strong> {red.puerto}
              </div>

              <div
                style={{
                  marginBottom: 20,
                  padding: 10,
                  borderRadius: 10,
                  background: "#f8fafc",
                  color: "#0284c7",
                  fontSize: 13,
                  wordBreak: "break-all",
                }}
              >
                {red.url}/mobile
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <QRCodeCanvas
                  value={`${red.url}/mobile`}
                  size={220}
                />
              </div>

              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    `${red.url}/mobile`
                  )
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 10,
                  border: "none",
                  background:
                    "linear-gradient(135deg,#22c55e,#16a34a)",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📋 Copiar URL
              </button>
            </div>
          </div>
          {/* ── FIN COLUMNA DERECHA ── */}

        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          padding: "10px 20px", borderRadius: 99, fontSize: 13, fontWeight: 600,
          whiteSpace: "nowrap",
          background: toast.type === "ok" ? "#f0fdf4" : "#fff7ed",
          border: `1px solid ${toast.type === "ok" ? "#bbf7d0" : "#fed7aa"}`,
          color: toast.type === "ok" ? "#15803d" : "#c2410c", zIndex: 200,
        }}>
          {toast.msg}
        </div>
      )}

      
    </div>
  );
}