import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  BarChart3,
  UtensilsCrossed,
  ChefHat,
  Landmark,
  Settings,
  Wrench,
} from "lucide-react";
import { readFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { api } from "../services/api";
import MantenimientoModal from "./MantenimientoModal";

const links = [
  { to: "/",              label: "Ventas",        Icon: BarChart3 },
  { to: "/mesas",         label: "Mesas",         Icon: UtensilsCrossed },
  { to: "/productos",     label: "Productos",     Icon: UtensilsCrossed },
  { to: "/cocina",        label: "Cocina",        Icon: ChefHat },
  { to: "/cierre",        label: "Cierre",        Icon: Landmark },
  { to: "/configuracion", label: "Configuración", Icon: Settings },
];

const CARPETA_APP = "POSKEY";
const NOMBRE_LOGO = "logo.png";

export default function Sidebar() {
  const location = useLocation();
  const [nombreNegocio, setNombreNegocio] = useState("Restaurant");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [mostrarMantenimiento, setMostrarMantenimiento] = useState(false);

  async function cargarLogo(tieneLogo: boolean) {
    if (!tieneLogo) {
      setLogoUrl("");
      return;
    }
    try {
      const bytes = await readFile(`${CARPETA_APP}/${NOMBRE_LOGO}`, {
        baseDir: BaseDirectory.AppData,
      });
      const blob = new Blob([bytes], { type: "image/png" });
      setLogoUrl(URL.createObjectURL(blob));
    } catch {
      // El archivo no existe todavía o no se pudo leer — usar el icono por defecto
      setLogoUrl("");
    }
  }

  useEffect(() => {
    function cargarDesdeConfig() {
      api.get("/configuracion")
        .then((res) => {
          if (res.data?.nombre_negocio) {
            setNombreNegocio(res.data.nombre_negocio);
          }
          cargarLogo(Boolean(res.data?.logo));
        })
        .catch(() => {});
    }

    cargarDesdeConfig();

    function onConfigActualizada(e: Event) {
      const detail = (e as CustomEvent).detail as
        | { nombre_negocio?: string; logo?: string }
        | undefined;
      if (detail?.nombre_negocio) setNombreNegocio(detail.nombre_negocio);
      cargarLogo(Boolean(detail?.logo));
    }

    window.addEventListener("config-actualizada", onConfigActualizada);
    return () => window.removeEventListener("config-actualizada", onConfigActualizada);
  }, []);

  // Liberar el blob URL anterior cuando se reemplaza, para no acumular memoria
  useEffect(() => {
    return () => {
      if (logoUrl) URL.revokeObjectURL(logoUrl);
    };
  }, [logoUrl]);

  return (
    <div
      style={{
        width: "240px",
        minWidth: "240px",
        height: "100vh",
        background: "linear-gradient(180deg, #0f1f1a 0%, #16241f 100%)",
        color: "#e7efe9",
        padding: "28px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        boxShadow: "2px 0 16px rgba(0,0,0,0.25)",
        position: "sticky",
        top: 0,
        left: 0,
        alignSelf: "flex-start",
        flexShrink: 0,
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      {/* LOGO / NOMBRE NEGOCIO */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 8px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: logoUrl ? "white" : "linear-gradient(135deg, #22c55e, #15803d)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: logoUrl
              ? "0 1px 4px rgba(0,0,0,0.18)"
              : "0 4px 12px rgba(34,197,94,0.35)",
            overflow: "hidden",
            padding: logoUrl ? 5 : 0,
            boxSizing: "border-box",
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo del negocio"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <UtensilsCrossed size={20} color="#0f1f1a" strokeWidth={2.25} />
          )}
        </div>
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {nombreNegocio}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#7fa893",
              fontWeight: 500,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            POSKEY
          </div>
        </div>
      </div>

      {/* MENÚ */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#5a7a6c",
          padding: "0 12px",
          marginBottom: 6,
        }}
      >
        Menú
      </div>

      {links.map(({ to, label, Icon }) => {
        const active = location.pathname === to;

        return (
          <Link
            key={to}
            to={to}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 12px",
              borderRadius: 10,
              color: active ? "#0f1f1a" : "#cfe3d8",
              background: active
                ? "linear-gradient(135deg, #22c55e, #16a34a)"
                : "transparent",
              textDecoration: "none",
              fontWeight: active ? 700 : 500,
              fontSize: 14.5,
              transition: "background 0.15s, color 0.15s",
              boxShadow: active ? "0 4px 12px rgba(34,197,94,0.3)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.background = "transparent";
            }}
          >
            <Icon size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
            {label}
          </Link>
        );
      })}

      <div style={{ flex: 1 }} />

      {/* MANTENIMIENTO — acceso discreto, separado del menú principal */}
      <button
        onClick={() => setMostrarMantenimiento(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "transparent",
          color: "#7fa893",
          fontWeight: 500,
          fontSize: 13,
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
          transition: "background 0.15s, color 0.15s",
          marginBottom: 12,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.color = "#cfe3d8";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#7fa893";
        }}
      >
        <Wrench size={15} strokeWidth={2} style={{ flexShrink: 0 }} />
        Mantenimiento
      </button>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 16,
          fontSize: 12,
          color: "#5a7a6c",
          padding: "16px 12px 4px",
        }}
      >
        v1.0 · by josiDev
      </div>

      {mostrarMantenimiento && (
        <MantenimientoModal onClose={() => setMostrarMantenimiento(false)} />
      )}
    </div>
  );
}