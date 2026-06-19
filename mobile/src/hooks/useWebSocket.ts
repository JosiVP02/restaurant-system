import { useEffect, useRef } from "react";
import { useServer } from "../context/ServerContext";

export type WsEvento =
  | "orden_nueva"
  | "orden_actualizada"
  | "mesas_actualizadas"
  | "cuenta_actualizada";

export function useWebSocket(eventos: WsEvento[], onEvento: () => void) {
  const { serverUrl } = useServer();
  const cbRef = useRef(onEvento);
  cbRef.current = onEvento;

  useEffect(() => {
    if (!serverUrl) return;

    const wsUrl = serverUrl.replace(/^http/, "ws") + "/ws";
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let destroyed = false;

    function conectar() {
    ws = new WebSocket(wsUrl);

    ws.onmessage = (e) => {
        try {
        const msg = JSON.parse(e.data);
        if (eventos.includes(msg.evento)) {
            cbRef.current();
        }
        } catch {}
    };

    ws.onclose = () => {
        if (!destroyed) {
        reconnectTimeout = setTimeout(conectar, 2000);
        }
    };

    ws.onerror = () => {
        if (!destroyed) ws.close();
    };
    }

    conectar();

    return () => {
    destroyed = true;
    clearTimeout(reconnectTimeout);
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
    }
    };
  }, [serverUrl]);
}