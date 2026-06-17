import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";



interface Mesa {
  id: number;
  nombre: string;
  estado: string;
  x?: number;
  y?: number;
  forma?: "cuadrada" | "redonda" | "barra";
  capacidad?: number;
}

interface MesaLocal extends Mesa {
  x: number;
  y: number;
  forma: "cuadrada" | "redonda" | "barra";
  capacidad: number;
}

type Mode = "view" | "edit";

interface Toast {
  id: number;
  msg: string;
  type: "ok" | "err";
}







const TABLE_W = 72;
const TABLE_H = 72;
const BAR_W = 220;
const BAR_H = 70;
const FLOOR_W = 1780;
const FLOOR_H = 1000;
const SNAP = 16;

const snap = (v: number) =>
  Math.round(v / SNAP) * SNAP;

export default function Mesas() {
  const [mesas, setMesas] =
    useState<MesaLocal[]>([]);

  const [mode, setMode] =
    useState<Mode>("view");

  const [selected, setSelected] =
    useState<number | null>(null);

  const [editTarget, setEditTarget] =
    useState<MesaLocal | null>(null);



  const [showCreate, setShowCreate] =
    useState(false);

  const [newNombre, setNewNombre] =
    useState("");

  const [newForma, setNewForma] =
    useState<
      "cuadrada" |
      "redonda" |
      "barra"
    >("cuadrada");


    const [confirm, setConfirm] = useState<null | {
  titulo: string;
  descripcion?: string;
  tipo?: "default" | "warning" | "danger";
  textoConfirmar?: string;
  onConfirmar: () => void;
}>(null);







      

  const [newCap, setNewCap] =
    useState(4);

  const [toasts, setToasts] =
    useState<Toast[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [savedFlash, setSavedFlash] =
    useState(false);

  const floorRef =
    useRef<HTMLDivElement>(null);

  const dragRef = useRef<{
    id: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const mesasRef =
    useRef<MesaLocal[]>([]);

  useEffect(() => {
    mesasRef.current = mesas;
  }, [mesas]);

  const navigate = useNavigate();
  const location = useLocation();

  const toast = useCallback(
    (
      msg: string,
      type: "ok" | "err" = "ok"
    ) => {
      const id = Date.now();

      setToasts((t) => [
        ...t,
        {
          id,
          msg,
          type,
        },
      ]);

      setTimeout(
        () =>
          setToasts((t) =>
            t.filter((x) => x.id !== id)
          ),
        3000
      );
    },
    []
  );

  async function cargarMesas() {
    setLoading(true);

    try {
      const res =
        await api.get("/mesas");

      const data: Mesa[] = res.data;

      setMesas(
        data.map((m, i) => ({
          ...m,
          x:
            m.x ??
            snap(
              80 +
                (i % 7) * 120
            ),
          y:
            m.y ??
            snap(
              80 +
                Math.floor(i / 7) *
                  130
            ),
          forma:
            m.forma ??
            "cuadrada",
          capacidad:
            m.capacidad ?? 4,
        }))
      );
    } catch {
      toast(
        "Error al cargar mesas",
        "err"
      );
    } finally {
      setLoading(false);
    }
  }

  async function crearMesa() {
    if (!newNombre.trim()) return;

    try {
      const res =
        await api.post("/mesas", {
          nombre: newNombre,
          forma: newForma,
          capacidad: newCap,
          x: snap(
            80 +
              (mesas.length % 7) *
                120
          ),
          y: snap(
            80 +
              Math.floor(
                mesas.length / 7
              ) *
                130
          ),
        });

      const m: Mesa = res.data;

      setMesas((prev) => [
        ...prev,
        {
          ...m,
          forma:
            m.forma ??
            newForma,
          capacidad:
            m.capacidad ??
            newCap,
          x: m.x ?? 80,
          y: m.y ?? 80,
        },
      ]);

      setNewNombre("");
      setShowCreate(false);

      toast(
        `"${m.nombre}" creada`
      );
    } catch {
      toast(
        "No se pudo crear",
        "err"
      );
    }
  }

async function guardarEdicion() {
  if (!editTarget) return;
  setConfirm({
    titulo: "¿Guardar cambios?",
    descripcion: `Se actualizará "${editTarget.nombre}".`,
    tipo: "warning",
    textoConfirmar: "Guardar",
    onConfirmar: async () => {
      setConfirm(null);
      try {
        await api.put(`/mesas/${editTarget.id}`, {
          nombre: editTarget.nombre,
          forma: editTarget.forma,
          capacidad: editTarget.capacidad,
        });
        setMesas((prev) =>
          prev.map((m) => m.id === editTarget.id ? { ...m, ...editTarget } : m)
        );
        setEditTarget(null);
        toast("Cambios guardados");
      } catch {
        toast("No se pudo guardar", "err");
      }
    },
  });
}





async function eliminarMesa(mesa: MesaLocal) {
  setConfirm({
    titulo: "¿Eliminar mesa?",
    descripcion: `Se eliminará "${mesa.nombre}" y se perderá la cuenta actual.`,
    tipo: "warning",
    textoConfirmar: "Continuar",
    onConfirmar: () => {
      setConfirm(null);
      setTimeout(() => {
        setConfirm({
          titulo: "¿Estás seguro?",
          descripcion: "Esta acción no se puede deshacer.",
          tipo: "danger",
          textoConfirmar: "Sí, eliminar",
          onConfirmar: async () => {
            setConfirm(null);
            try {
              await api.delete(`/mesas/${mesa.id}`);
              setMesas((prev) => prev.filter((m) => m.id !== mesa.id));
              if (selected === mesa.id) setSelected(null);
              setEditTarget(null);
              toast(`"${mesa.nombre}" eliminada`);
            } catch {
              toast("No se pudo eliminar", "err");
            }
          },
        });
      }, 100);
    },
  });
}





  function getMesaSize(
    mesa: MesaLocal
  ) {
    if (mesa.forma === "barra") {
      return {
        w: BAR_W,
        h: BAR_H,
      };
    }

    return {
      w: TABLE_W,
      h: TABLE_H,
    };
  }

  async function guardarPosicion(
    id: number,
    x: number,
    y: number
  ) {
    try {
      await api.put(
        `/mesas/${id}/posicion`,
        {
          x,
          y,
        }
      );

      setSavedFlash(true);

      setTimeout(
        () =>
          setSavedFlash(false),
        1500
      );
    } catch {
      /* silent */
    }
  }

  useEffect(() => {
    cargarMesas();
  }, [location.pathname]);

  const onMouseDown =
    useCallback(
      (
        e: React.MouseEvent,
        id: number
      ) => {
        if (mode !== "edit")
          return;

        e.preventDefault();
        e.stopPropagation();

        setSelected(id);

        const mesa =
          mesasRef.current.find(
            (m) => m.id === id
          );

        if (!mesa) return;

        dragRef.current = {
          id,
          startX: e.clientX,
          startY: e.clientY,
          origX: mesa.x,
          origY: mesa.y,
        };
      },
      [mode]
    );

  const onTouchStart =
    useCallback(
      (
        e: React.TouchEvent,
        id: number
      ) => {
        if (mode !== "edit")
          return;

        const t = e.touches[0];

        const mesa =
          mesasRef.current.find(
            (m) => m.id === id
          );

        if (!mesa) return;

        setSelected(id);

        dragRef.current = {
          id,
          startX: t.clientX,
          startY: t.clientY,
          origX: mesa.x,
          origY: mesa.y,
        };
      },
      [mode]
    );













  useEffect(() => {
    if (mode !== "edit") return;

    const onMove = (
      e: MouseEvent
    ) => {
      if (!dragRef.current)
        return;

      const {
        id,
        startX,
        startY,
        origX,
        origY,
      } = dragRef.current;

      const mesa =
        mesasRef.current.find(
          (m) => m.id === id
        );

      if (!mesa) return;

      const size =
        getMesaSize(mesa);

      const nx = Math.max(
        0,
        Math.min(
          FLOOR_W - size.w,
          snap(
            origX +
              e.clientX -
              startX
          )
        )
      );

      const ny = Math.max(
        0,
        Math.min(
          FLOOR_H - size.h,
          snap(
            origY +
              e.clientY -
              startY
          )
        )
      );

      setMesas((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                x: nx,
                y: ny,
              }
            : m
        )
      );
    };

    const onUp = (
      e: MouseEvent
    ) => {
      if (!dragRef.current)
        return;

      const {
        id,
        startX,
        startY,
      } = dragRef.current;

      const moved =
        Math.abs(
          e.clientX -
            startX
        ) > 4 ||
        Math.abs(
          e.clientY -
            startY
        ) > 4;

      if (moved) {
        const mesa =
          mesasRef.current.find(
            (m) => m.id === id
          );

        if (mesa) {
          guardarPosicion(
            id,
            mesa.x,
            mesa.y
          );
        }
      }

      dragRef.current = null;
    };

    window.addEventListener(
      "mousemove",
      onMove
    );
    window.addEventListener(
      "mouseup",
      onUp
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        onMove
      );
      window.removeEventListener(
        "mouseup",
        onUp
      );
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit") return;

    const onMove = (
      e: TouchEvent
    ) => {
      if (!dragRef.current)
        return;

      e.preventDefault();

      const t = e.touches[0];

      const {
        id,
        startX,
        startY,
        origX,
        origY,
      } = dragRef.current;

      const mesa =
        mesasRef.current.find(
          (m) => m.id === id
        );

      if (!mesa) return;

      const size =
        getMesaSize(mesa);

      const nx = Math.max(
        0,
        Math.min(
          FLOOR_W - size.w,
          snap(
            origX +
              t.clientX -
              startX
          )
        )
      );

      const ny = Math.max(
        0,
        Math.min(
          FLOOR_H - size.h,
          snap(
            origY +
              t.clientY -
              startY
          )
        )
      );

      setMesas((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                x: nx,
                y: ny,
              }
            : m
        )
      );
    };

    const onUp = () => {
      if (!dragRef.current)
        return;

      const { id } =
        dragRef.current;

      const mesa =
        mesasRef.current.find(
          (m) => m.id === id
        );

      if (mesa) {
        guardarPosicion(
          id,
          mesa.x,
          mesa.y
        );
      }

      dragRef.current = null;
    };

    window.addEventListener(
      "touchmove",
      onMove,
      {
        passive: false,
      }
    );

    window.addEventListener(
      "touchend",
      onUp
    );

    return () => {
      window.removeEventListener(
        "touchmove",
        onMove
      );
      window.removeEventListener(
        "touchend",
        onUp
      );
    };
  }, [mode]);

  const libres =
    mesas.filter(
      (m) =>
        m.estado === "LIBRE"
    ).length;

  const ocupadas =
    mesas.length - libres;

  const pct =
    mesas.length > 0
      ? Math.round(
          (ocupadas /
            mesas.length) *
            100
        )
      : 0;

  return (
    <>
      <style>{`
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .mr-root {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #EDE8DF;
          font-family: Inter, system-ui, sans-serif;
          color: #1E293B;
          overflow: hidden;
        }

        .mr-header {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          height: 56px;
          background: #FFFFFF;
          border-bottom: 1px solid #E2E8F0;
          gap: 12px;
          z-index: 20;
        }

        .mr-brand {
          font-size: 15px;
          font-weight: 700;
          color: #0F172A;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mr-brand-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #EFF6FF;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mr-stats {
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .mr-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .mr-stat-val {
          font-size: 16px;
          font-weight: 700;
          line-height: 1;
        }

        .mr-stat-lbl {
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          color: #94A3B8;
          margin-top: 2px;
        }

        .clr-blue {
          color: #2563EB;
        }

        .clr-green {
          color: #16A34A;
        }

        .clr-orange {
          color: #EA580C;
        }

        .occ-bar-wrap {
          flex: 1;
          max-width: 160px;
        }

        .occ-bar-lbl {
          font-size: 10px;
          color: #94A3B8;
          margin-bottom: 4px;
          display: flex;
          justify-content: space-between;
        }

        .occ-track {
          height: 4px;
          background: #E2E8F0;
          border-radius: 99px;
          overflow: hidden;
        }

        .occ-fill {
          height: 100%;
          border-radius: 99px;
          background: #2563EB;
          transition: width 0.5s ease;
        }

        .mr-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          white-space: nowrap;
        }

        .btn-primary {
          background: #2563EB;
          color: white;
        }

        .btn-ghost {
          background: #F8FAFC;
          color: #64748B;
          border: 1px solid #E2E8F0;
        }

        .btn-edit {
          background: #EFF6FF;
          color: #2563EB;
          border: 1px solid #BFDBFE;
        }

        .btn-edit-active {
          background: #F0FDF4;
          color: #16A34A;
          border: 1px solid #BBF7D0;
        }

        .btn-danger {
          background: #FFF7ED;
          color: #EA580C;
          border: 1px solid #FED7AA;
        }

        .mode-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 99px;
          background: #EFF6FF;
          color: #2563EB;
          border: 1px solid #BFDBFE;
        }

        .save-flash {
          font-size: 11px;
          color: #16A34A;
          font-weight: 600;
        }

        .mr-body {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .mr-sidebar {
          width: 220px;
          flex-shrink: 0;
          background: white;
          border-right: 1px solid #E2E8F0;
          overflow-y: auto;
        }

        .sidebar-section {
          padding: 14px 14px 0;
        }
          

        .sidebar-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #94A3B8;
          margin-bottom: 10px;
        }

        .sidebar-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding-bottom: 14px;
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid transparent;
          font-size: 13px;
        }

        .sidebar-item:hover {
          background: #F8FAFC;
        }

        .sidebar-item.selected {
          background: #EFF6FF;
          border-color: #BFDBFE;
        }

        .sidebar-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .sidebar-dot.libre {
          background: #16A34A;
        }

        .sidebar-dot.ocupada {
          background: #EA580C;
        }

        .sidebar-name {
          font-weight: 600;
          color: #334155;
          flex: 1;
        }

        .sidebar-cap {
          font-size: 11px;
          color: #94A3B8;
        }

        .sidebar-edit-btn {
          opacity: 0;
          padding: 3px 7px;
          font-size: 11px;
          border-radius: 5px;
          background: #F1F5F9;
          color: #64748B;
          border: 1px solid #E2E8F0;
          cursor: pointer;
        }

        .sidebar-item:hover
        .sidebar-edit-btn {
          opacity: 1;
        }

        .sidebar-divider {
          height: 1px;
          background: #E2E8F0;
          margin: 4px 14px;
        }

        .sidebar-hint {
          font-size: 11px;
          color: #94A3B8;
          line-height: 1.9;
        }

        .mr-floor-wrap {
          flex: 1;
          overflow: auto;
          position: relative;
          background: #EDE8DF;
        }

        .edit-banner {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #EFF6FF;
          border-bottom: 1px solid #BFDBFE;
          padding: 8px 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .mr-floor {
          position: relative;
          width: 90%;
          height: 1000px;
          background-color: #F5F0E8;
          background-image:
            linear-gradient(rgba(180,168,150,.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(180,168,150,.3) 1px, transparent 1px);
          background-size: 16px 16px;
          border: 1px solid #D6CFC4;
          margin: 20px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 8px rgba(0,0,0,.06);
        }

        .mr-floor.edit-mode
        .mesa-card {
          cursor: grab;
        }

        .mesa-card {
          position: absolute;
          width: 72px;
          height: 72px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          border: 1.5px solid transparent;
          user-select: none;
          touch-action: none;
        }

        .mesa-card.cuadrada {
          border-radius: 10px;
        }

        .mesa-card.redonda {
          border-radius: 50%;
        }

        .mesa-card.barra {
          width: 28px;
          height: 28px;

          border-radius: 6px;

          background: white;
          border: 2px solid #334155;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 9px;
          font-weight: 700;

          z-index: 2;
        }
        .mesa-card.libre {
          background: #F0FDF4;
          border-color: #BBF7D0;
        }

        .mesa-card.ocupada {
          background: #FFF7ED;
          border-color: #FED7AA;
        }

        .mesa-card.libre.sel {
          border-color: #16A34A;
          box-shadow: 0 0 0 3px #DCFCE7;
        }

        .mesa-card.ocupada.sel {
          border-color: #EA580C;
          box-shadow: 0 0 0 3px #FFEDD5;
        }

        .mesa-name {
          font-size: 11px;
          font-weight: 700;
          color: #1E293B;
          text-align: center;
          line-height: 1.2;
          padding: 0 6px;
          word-break: break-word;
        }

        .mesa-cap-txt {
          font-size: 10px;
          color: #94A3B8;
        }

        .mesa-pill {
          font-size: 8px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 99px;
          text-transform: uppercase;
        }

        .mesa-card.libre .mesa-pill {
          background: #DCFCE7;
          color: #15803D;
        }

        .mesa-card.ocupada .mesa-pill {
          background: #FFEDD5;
          color: #C2410C;
        }

        .chair {
          position: absolute;
          border-radius: 4px;
          background: #D4C9B8;
          border: 1px solid #B9AFA2;
        }

        .bar-dots {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }

        .bar-dot {
          width: 10px;
          height: 10px;
          background: #7C6F65;
          border-radius: 50%;
          opacity: .8;
        }

        .mesa-actions-overlay {
          position: absolute;
          top: -11px;
          right: -11px;
          display: flex;
          gap: 3px;
          opacity: 0;
        }

        .mesa-card:hover
        .mesa-actions-overlay,
        .mesa-card.sel
        .mesa-actions-overlay {
          opacity: 1;
        }

        .mesa-act-btn {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          cursor: pointer;
          border: 1px solid #E2E8F0;
          background: white;
          color: #64748B;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 16px;
        }

        .modal {
          background: white;
          border-radius: 14px;
          padding: 24px;
          width: 100%;
          max-width: 360px;
          box-shadow: 0 8px 32px rgba(0,0,0,.12);
        }

        .modal h2 {
          font-size: 17px;
          margin-bottom: 18px;
        }

        .field {
          margin-bottom: 14px;
        }

        .field label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
          margin-bottom: 6px;
        }

        .field input {
          width: 100%;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 9px 12px;
          font-size: 14px;
        }

        .forma-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }

        .forma-opt {
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: #64748B;
        }

        .forma-opt.active {
          border-color: #2563EB;
          background: #EFF6FF;
          color: #2563EB;
        }

        .forma-opt-icon {
          font-size: 22px;
        }

        .modal-footer {
          display: flex;
          gap: 8px;
          margin-top: 20px;
          justify-content: flex-end;
        }

        .del-confirm {
          text-align: center;
        }

        .del-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .toast-wrap {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 200;
        }

        .toast {
          padding: 10px 20px;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 600;
        }

        .toast.ok {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          color: #15803D;
        }

        .toast.err {
          background: #FFF7ED;
          border: 1px solid #FED7AA;
          color: #C2410C;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid #E2E8F0;
          border-top-color: #2563EB;
          border-radius: 50%;
        }




        .barra-fija::before {
          content: "";
          position: absolute;
          top: 10px;
          left: 15px;
          right: 15px;
          height: 6px;
          background: rgba(255,255,255,.15);
          border-radius: 10px;
        }


        .mesa-card.barra {
          width: 80px;
          height: 50px;

          border-radius: 10px;

          background: white;
          border: 2px solid #7c5a3a;

          display: flex;
          align-items: center;
          justify-content: center;

          font-size: 12px;
          font-weight: 700;

          box-shadow:
            0 2px 6px rgba(0,0,0,.15);

          z-index: 2;
        }

        .barra-fija {
          position: absolute;

          left: 20px;
          right: 20px;

          bottom: 10px;

          height: 90px;

          background:
            linear-gradient(
              180deg,
              #9c6b41,
              #7b4e2c
            );

          border: 3px solid #5a3a24;

          border-radius: 14px;

          color: white;

          font-size: 24px;

          font-weight: 800;

          display: flex;
          align-items: center;
          justify-content: center;

          z-index: 0;
        }






      `}</style>

      <div className="mr-root">
        <div className="mr-header">
          <div className="mr-brand">
            <div className="mr-brand-icon">
              🍽️
            </div>
            Plano del Restaurante
          </div>

          <div className="mr-stats">
            <div className="mr-stat">
              <div className="mr-stat-val clr-blue">
                {mesas.length}
              </div>
              <div className="mr-stat-lbl">
                Total
              </div>
            </div>

            <div className="mr-stat">
              <div className="mr-stat-val clr-green">
                {libres}
              </div>
              <div className="mr-stat-lbl">
                Libres
              </div>
            </div>

            <div className="mr-stat">
              <div className="mr-stat-val clr-orange">
                {ocupadas}
              </div>
              <div className="mr-stat-lbl">
                Ocupadas
              </div>
            </div>

            <div className="occ-bar-wrap">
              <div className="occ-bar-lbl">
                <span>
                  Ocupación
                </span>
                <span>
                  {pct}%
                </span>
              </div>

              <div className="occ-track">
                <div
                  className="occ-fill"
                  style={{
                    width: `${pct}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mr-actions">
            {savedFlash && (
              <span className="save-flash">
                ✓ Posición guardada
              </span>
            )}

            {mode === "edit" && (
              <button
                className="btn btn-primary"
                onClick={() =>
                  setShowCreate(true)
                }
              >
                + Mesa
              </button>
            )}

            <button
              className={`btn ${
                mode === "edit"
                  ? "btn-edit-active"
                  : "btn-edit"
              }`}
              onClick={() => {
                setMode((m) =>
                  m === "edit"
                    ? "view"
                    : "edit"
                );
                setSelected(null);
              }}
            >
              {mode === "edit"
                ? "✓ Listo"
                : "✏️ Editar plano"}
            </button>

            <button
              className="btn btn-ghost"
              onClick={cargarMesas}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                "↻"
              )}
            </button>
          </div>
        </div>

        <div className="mr-body">
          <div className="mr-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-title">
                Mesas
              </div>

              <div className="sidebar-list">
                {mesas.map((m) => (
                  <div
                    key={m.id}
                    className={`sidebar-item ${
                      selected === m.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => {
                      setSelected(m.id);

                      if (mode === "view") {
                        navigate(
                          `/cuenta/${m.id}`
                        );
                      }
                    }}
                  >
                    <div
                      className={`sidebar-dot ${
                        m.estado === "LIBRE"
                          ? "libre"
                          : "ocupada"
                      }`}
                    />

                    <span className="sidebar-name">
                      {m.nombre}
                    </span>

                    <span className="sidebar-cap">
                      ×{m.capacidad}
                    </span>

                    {mode === "edit" && (
                      <button
                        className="sidebar-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditTarget({
                            ...m,
                          });
                        }}
                      >
                        ✎
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {mode === "edit" && (
              <>
                <div className="sidebar-divider" />

                <div
                  className="sidebar-section"
                  style={{
                    paddingBottom: 14,
                  }}
                >
                  <div className="sidebar-title">
                    Cómo editar
                  </div>

                  <div className="sidebar-hint">
                    • Arrastra para mover
                    <br />
                    • ✎ para renombrar
                    <br />
                    • 🗑 para eliminar
                    <br />• Posición auto-guardada
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mr-floor-wrap">
            {mode === "edit" && (
              <div className="edit-banner">
                <span className="mode-badge">
                  ✏️ Modo edición
                </span>

                <span
                  style={{
                    fontSize: 12,
                    color: "#64748B",
                  }}
                >
                  Arrastra mesas y barras
                </span>
              </div>
            )}

            <div
              ref={floorRef}
              className={`mr-floor ${
                mode === "edit"
                  ? "edit-mode"
                  : ""
              }`}
              onClick={() =>
                setSelected(null)
              }
            >
              <div className="barra-fija">
              BARRA
            </div>
              {mesas.length === 0 &&
                !loading && (
                  <div className="floor-empty">
                    <div className="floor-empty-icon">
                      🍽️
                    </div>

                    <div className="floor-empty-txt">
                      Sin mesas en el plano
                    </div>
                  </div>
                )}

              {mesas.map((mesa) => {
                const libre =
                  mesa.estado === "LIBRE";

                const isSel =
                  selected === mesa.id;

                const cap =
                  mesa.capacidad;

                const w =
                  Math.min(
                    cap * 14,
                    62
                  );

                const hh =
                  Math.min(
                    cap * 10,
                    42
                  );

                return (
                  <div
                    key={mesa.id}
                    className={`mesa-card ${
                      mesa.forma
                    } ${
                      libre
                        ? "libre"
                        : "ocupada"
                    } ${
                      isSel
                        ? "sel"
                        : ""
                    }`}
                    style={{
                      left: mesa.x,
                      top: mesa.y,
                    }}
                    onMouseDown={(e) =>
                      onMouseDown(
                        e,
                        mesa.id
                      )
                    }
                    onTouchStart={(e) =>
                      onTouchStart(
                        e,
                        mesa.id
                      )
                    }
                    onClick={(e) => {
                      e.stopPropagation();

                      if (
                        mode === "view"
                      ) {
                        navigate(
                          `/cuenta/${mesa.id}`
                        );
                      } else {
                        setSelected(
                          mesa.id
                        );
                      }
                    }}
                  >
                    {mesa.forma ===
                      "barra" ? (
                        <>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: "#0f172a",
                              textAlign: "center",
                              padding: "4px"
                            }}
                          >
                            {mesa.nombre}
                          </span>
                        </>
                      ) : (
                      <>
                        {mesa.forma ===
                        "cuadrada" ? (
                          <>
                            <div
                              className="chair"
                              style={{
                                width: w,
                                height: 7,
                                top: -12,
                                left: "50%",
                                transform:
                                  "translateX(-50%)",
                              }}
                            />
                            <div
                              className="chair"
                              style={{
                                width: w,
                                height: 7,
                                bottom:
                                  -12,
                                left: "50%",
                                transform:
                                  "translateX(-50%)",
                              }}
                            />
                            {cap >= 4 && (
                              <>
                                <div
                                  className="chair"
                                  style={{
                                    height:
                                      hh,
                                    width: 7,
                                    left: -12,
                                    top: "50%",
                                    transform:
                                      "translateY(-50%)",
                                  }}
                                />
                                <div
                                  className="chair"
                                  style={{
                                    height:
                                      hh,
                                    width: 7,
                                    right: -12,
                                    top: "50%",
                                    transform:
                                      "translateY(-50%)",
                                  }}
                                />
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <div
                              className="chair"
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius:
                                  "50%",
                                top: -13,
                                left: "50%",
                                transform:
                                  "translateX(-50%)",
                              }}
                            />
                            <div
                              className="chair"
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius:
                                  "50%",
                                bottom:
                                  -13,
                                left: "50%",
                                transform:
                                  "translateX(-50%)",
                              }}
                            />
                            {cap >= 4 && (
                              <>
                                <div
                                  className="chair"
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius:
                                      "50%",
                                    left: -13,
                                    top: "50%",
                                    transform:
                                      "translateY(-50%)",
                                  }}
                                />
                                <div
                                  className="chair"
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius:
                                      "50%",
                                    right:
                                      -13,
                                    top: "50%",
                                    transform:
                                      "translateY(-50%)",
                                  }}
                                />
                              </>
                            )}
                          </>
                        )}

                        <div className="mesa-name">
                          {mesa.nombre}
                        </div>

                        <div className="mesa-cap-txt">
                          {cap} 👤
                        </div>

                        <div className="mesa-pill">
                          {mesa.estado}
                        </div>
                      </>
                    )}

                    {mode === "edit" && (
                      <div className="mesa-actions-overlay">
                        <button
                          className="mesa-act-btn edit-btn"
                          onMouseDown={(e) =>
                            e.stopPropagation()
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditTarget({
                              ...mesa,
                            });
                          }}
                        >
                          ✎
                        </button>

                        <button
                          className="mesa-act-btn del-btn"
                          onMouseDown={(e) =>
                            e.stopPropagation()
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarMesa(mesa);
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showCreate && (
        <div
          className="modal-overlay"
          onClick={() =>
            setShowCreate(false)
          }
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h2>Nueva mesa</h2>

            <div className="field">
              <label>Nombre</label>
              <input
                autoFocus
                value={newNombre}
                onChange={(e) =>
                  setNewNombre(
                    e.target.value
                  )
                }
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  crearMesa()
                }
                placeholder="Ej. Mesa 5, Barra 1..."
              />
            </div>

            <div className="field">
              <label>Forma</label>

              <div className="forma-grid">
                {(
                  [
                    "cuadrada",
                    "redonda",
                    "barra",
                  ] as const
                ).map((f) => (
                  <div
                    key={f}
                    className={`forma-opt ${
                      newForma === f
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setNewForma(f)
                    }
                  >
                    <div className="forma-opt-icon">
                      {f === "cuadrada"
                        ? "⬛"
                        : f ===
                          "redonda"
                        ? "⭕"
                        : "▬"}
                    </div>

                    {f === "cuadrada"
                      ? "Cuadrada"
                      : f ===
                        "redonda"
                      ? "Redonda"
                      : "Barra"}
                  </div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>
                Capacidad / puntos
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={newCap}
                onChange={(e) =>
                  setNewCap(
                    Number(
                      e.target.value
                    )
                  )
                }
              />
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() =>
                  setShowCreate(false)
                }
              >
                Cancelar
              </button>

              <button
                className="btn btn-primary"
                onClick={crearMesa}
                disabled={
                  !newNombre.trim()
                }
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div
          className="modal-overlay"
          onClick={() =>
            setEditTarget(null)
          }
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h2>Editar mesa</h2>

            <div className="field">
              <label>Nombre</label>
              <input
                autoFocus
                value={
                  editTarget.nombre
                }
                onChange={(e) =>
                  setEditTarget(
                    (t) =>
                      t && {
                        ...t,
                        nombre:
                          e.target
                            .value,
                      }
                  )
                }
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  guardarEdicion()
                }
              />
            </div>

            <div className="field">
              <label>Forma</label>

              <div className="forma-grid">
                {(
                  [
                    "cuadrada",
                    "redonda",
                    "barra",
                  ] as const
                ).map((f) => (
                  <div
                    key={f}
                    className={`forma-opt ${
                      editTarget.forma ===
                      f
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setEditTarget(
                        (t) =>
                          t && {
                            ...t,
                            forma: f,
                          }
                      )
                    }
                  >
                    <div className="forma-opt-icon">
                      {f === "cuadrada"
                        ? "⬛"
                        : f ===
                          "redonda"
                        ? "⭕"
                        : "▬"}
                    </div>

                    {f === "cuadrada"
                      ? "Cuadrada"
                      : f ===
                        "redonda"
                      ? "Redonda"
                      : "Barra"}
                  </div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>
                Capacidad / puntos
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={
                  editTarget.capacidad
                }
                onChange={(e) =>
                  setEditTarget(
                    (t) =>
                      t && {
                        ...t,
                        capacidad:
                          Number(
                            e.target
                              .value
                          ),
                      }
                  )
                }
              />
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-danger"
                onClick={() => {
                setEditTarget(null);
                  eliminarMesa(editTarget!);
                }}
              >
                🗑 Eliminar
              </button>

              <button
                className="btn btn-ghost"
                onClick={() =>
                  setEditTarget(null)
                }
              >
                Cancelar
              </button>

              <button
                className="btn btn-primary"
                onClick={
                  guardarEdicion
                }
                disabled={
                  !editTarget.nombre.trim()
                }
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}



      <div className="toast-wrap">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type}`}
          >
            {t.msg}
          </div>
        ))}



      </div>


      {confirm && (
        <ConfirmModal
            {...confirm}
            onCancelar={() => setConfirm(null)}
          />
        )}


    </>
  );
}

