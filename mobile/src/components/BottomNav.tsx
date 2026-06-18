// src/components/BottomNav.tsx
//
// Reemplaza al Sidebar.tsx de Desktop. En móvil el patrón estándar es
// una barra inferior fija, no un panel lateral. Solo Mesas y Cocina,
// que es el alcance acordado para esta app (mesera y cocina).

import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/mesas", label: "Mesas", icon: "🍽️" },
  { to: "/cocina", label: "Cocina", icon: "👨‍🍳" },
];

export default function BottomNav() {
  const location = useLocation();

  // No mostrar la barra dentro de una cuenta de mesa abierta ni en /connect,
  // para dejar toda la pantalla disponible a la acción principal.
  const oculto = location.pathname.startsWith("/cuenta") || location.pathname === "/connect";
  if (oculto) return null;

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(180deg, #16241f 0%, #0f1f1a 100%)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 500,
        boxShadow: "0 -2px 16px rgba(0,0,0,0.25)",
      }}
    >
      {links.map((link) => {
        const active = location.pathname.startsWith(link.to);
        return (
          <Link
            key={link.to}
            to={link.to}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "10px 0 8px",
              textDecoration: "none",
              color: active ? "#22c55e" : "#7fa893",
              fontWeight: active ? 700 : 500,
            }}
          >
            <span style={{ fontSize: 22 }}>{link.icon}</span>
            <span style={{ fontSize: 11.5 }}>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}