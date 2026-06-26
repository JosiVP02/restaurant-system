// src/components/BottomNav.tsx
//
// Reemplaza al Sidebar.tsx de Desktop. En móvil el patrón estándar es
// una barra inferior fija, no un panel lateral. Solo Mesas y Cocina,
// que es el alcance acordado para esta app (mesera y cocina).

import { Link, useLocation } from "react-router-dom";
import { TbToolsKitchen2, TbChefHat } from "react-icons/tb";

const links = [
  { to: "/mesas", label: "Mesas", icon: TbToolsKitchen2 },
  { to: "/cocina", label: "Cocina", icon: TbChefHat },
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
        background: "#0f1a13",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 500,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {links.map((link) => {
        const active = location.pathname.startsWith(link.to);
        const Icon = link.icon;
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
              color: active ? "#4ade80" : "#6b9e7e",
              fontWeight: active ? 700 : 500,
            }}
          >
            <Icon size={21} />
            <span style={{ fontSize: 11.5 }}>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}