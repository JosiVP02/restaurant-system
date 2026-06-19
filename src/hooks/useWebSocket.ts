import { useEffect, useRef } from "react";

export type WsEvento =
  | "orden_nueva"
  | "orden_actualizada"
  | "mesas_actualizadas"
  | "cuenta_actualizada";

export function useWebSocket(eventos: WsEvento[], onEvento: () => void) {
  const cbRef = useRef(onEvento);
  const eventosRef = useRef(eventos);
  cbRef.current = onEvento;
  eventosRef.current = eventos;

  useEffect(() => {
    const wsUrl = "ws://127.0.0.1:8000/ws";
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let destroyed = false;

    function conectar() {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WS] conectado");
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          console.log("[WS] evento recibido:", msg.evento);
          if (eventosRef.current.includes(msg.evento)) {
            cbRef.current();
          }
        } catch {}
      };

      ws.onclose = () => {
        console.log("[WS] desconectado, reconectando...");
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
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  }, []);
}