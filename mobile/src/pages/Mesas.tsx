// src/pages/Mesas.tsx
//
// Equivalente móvil de Mesas.tsx (Desktop), pero solo la parte de
// visualización + navegación a la cuenta. El plano editable con
// drag & drop se queda exclusivo del Desktop (acordado).
//
// Mismo endpoint: GET /mesas
// Mismo destino al tocar una mesa: /cuenta/:mesaId (igual que el
// navigate(`/cuenta/${mesa.id}`) del Desktop).

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useServerGuard, esErrorDeConexion } from "../hooks/useServerGuard";
import { useToast } from "../hooks/useToast";
import ToastStack from "../components/Toast";
import type { Mesa } from "../services";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  TbToolsKitchen2,
  TbRefresh,
  TbArmchair,
  TbCircleCheck,
  TbCircleDot,
} from "react-icons/tb";

export default function Mesas() {
  useServerGuard();

  const navigate = useNavigate();
  const { toasts, toast } = useToast();

  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargarMesas = useCallback(
    async (esRefresh = false) => {
      if (esRefresh) setRefrescando(true);
      try {
        const res = await api.get("/mesas");
        setMesas(res.data);
      } catch (error) {
        if (esErrorDeConexion(error)) {
          navigate("/connect", {
            state: { motivo: "No se pudo conectar con el servidor." },
          });
          return;
        }
        toast("Error al cargar mesas", "err");
      } finally {
        setLoading(false);
        setRefrescando(false);
      }
    },
    [navigate, toast]
  );

  useEffect(() => {
    cargarMesas();
  }, [cargarMesas]);

  useWebSocket(["mesas_actualizadas"], cargarMesas);

  const libres   = mesas.filter((m) => m.estado === "LIBRE").length;
  const ocupadas = mesas.length - libres;

  return (
    <div style={{ minHeight: "100dvh", background: "#f1f5f3", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "20px 18px 18px",
          background: "#0f1a13",
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: "rgba(22,163,74,0.2)",
                border: "1px solid rgba(22,163,74,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TbToolsKitchen2 size={17} color="#4ade80" />
            </div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>
              Mesas
            </h1>
          </div>

          <button
            onClick={() => cargarMesas(true)}
            disabled={refrescando}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.08)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {refrescando
              ? <span className="spinner" />
              : <TbRefresh size={17} style={{ color: "white" }} />
            }
          </button>
        </div>

        {/* Estadísticas */}
        <div style={{ display: "flex", gap: 10 }}>
          <div
            style={{
              flex: 1,
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.25)",
              borderRadius: 12,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <TbCircleCheck size={20} color="#4ade80" />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#86efac", lineHeight: 1 }}>{libres}</div>
              <div style={{ fontSize: 11, color: "#86efac", opacity: 0.8, marginTop: 2, fontWeight: 600 }}>Libres</div>
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: 12,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <TbCircleDot size={20} color="#fca5a5" />
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fca5a5", lineHeight: 1 }}>{ocupadas}</div>
              <div style={{ fontSize: 11, color: "#fca5a5", opacity: 0.8, marginTop: 2, fontWeight: 600 }}>Ocupadas</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "18px 16px 24px" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 10px", color: "#94a3b8" }}>
            <span className="spinner" style={{ borderTopColor: "#16a34a" }} />
            <p style={{ marginTop: 12, fontSize: 13.5 }}>Cargando mesas…</p>
          </div>
        )}

        {!loading && mesas.length === 0 && (
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: "60px 20px",
              textAlign: "center",
              color: "#94a3b8",
              border: "1px solid #e8eeeb",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "#f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
              }}
            >
              <TbToolsKitchen2 size={24} color="#cbd5e1" />
            </div>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: "#64748b" }}>
              Sin mesas registradas
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#94a3b8" }}>
              Crea mesas desde POSKEY Desktop
            </p>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          {mesas.map((mesa) => {
            const libre = mesa.estado === "LIBRE";
            return (
              <button
                key={mesa.id}
                onClick={() => navigate(`/cuenta/${mesa.id}`)}
                style={{
                  background: "white",
                  border: `1.5px solid ${libre ? "#bbf7d0" : "#fecaca"}`,
                  borderRadius: 16,
                  padding: "18px 14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  textAlign: "center",
                  fontFamily: "inherit",
                }}
              >
                {/* Ícono de mesa */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: libre ? "#f0fdf4" : "#fef2f2",
                  }}
                >
                  {mesa.forma === "barra"
                    ? <TbArmchair size={24} color={libre ? "#16a34a" : "#dc2626"} />
                    : <TbToolsKitchen2 size={24} color={libre ? "#16a34a" : "#dc2626"} />
                  }
                </div>

                <strong style={{ fontSize: 14.5, color: "#1f2937", letterSpacing: "-0.01em" }}>
                  {mesa.nombre}
                </strong>

                <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 500 }}>
                  ×{mesa.capacidad ?? 4}
                </span>

                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 99,
                    background: libre ? "#dcfce7" : "#fee2e2",
                    color: libre ? "#15803d" : "#dc2626",
                    letterSpacing: "0.04em",
                  }}
                >
                  {libre ? "LIBRE" : "OCUPADA"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}