import { useEffect, useState } from "react";
import { api } from "../services/api";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, BaseDirectory, exists, mkdir } from "@tauri-apps/plugin-fs";
import { usePrinter } from "../hooks/usePrinter";
import { invoke } from "@tauri-apps/api/core";
import { QRCodeCanvas } from "qrcode.react";
import {
  Settings,
  Save,
  Printer,
  Globe,
  Copy,
  ImageIcon,
  Building2,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Clock,
  Usb,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  X,
  Wifi,
} from "lucide-react";

// ─── Paleta ───────────────────────────────────────────────
const C = {
  bg:          "#f4f6f5",
  surface:     "#ffffff",
  border:      "#e4e9e6",
  borderHover: "#c8d5cf",
  accent:      "#16a34a",
  accentLight: "#f0fdf4",
  accentMid:   "#bbf7d0",
  text:        "#0f1f1a",
  textSub:     "#5a7068",
  textMuted:   "#96aaa4",
  danger:      "#dc2626",
  dangerLight: "#fff7f7",
  dangerBorder:"#fca5a5",
  purple:      "#7c3aed",
  purpleLight: "#f5f3ff",
  purpleBorder:"#ddd6fe",
};

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

// ─── Componente de sección label ──────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginBottom: 12,
    }}>
      <div style={{ height: 1, width: 16, background: C.borderHover }} />
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", color: C.textMuted,
        whiteSpace: "nowrap",
      }}>
        {children}
      </span>
      <div style={{ height: 1, flex: 1, background: C.border }} />
    </div>
  );
}

