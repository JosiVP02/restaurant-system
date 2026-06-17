import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../services/api";
import useMobile from "../hooks/useMobile";




const links = [
  { to: "/",              label: "Ventas",        icon: "📊" },
  { to: "/mesas",         label: "Mesas",         icon: "🍽️" },
  { to: "/productos",     label: "Productos",     icon: "🍔" },
  { to: "/cocina",        label: "Cocina",        icon: "👨‍🍳" },
  { to: "/cierre",        label: "Cierre",        icon: "🏦" },
  { to: "/configuracion", label: "Configuración", icon: "⚙️" },
];

export default function Sidebar() {
  const location = useLocation();
  const [nombreNegocio, setNombreNegocio] = useState("Restaurant");

useEffect(() => {
  const cargarNombre = () => {
    api.get("/configuracion")
      .then((res) => {
        if (res.data?.nombre_negocio) {
          setNombreNegocio(res.data.nombre_negocio);
        }
      })
      .catch(() => {});
  };

  cargarNombre(); // carga inicial

  window.addEventListener("config-actualizada", cargarNombre);
  return () => window.removeEventListener("config-actualizada", cargarNombre);
}, []);



const isMobile = useMobile();
if (isMobile) {
  return null;
}

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
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg, #22c55e, #15803d)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(34,197,94,0.35)",
          }}
        >
          🍴
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

      {links.map((link) => {
        const active = location.pathname === link.to;

        return (
          <Link
            key={link.to}
            to={link.to}
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
            <span style={{ fontSize: 18, width: 22, textAlign: "center" }}>
              {link.icon}
            </span>
            {link.label}
          </Link>
        );
      })}

      <div style={{ flex: 1 }} />

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 16,
          fontSize: 12,
          color: "#5a7a6c",
          padding: "16px 12px 4px",
        }}
      >
        v1.0 · Operación local
      </div>
    </div>
  );
}