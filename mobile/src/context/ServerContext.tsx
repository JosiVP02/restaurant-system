import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../services/api";

import sonidoListo from "../assets/listo.mp3";


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
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  url = url.replace(/\/+$/, "");
  return url;
}

// ── Notificación del navegador ──────────────────────────────────────────────
function pedirPermisoNotificaciones() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function notificarListoMesera(mesa: string, producto: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(`✅ Listo para entregar — Mesa ${mesa}`, {
      body: producto,
      icon: "/favicon.ico",
      tag: `listo-${mesa}-${Date.now()}`,
    });
  }
}

// ── Sonido (mismo AudioContext que Cocina.tsx) ───────────────────────────────
const audioListoRef = { current: null as HTMLAudioElement | null };

function inicializarAudioListo() {
  if (!audioListoRef.current) {
    audioListoRef.current = new Audio(sonidoListo);
    audioListoRef.current.volume = 0.8;
  }
}

function reproducirSonidoListo() {
  try {
    inicializarAudioListo();
    if (audioListoRef.current) {
      audioListoRef.current.currentTime = 0;
      audioListoRef.current.play();
    }
  } catch (err) {
    console.warn("No se pudo reproducir sonido:", err);
  }
}

// ── Provider ────────────────────────────────────────────────────────────────
export function ServerProvider({ children }: { children: ReactNode }) {
  const [serverUrl, setServerUrlState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );

  // Guarda qué ítems (por id) ya estaban en LISTO para no re-notificar
  const listosConocidosRef = useRef<Set<number>>(new Set());
  const primerCargaListosRef = useRef(true);

  useEffect(() => {
    if (serverUrl) localStorage.setItem(STORAGE_KEY, serverUrl);
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

  // ── Polling de ítems LISTOS ──────────────────────────────────────────────
  useEffect(() => {
    if (!serverUrl) return; // no hay servidor configurado aún

    pedirPermisoNotificaciones();
    inicializarAudioListo();

    async function verificarListos() {
      try {
        const res = await api.get("/cocina", {
          params: { _t: Date.now() },
          headers: { "Cache-Control": "no-cache" },
        });

        const items: {
          id: number;
          mesa: string;
          producto: string;
          cantidad: number;
          estado: string;
        }[] = res.data;

        const listosAhora = items.filter(i => i.estado === "LISTO");

        if (primerCargaListosRef.current) {
          // Primera carga: solo memorizamos, no notificamos
          listosAhora.forEach(i => listosConocidosRef.current.add(i.id));
          primerCargaListosRef.current = false;
          return;
        }

        listosAhora.forEach(item => {
          if (!listosConocidosRef.current.has(item.id)) {
            // Este ítem acaba de pasar a LISTO
            notificarListoMesera(item.mesa, `${item.cantidad} × ${item.producto}`);
            reproducirSonidoListo();
            listosConocidosRef.current.add(item.id);
          }
        });

        // Limpia ítems que ya salieron del endpoint (entregados/eliminados)
        const idsActuales = new Set(items.map(i => i.id));
        listosConocidosRef.current.forEach(id => {
          if (!idsActuales.has(id)) listosConocidosRef.current.delete(id);
        });

      } catch {
        // Silencioso — no queremos toasts globales por fallos de red
      }
    }

    verificarListos();
    const intervalo = setInterval(verificarListos, 2000);
    return () => clearInterval(intervalo);
  }, [serverUrl]);

  const value = useMemo(
    () => ({ serverUrl, isConfigured: !!serverUrl, setServerUrl, clearServerUrl }),
    [serverUrl, setServerUrl, clearServerUrl]
  );

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}

export function useServer() {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error("useServer debe usarse dentro de <ServerProvider>");
  return ctx;
}