// ─── Campo de formulario ──────────────────────────────────
function Field({
  icon, label, description, children,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: C.surface,
      borderRadius: 12,
      border: `1px solid ${C.border}`,
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: C.accentLight, border: `1px solid ${C.accentMid}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: C.accent,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{description}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  fontSize: 13,
  fontFamily: "'Inter', system-ui, sans-serif",
  color: C.text,
  outline: "none",
  background: C.bg,
  width: 180,
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

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

  const { imprimirPrecuenta } = usePrinter();
  const [vidInput, setVidInput] = useState("");
  const [pidInput, setPidInput] = useState("");
  const [testando, setTestando] = useState(false);

  const [red, setRed] = useState({ host: "", ip: "", puerto: 8000, url: "" });

  useEffect(() => {
    async function cargarRed() {
      const info = await invoke("obtener_info_red");
      setRed(info as any);
    }
    cargarRed();
  }, []);

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
      showToast("Ticket de prueba impreso correctamente", "ok");
    } catch (e: any) {
      showToast(`Error: ${e.message ?? e}`, "err");
    } finally {
      setTestando(false);
    }
  }

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
      showToast("Logo cargado. Guarda los cambios para confirmar.", "ok");
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
        detail: { nombre_negocio: config.nombre_negocio, logo: config.logo }
      }));
    } catch { showToast("Error al guardar la configuración", "err"); }
    finally { setGuardando(false); }
  }

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => { cargar(); }, []);

  const impresoraConfigurada = vidInput.length === 4 && pidInput.length === 4;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      overflow: "hidden", fontFamily: "'Inter', system-ui, sans-serif",
      background: C.bg,
    }}>

      {/* ── HEADER ──────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: "20px 32px",
        borderBottom: `1px solid ${C.border}`,
        background: C.surface,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: C.accentLight, border: `1px solid ${C.accentMid}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.accent,
          }}>
            <Settings size={18} strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>
              Configuración
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>
              Ajustes generales del sistema
            </p>
          </div>
        </div>

        {/* Botón guardar en header — siempre visible */}
        <button
          onClick={guardar}
          disabled={guardando}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 20px", borderRadius: 9, border: "none",
            background: guardando
              ? C.accentMid
              : `linear-gradient(135deg, ${C.accent}, #15803d)`,
            color: "white", fontWeight: 600, fontSize: 13,
            cursor: guardando ? "default" : "pointer",
            boxShadow: guardando ? "none" : "0 2px 8px rgba(22,163,74,0.25)",
            transition: "all 0.15s",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        >
          <Save size={15} strokeWidth={2.2} />
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>

      {/* ── CONTENIDO ───────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", maxWidth: 1100 }}>

          {/* ── COLUMNA IZQUIERDA ── */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 28 }}>

            {/* NEGOCIO */}
            <section>
              <SectionLabel>Negocio</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Field
                  icon={<Building2 size={16} strokeWidth={2} />}
                  label="Nombre del negocio"
                  description="Aparece en tickets y reportes"
                >
                  <input
                    style={{ ...inputStyle, width: 220 }}
                    value={config.nombre_negocio}
                    onChange={e => setConfig({ ...config, nombre_negocio: e.target.value })}
                    placeholder="Ej: La Trattoria"
                  />
                </Field>
              </div>
            </section>

            {/* HORARIO */}
            <section>
              <SectionLabel>Horario de operación</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Field
                  icon={<Clock size={16} strokeWidth={2} />}
                  label="Hora de apertura"
                  description="Inicio del turno operativo"
                >
                  <input
                    type="time"
                    style={inputStyle}
                    value={config.hora_inicio_operacion}
                    onChange={e => setConfig({ ...config, hora_inicio_operacion: e.target.value })}
                  />
                </Field>
                <Field
                  icon={<Clock size={16} strokeWidth={2} />}
                  label="Hora de cierre"
                  description="Fin del turno operativo"
                >
                  <input
                    type="time"
                    style={inputStyle}
                    value={config.hora_cierre_operacion}
                    onChange={e => setConfig({ ...config, hora_cierre_operacion: e.target.value })}
                  />
                </Field>
              </div>
            </section>

            {/* FACTURACIÓN */}
            <section>
              <SectionLabel>Facturación</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Field
                  icon={<Phone size={16} strokeWidth={2} />}
                  label="Teléfono"
                  description="Aparece en la factura"
                >
                  <input
                    style={inputStyle}
                    value={config.telefono}
                    onChange={e => setConfig({ ...config, telefono: e.target.value })}
                  />
                </Field>
                <Field
                  icon={<Mail size={16} strokeWidth={2} />}
                  label="Correo electrónico"
                  description="Correo del negocio"
                >
                  <input
                    style={{ ...inputStyle, width: 250 }}
                    value={config.correo}
                    onChange={e => setConfig({ ...config, correo: e.target.value })}
                  />
                </Field>
                <Field
                  icon={<MapPin size={16} strokeWidth={2} />}
                  label="Dirección"
                  description="Aparece en la factura"
                >
                  <input
                    style={{ ...inputStyle, width: 300 }}
                    value={config.direccion}
                    onChange={e => setConfig({ ...config, direccion: e.target.value })}
                  />
                </Field>
                <Field
                  icon={<MessageSquare size={16} strokeWidth={2} />}
                  label="Mensaje final"
                  description="Pie de factura"
                >
                  <input
                    style={{ ...inputStyle, width: 300 }}
                    value={config.mensaje_factura}
                    onChange={e => setConfig({ ...config, mensaje_factura: e.target.value })}
                  />
                </Field>
              </div>
            </section>

            {/* IMPRESORA */}
            <section>
              <SectionLabel>Impresora térmica</SectionLabel>
              <div style={{
                background: C.surface,
                borderRadius: 14,
                border: `1px solid ${C.border}`,
                overflow: "hidden",
              }}>
                {/* Status bar */}
                <div style={{
                  padding: "14px 20px",
                  borderBottom: `1px solid ${C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: impresoraConfigurada ? C.accentLight : C.bg,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: impresoraConfigurada ? C.accent : C.textMuted,
                    }} />
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: impresoraConfigurada ? C.accent : C.textMuted,
                    }}>
                      {impresoraConfigurada
                        ? `Configurada — VID: ${vidInput}  ·  PID: ${pidInput}`
                        : "Sin impresora configurada"}
                    </span>
                  </div>
                  {impresoraConfigurada && (
                    <CheckCircle2 size={16} color={C.accent} strokeWidth={2} />
                  )}
                </div>

                <div style={{ padding: "20px 20px" }}>
                  {/* Instrucciones */}
                  <div style={{
                    background: C.bg,
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    padding: "14px 16px",
                    marginBottom: 20,
                    fontSize: 12,
                    color: C.textSub,
                    lineHeight: 1.7,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: C.text, fontWeight: 600, fontSize: 12 }}>
                      <Usb size={13} strokeWidth={2} />
                      ¿Cómo obtener el VID y PID?
                    </div>
                    1. Conecta la impresora por USB<br />
                    2. Abre el <strong>Administrador de Dispositivos</strong> de Windows<br />
                    3. Busca la impresora en "Dispositivos de interfaz universal de bus serie"<br />
                    4. Clic derecho → Propiedades → Detalles → ID de Hardware<br />
                    5. Verás algo como:{" "}
                    <code style={{
                      background: C.border, padding: "1px 6px",
                      borderRadius: 4, fontFamily: "monospace", fontSize: 11,
                    }}>
                      USB\VID_04B8&PID_0202
                    </code>
                  </div>

                  {/* Inputs + botones */}
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div>
                      <label style={{
                        display: "block", fontSize: 10, fontWeight: 700,
                        color: C.textMuted, textTransform: "uppercase",
                        letterSpacing: "0.08em", marginBottom: 6,
                      }}>
                        VID (hex)
                      </label>
                      <input
                        value={vidInput}
                        onChange={e => setVidInput(e.target.value.toUpperCase())}
                        placeholder="04B8"
                        maxLength={4}
                        style={{
                          ...inputStyle, width: 90,
                          fontFamily: "monospace", letterSpacing: "0.12em",
                          textAlign: "center", fontSize: 14, fontWeight: 600,
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: "block", fontSize: 10, fontWeight: 700,
                        color: C.textMuted, textTransform: "uppercase",
                        letterSpacing: "0.08em", marginBottom: 6,
                      }}>
                        PID (hex)
                      </label>
                      <input
                        value={pidInput}
                        onChange={e => setPidInput(e.target.value.toUpperCase())}
                        placeholder="0202"
                        maxLength={4}
                        style={{
                          ...inputStyle, width: 90,
                          fontFamily: "monospace", letterSpacing: "0.12em",
                          textAlign: "center", fontSize: 14, fontWeight: 600,
                        }}
                      />
                    </div>

                    <button
                      onClick={guardarImpresora}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 16px", borderRadius: 8, border: "none",
                        background: `linear-gradient(135deg, ${C.accent}, #15803d)`,
                        color: "white", fontWeight: 600, fontSize: 13, cursor: "pointer",
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      <Save size={14} strokeWidth={2.2} />
                      Aplicar
                    </button>

                    {impresoraConfigurada && (
                      <button
                        onClick={testImpresora}
                        disabled={testando}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 16px", borderRadius: 8,
                          border: `1px solid ${C.purpleBorder}`,
                          background: C.purpleLight,
                          color: C.purple, fontWeight: 600, fontSize: 13,
                          cursor: testando ? "default" : "pointer",
                          opacity: testando ? 0.6 : 1,
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      >
                        <FlaskConical size={14} strokeWidth={2} />
                        {testando ? "Imprimiendo…" : "Probar impresora"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* LOGO */}
            <section>
              <SectionLabel>Logo del negocio</SectionLabel>
              <div style={{
                background: C.surface,
                borderRadius: 14,
                border: `1px solid ${C.border}`,
                padding: "20px",
                display: "flex", alignItems: "center", gap: 20,
              }}>
                {/* Preview */}
                <div style={{
                  width: 80, height: 80, borderRadius: 12,
                  border: `2px dashed ${C.borderHover}`,
                  background: C.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", flexShrink: 0,
                }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    : <ImageIcon size={24} color={C.textMuted} strokeWidth={1.5} />
                  }
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                    {logoPreview ? "Logo cargado" : "Sin logo configurado"}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>
                    Se mostrará en la parte superior de la factura. PNG o JPG, fondo transparente recomendado.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  {logoPreview && (
                    <button
                      onClick={quitarLogo}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 14px", borderRadius: 8,
                        border: `1px solid ${C.dangerBorder}`,
                        background: C.dangerLight,
                        color: C.danger, fontWeight: 600, fontSize: 12,
                        cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif",
                      }}
                    >
                      <X size={13} strokeWidth={2.5} />
                      Quitar
                    </button>
                  )}
                  <button
                    onClick={seleccionarLogo}
                    disabled={subiendoLogo}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "8px 16px", borderRadius: 8,
                      border: `1px solid ${C.border}`,
                      background: subiendoLogo ? C.bg : C.surface,
                      color: C.text, fontWeight: 600, fontSize: 12,
                      cursor: subiendoLogo ? "default" : "pointer",
                      fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                  >
                    <ImageIcon size={13} strokeWidth={2} />
                    {subiendoLogo ? "Cargando…" : "Seleccionar imagen"}
                  </button>
                </div>
              </div>
            </section>

          </div>
          {/* ── FIN COLUMNA IZQUIERDA ── */}

          {/* ── COLUMNA DERECHA: red / QR ── */}
          <div style={{ width: 340, flexShrink: 0, position: "sticky", top: 0 }}>
            <div style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              overflow: "hidden",
            }}>

              {/* Header panel */}
              <div style={{
                padding: "16px 20px",
                borderBottom: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", gap: 10,
                background: C.accentLight,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: C.surface, border: `1px solid ${C.accentMid}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.accent,
                }}>
                  <Globe size={16} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>POSKEY Mobile</div>
                  <div style={{ fontSize: 11, color: C.textSub }}>Acceso desde dispositivos en red</div>
                </div>
              </div>

              <div style={{ padding: "20px" }}>

                {/* Info de red */}
                <div style={{
                  display: "flex", flexDirection: "column", gap: 6, marginBottom: 16,
                }}>
                  {[
                    { label: "Host", value: red.host },
                    { label: "IP", value: red.ip },
                    { label: "Puerto", value: String(red.puerto) },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", borderRadius: 8,
                        background: C.bg, border: `1px solid ${C.border}`,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: "monospace" }}>
                        {value || "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* URL pill */}
                <div style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  fontSize: 12,
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                  marginBottom: 20,
                  fontWeight: 500,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Wifi size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
                  {red.url ? `${red.url}/mobile` : "Cargando…"}
                </div>

                {/* QR */}
                <div style={{
                  display: "flex", justifyContent: "center",
                  padding: "16px",
                  borderRadius: 12,
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  marginBottom: 16,
                }}>
                  <QRCodeCanvas
                    value={red.url ? `${red.url}/mobile` : "https://poskey.app"}
                    size={200}
                    bgColor="transparent"
                    fgColor={C.text}
                  />
                </div>

                {/* Botón copiar */}
                <button
                  onClick={() => navigator.clipboard.writeText(`${red.url}/mobile`)}
                  style={{
                    width: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "10px",
                    borderRadius: 9, border: "none",
                    background: `linear-gradient(135deg, ${C.accent}, #15803d)`,
                    color: "white", fontWeight: 600, fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "'Inter', system-ui, sans-serif",
                    boxShadow: "0 2px 8px rgba(22,163,74,0.2)",
                  }}
                >
                  <Copy size={14} strokeWidth={2.2} />
                  Copiar URL
                </button>
              </div>
            </div>

            {/* Nota discreta */}
            <p style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
              Escanea el QR desde un celular conectado a la misma red Wi-Fi.
            </p>
          </div>
          {/* ── FIN COLUMNA DERECHA ── */}

        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600,
          whiteSpace: "nowrap",
          background: toast.type === "ok" ? C.accentLight : C.dangerLight,
          border: `1px solid ${toast.type === "ok" ? C.accentMid : C.dangerBorder}`,
          color: toast.type === "ok" ? C.accent : C.danger,
          zIndex: 200,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        }}>
          {toast.type === "ok"
            ? <CheckCircle2 size={14} strokeWidth={2.5} />
            : <AlertCircle size={14} strokeWidth={2.5} />
          }
          {toast.msg}
        </div>
      )}

    </div>
  );
}