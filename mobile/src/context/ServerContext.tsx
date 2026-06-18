// src/context/ServerContext.tsx
//
// Maneja la URL del servidor FastAPI configurada por el usuario.
// Se guarda en localStorage para que persista entre sesiones/reinicios
// de la PWA, igual que el patrón que ya existe en la app Desktop.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "poskey_server";


interface ServerContextValue {
  serverUrl: string | null;
  isConfigured: boolean;
  setServerUrl: (url: string) => void;
  clearServerUrl: () => void;
}

const ServerContext = createContext<ServerContextValue | undefined>(undefined);

function normalizarUrl(raw: string): string {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  // quita slash final para evitar "http://ip:8000//mesas"
  url = url.replace(/\/+$/, "");
  return url;
}

export function ServerProvider({ children }: { children: ReactNode }) {
  const [serverUrl, setServerUrlState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    if (serverUrl) {
      localStorage.setItem(STORAGE_KEY, serverUrl);
    }
  }, [serverUrl]);

  const setServerUrl = useCallback((url: string) => {
    const limpia = normalizarUrl(url);
    localStorage.setItem(STORAGE_KEY, limpia);
    setServerUrlState(limpia);
  }, []);

  const clearServerUrl = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setServerUrlState(null);
  }, []);

  const value = useMemo(
    () => ({
      serverUrl,
      isConfigured: !!serverUrl,
      setServerUrl,
      clearServerUrl,
    }),
    [serverUrl, setServerUrl, clearServerUrl]
  );

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}

export function useServer() {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error("useServer debe usarse dentro de <ServerProvider>");
  return ctx;
}