// src/hooks/useServerGuard.ts
//
// Se usa al entrar a cualquier pantalla que dependa de la API (Mesas,
// CuentaMesa, Cocina). Si no hay servidor guardado, manda directo a
// /connect. La verificación de que el servidor responda en runtime
// la hace cada pantalla individualmente al fallar sus propias llamadas
// (ver manejo de errores en cada página), para no duplicar pings.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useServer } from "../context/ServerContext";

export function useServerGuard() {
  const { isConfigured } = useServer();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isConfigured) {
      navigate("/connect", {
        replace: true,
        state: { motivo: "Configura el servidor antes de continuar." },
      });
    }
  }, [isConfigured, navigate]);

  return { isConfigured };
}

// Helper para manejar errores de red de forma consistente: si la API
// falla por completo (servidor caído / IP incorrecta), redirige a
// /connect con un mensaje claro en vez de dejar la pantalla en blanco.
export function esErrorDeConexion(error: unknown): boolean {
  if (error instanceof Error && error.message === "SERVER_NOT_CONFIGURED") return true;
  const anyErr = error as { code?: string; message?: string };
  return (
    anyErr?.code === "ERR_NETWORK" ||
    anyErr?.code === "ECONNABORTED" ||
    anyErr?.message === "Network Error"
  );
}