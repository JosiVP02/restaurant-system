import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { useWebSocket } from "../hooks/useWebSocket";
import {
  LayoutGrid, Pencil, Check, RefreshCw, Plus,
  Users, CircleDot, Square, Minus,
  Trash2, Edit3, Move, Armchair,
  CheckCircle2, AlertCircle,
} from "lucide-react";

// ─── Paleta unificada con el resto de la app ──────────────
const C = {
  bg:           "#f4f6f5",
  surface:      "#ffffff",
  border:       "#e4e9e6",
  borderHover:  "#c8d5cf",
  accent:       "#16a34a",
  accentLight:  "#f0fdf4",
  accentMid:    "#bbf7d0",
  text:         "#0f1f1a",
  textSub:      "#5a7068",
  textMuted:    "#96aaa4",
  libre:        "#16a34a",
  libreLight:   "#f0fdf4",
  libreBorder:  "#bbf7d0",
  ocupada:      "#ea580c",
  ocupadaLight: "#fff7ed",
  ocupadaBorder:"#fed7aa",
  blue:         "#2563eb",
  blueLight:    "#eff6ff",
  blueBorder:   "#bfdbfe",
  danger:       "#dc2626",
  dangerLight:  "#fff7f7",
  dangerBorder: "#fca5a5",
  purple:       "#7c3aed",
  purpleLight:  "#f5f3ff",
  purpleBorder: "#ddd6fe",
  floor:        "#f0ece4",
  floorGrid:    "rgba(160,148,130,.22)",
  floorBorder:  "#ddd6ca",
  chair:        "#c8bfb0",
  chairBorder:  "#b0a696",
};

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
const BAR_W   = 220;
const BAR_H   = 70;
const FLOOR_W = 1780;
const FLOOR_H = 1000;
const SNAP    = 16;

const snap = (v: number) => Math.round(v / SNAP) * SNAP;

// ─── Helpers de icono de forma ────────────────────────────
function FormaIcon({ forma, size = 18 }: { forma: string; size?: number }) {
  if (forma === "redonda")  return <CircleDot size={size} strokeWidth={1.8} />;
  if (forma === "barra")    return <Minus     size={size} strokeWidth={2.2} />;
  return                           <Square    size={size} strokeWidth={1.8} />;
}

export default function Mesas() {
  const [mesas,       setMesas]       = useState<MesaLocal[]>([]);
  const [mode,        setMode]        = useState<Mode>("view");
  const [selected,    setSelected]    = useState<number | null>(null);
  const [editTarget,  setEditTarget]  = useState<MesaLocal | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [newNombre,   setNewNombre]   = useState("");
  const [newForma,    setNewForma]    = useState<"cuadrada"|"redonda"|"barra">("cuadrada");
  const [confirm,     setConfirm]     = useState<null|{
    titulo: string; descripcion?: string;
    tipo?: "default"|"warning"|"danger";
    textoConfirmar?: string; onConfirmar: () => void;
  }>(null);
  const [newCap,      setNewCap]      = useState(4);
  const [toasts,      setToasts]      = useState<Toast[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [savedFlash,  setSavedFlash]  = useState(false);

  const floorRef  = useRef<HTMLDivElement>(null);
  const dragRef   = useRef<{ id:number; startX:number; startY:number; origX:number; origY:number }|null>(null);
  const mesasRef  = useRef<MesaLocal[]>([]);

  useEffect(() => { mesasRef.current = mesas; }, [mesas]);

  const navigate = useNavigate();
  const location = useLocation();

  const toast = useCallback((msg: string, type: "ok"|"err" = "ok") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  async function cargarMesas() {
    setLoading(true);
    try {
      const res = await api.get("/mesas");
      const data: Mesa[] = res.data;
      setMesas(data.map((m, i) => ({
        ...m,
        x:        m.x        ?? snap(80 + (i % 7) * 120),
        y:        m.y        ?? snap(80 + Math.floor(i / 7) * 130),
        forma:    m.forma    ?? "cuadrada",
        capacidad:m.capacidad?? 4,
      })));
    } catch { toast("Error al cargar mesas", "err"); }
    finally  { setLoading(false); }
  }

  async function crearMesa() {
    if (!newNombre.trim()) return;
    try {
      const res = await api.post("/mesas", {
        nombre: newNombre, forma: newForma, capacidad: newCap,
        x: snap(80 + (mesas.length % 7) * 120),
        y: snap(80 + Math.floor(mesas.length / 7) * 130),
      });
      const m: Mesa = res.data;
      setMesas(prev => [...prev, {
        ...m, forma: m.forma ?? newForma,
        capacidad: m.capacidad ?? newCap,
        x: m.x ?? 80, y: m.y ?? 80,
      }]);
      setNewNombre(""); setShowCreate(false);
      toast(`"${m.nombre}" creada`);
    } catch { toast("No se pudo crear", "err"); }
  }

  async function guardarEdicion() {
    if (!editTarget) return;
    setConfirm({
      titulo: "¿Guardar cambios?",
      descripcion: `Se actualizará "${editTarget.nombre}".`,
      tipo: "warning", textoConfirmar: "Guardar",
      onConfirmar: async () => {
        setConfirm(null);
        try {
          await api.put(`/mesas/${editTarget.id}`, {
            nombre: editTarget.nombre, forma: editTarget.forma, capacidad: editTarget.capacidad,
          });
          setMesas(prev => prev.map(m => m.id === editTarget.id ? { ...m, ...editTarget } : m));
          setEditTarget(null);
          toast("Cambios guardados");
        } catch { toast("No se pudo guardar", "err"); }
      },
    });
  }

  async function eliminarMesa(mesa: MesaLocal) {
    setConfirm({
      titulo: "¿Eliminar mesa?",
      descripcion: `Se eliminará "${mesa.nombre}" y se perderá la cuenta actual.`,
      tipo: "warning", textoConfirmar: "Continuar",
      onConfirmar: () => {
        setConfirm(null);
        setTimeout(() => {
          setConfirm({
            titulo: "¿Estás seguro?",
            descripcion: "Esta acción no se puede deshacer.",
            tipo: "danger", textoConfirmar: "Sí, eliminar",
            onConfirmar: async () => {
              setConfirm(null);
              try {
                await api.delete(`/mesas/${mesa.id}`);
                setMesas(prev => prev.filter(m => m.id !== mesa.id));
                if (selected === mesa.id) setSelected(null);
                setEditTarget(null);
                toast(`"${mesa.nombre}" eliminada`);
              } catch { toast("No se pudo eliminar", "err"); }
            },
          });
        }, 100);
      },
    });
  }

  function getMesaSize(mesa: MesaLocal) {
    return mesa.forma === "barra" ? { w: BAR_W, h: BAR_H } : { w: TABLE_W, h: TABLE_H };
  }

  async function guardarPosicion(id: number, x: number, y: number) {
    try {
      await api.put(`/mesas/${id}/posicion`, { x, y });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch { /* silent */ }
  }

  useWebSocket(["mesas_actualizadas"], cargarMesas);
  useEffect(() => { cargarMesas(); }, [location.pathname]);

  const onMouseDown = useCallback((e: React.MouseEvent, id: number) => {
    if (mode !== "edit") return;
    e.preventDefault(); e.stopPropagation();
    setSelected(id);
    const mesa = mesasRef.current.find(m => m.id === id);
    if (!mesa) return;
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: mesa.x, origY: mesa.y };
  }, [mode]);

  const onTouchStart = useCallback((e: React.TouchEvent, id: number) => {
    if (mode !== "edit") return;
    const t = e.touches[0];
    const mesa = mesasRef.current.find(m => m.id === id);
    if (!mesa) return;
    setSelected(id);
    dragRef.current = { id, startX: t.clientX, startY: t.clientY, origX: mesa.x, origY: mesa.y };
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit") return;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { id, startX, startY, origX, origY } = dragRef.current;
      const mesa = mesasRef.current.find(m => m.id === id);
      if (!mesa) return;
      const size = getMesaSize(mesa);
      const nx = Math.max(0, Math.min(FLOOR_W - size.w, snap(origX + e.clientX - startX)));
      const ny = Math.max(0, Math.min(FLOOR_H - size.h, snap(origY + e.clientY - startY)));
      setMesas(prev => prev.map(m => m.id === id ? { ...m, x: nx, y: ny } : m));
    };
    const onUp = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { id, startX, startY } = dragRef.current;
      const moved = Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4;
      if (moved) {
        const mesa = mesasRef.current.find(m => m.id === id);
        if (mesa) guardarPosicion(id, mesa.x, mesa.y);
      }
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [mode]);

  useEffect(() => {
    if (mode !== "edit") return;
    const onMove = (e: TouchEvent) => {
      if (!dragRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      const { id, startX, startY, origX, origY } = dragRef.current;
      const mesa = mesasRef.current.find(m => m.id === id);
      if (!mesa) return;
      const size = getMesaSize(mesa);
      const nx = Math.max(0, Math.min(FLOOR_W - size.w, snap(origX + t.clientX - startX)));
      const ny = Math.max(0, Math.min(FLOOR_H - size.h, snap(origY + t.clientY - startY)));
      setMesas(prev => prev.map(m => m.id === id ? { ...m, x: nx, y: ny } : m));
    };
    const onUp = () => {
      if (!dragRef.current) return;
      const { id } = dragRef.current;
      const mesa = mesasRef.current.find(m => m.id === id);
      if (mesa) guardarPosicion(id, mesa.x, mesa.y);
      dragRef.current = null;
    };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onUp);
    return () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp); };
  }, [mode]);

  const libres   = mesas.filter(m => m.estado === "LIBRE").length;
  const ocupadas = mesas.length - libres;
  const pct      = mesas.length > 0 ? Math.round((ocupadas / mesas.length) * 100) : 0;

  // ─── Estilos compartidos ──────────────────────────────
  const btnBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "7px 13px", borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: "none", whiteSpace: "nowrap",
    fontFamily: "'Inter', system-ui, sans-serif", transition: "opacity .15s",
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .mr-root {
          display: flex; flex-direction: column; height: 100vh;
          background: ${C.bg}; font-family: 'Inter', system-ui, sans-serif;
          color: ${C.text}; overflow: hidden;
        }

        /* ── HEADER ── */
        .mr-header {
          flex-shrink: 0; display: flex; align-items: center;
          justify-content: space-between; padding: 0 20px; height: 54px;
          background: ${C.surface}; border-bottom: 1px solid ${C.border}; gap: 12px; z-index: 20;
        }
        .mr-brand {
          font-size: 14px; font-weight: 700; color: ${C.text};
          display: flex; align-items: center; gap: 8px;
        }
        .mr-brand-icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: ${C.accentLight}; border: 1px solid ${C.accentMid};
          display: flex; align-items: center; justify-content: center; color: ${C.accent};
        }

        /* stats */
        .mr-stats { display: flex; gap: 4px; align-items: center; }
        .mr-stat-sep { width: 1px; height: 28px; background: ${C.border}; margin: 0 8px; }
        .mr-stat { display: flex; flex-direction: column; align-items: center; min-width: 44px; }
        .mr-stat-val { font-size: 17px; font-weight: 800; line-height: 1; }
        .mr-stat-lbl { font-size: 9px; font-weight: 600; text-transform: uppercase; color: ${C.textMuted}; margin-top: 2px; letter-spacing: .04em; }
        .clr-blue   { color: ${C.blue}; }
        .clr-green  { color: ${C.libre}; }
        .clr-orange { color: ${C.ocupada}; }

        .occ-bar-wrap { min-width: 120px; }
        .occ-bar-lbl  { font-size: 10px; color: ${C.textMuted}; margin-bottom: 5px; display: flex; justify-content: space-between; font-weight: 500; }
        .occ-track    { height: 4px; background: ${C.border}; border-radius: 99px; overflow: hidden; }
        .occ-fill     { height: 100%; border-radius: 99px; background: ${C.blue}; transition: width .5s ease; }

        .mr-actions { display: flex; gap: 8px; align-items: center; }
        .save-flash { font-size: 11px; color: ${C.accent}; font-weight: 600; display: flex; align-items: center; gap: 4px; }

        /* ── BODY ── */
        .mr-body { flex: 1; display: flex; overflow: hidden; }

        /* ── SIDEBAR ── */
        .mr-sidebar {
          width: 210px; flex-shrink: 0;
          background: ${C.surface}; border-right: 1px solid ${C.border};
          overflow-y: auto; display: flex; flex-direction: column;
        }
        .sidebar-section { padding: 14px 12px 0; }
        .sidebar-title {
          font-size: 9px; font-weight: 700; text-transform: uppercase;
          color: ${C.textMuted}; margin-bottom: 8px; letter-spacing: .1em;
          display: flex; align-items: center; gap: 6px;
        }
        .sidebar-title::after { content: ""; flex: 1; height: 1px; background: ${C.border}; }
        .sidebar-list  { display: flex; flex-direction: column; gap: 2px; padding-bottom: 12px; }
        .sidebar-item  {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 10px; border-radius: 8px; cursor: pointer;
          border: 1px solid transparent; font-size: 12px; transition: background .12s;
        }
        .sidebar-item:hover               { background: ${C.bg}; }
        .sidebar-item.selected            { background: ${C.accentLight}; border-color: ${C.accentMid}; }
        .sidebar-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .sidebar-dot.libre   { background: ${C.libre}; }
        .sidebar-dot.ocupada { background: ${C.ocupada}; }
        .sidebar-name { font-weight: 600; color: ${C.text}; flex: 1; font-size: 12px; }
        .sidebar-badge {
          font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 99px;
          background: ${C.bg}; color: ${C.textMuted}; border: 1px solid ${C.border};
          display: flex; align-items: center; gap: 3px;
        }
        .sidebar-edit-btn {
          opacity: 0; padding: 3px 7px; font-size: 10px; border-radius: 5px;
          background: ${C.bg}; color: ${C.textSub}; border: 1px solid ${C.border};
          cursor: pointer; display: flex; align-items: center; transition: opacity .15s;
        }
        .sidebar-item:hover .sidebar-edit-btn { opacity: 1; }
        .sidebar-divider { height: 1px; background: ${C.border}; margin: 6px 12px; }
        .sidebar-hint {
          font-size: 11px; color: ${C.textMuted}; line-height: 2;
          display: flex; flex-direction: column; gap: 2px;
        }
        .sidebar-hint-row { display: flex; align-items: center; gap: 6px; }

        /* ── FLOOR ── */
        .mr-floor-wrap { flex: 1; overflow: auto; position: relative; background: ${C.bg}; }
        .edit-banner {
          position: sticky; top: 0; z-index: 10;
          background: ${C.accentLight}; border-bottom: 1px solid ${C.accentMid};
          padding: 7px 20px; display: flex; align-items: center; gap: 10px;
        }
        .mode-badge {
          font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px;
          background: ${C.surface}; color: ${C.accent}; border: 1px solid ${C.accentMid};
          display: flex; align-items: center; gap: 5px;
        }
        .mr-floor {
          position: relative; width: 90%; height: 1000px;
          background-color: ${C.floor};
          background-image:
            linear-gradient(${C.floorGrid} 1px, transparent 1px),
            linear-gradient(90deg, ${C.floorGrid} 1px, transparent 1px);
          background-size: 16px 16px;
          border: 1px solid ${C.floorBorder};
          margin: 20px; border-radius: 14px; overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,.06);
        }
        .mr-floor.edit-mode .mesa-card { cursor: grab; }

        /* ── MESAS ── */
        .mesa-card {
          position: absolute; width: 72px; height: 72px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 3px; border: 1.5px solid transparent; user-select: none; touch-action: none;
          transition: box-shadow .15s, transform .1s;
        }
        .mesa-card.cuadrada { border-radius: 11px; }
        .mesa-card.redonda  { border-radius: 50%; }
        .mesa-card.barra    {
          width: 80px; height: 50px; border-radius: 10px;
          border-width: 2px; box-shadow: 0 2px 8px rgba(0,0,0,.1);
        }
        .mesa-card.libre   { background: ${C.libreLight};   border-color: ${C.libreBorder}; }
        .mesa-card.ocupada { background: ${C.ocupadaLight}; border-color: ${C.ocupadaBorder}; }
        .mesa-card.libre.sel   { border-color: ${C.libre};   box-shadow: 0 0 0 3px ${C.accentMid}; }
        .mesa-card.ocupada.sel { border-color: ${C.ocupada}; box-shadow: 0 0 0 3px ${C.ocupadaBorder}; }
        .mesa-card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,.1); }
        .mesa-card.barra.libre   { border-color: ${C.libre};   }
        .mesa-card.barra.ocupada { border-color: ${C.ocupada}; }

        .mesa-name { font-size: 11px; font-weight: 700; color: ${C.text}; text-align: center; line-height: 1.2; padding: 0 5px; word-break: break-word; }
        .mesa-cap-txt { font-size: 9px; color: ${C.textMuted}; display: flex; align-items: center; gap: 2px; }
        .mesa-pill {
          font-size: 7px; font-weight: 800; padding: 2px 7px; border-radius: 99px;
          text-transform: uppercase; letter-spacing: .05em;
        }
        .mesa-card.libre   .mesa-pill { background: ${C.accentMid}; color: #14532d; }
        .mesa-card.ocupada .mesa-pill { background: ${C.ocupadaBorder}; color: #9a3412; }

        .chair { position: absolute; border-radius: 4px; background: ${C.chair}; border: 1px solid ${C.chairBorder}; }

        /* barra fija decorativa */
        .barra-fija {
          position: absolute; left: 20px; right: 20px; bottom: 10px; height: 90px;
          background: linear-gradient(180deg, #a87c54, #7b4e2c);
          border: 2px solid #5a3a24; border-radius: 14px;
          color: rgba(255,255,255,.7); font-size: 11px; font-weight: 800;
          letter-spacing: .18em; text-transform: uppercase;
          display: flex; align-items: center; justify-content: center; z-index: 0;
        }
        .barra-fija::before {
          content: ""; position: absolute; top: 10px; left: 15px; right: 15px;
          height: 4px; background: rgba(255,255,255,.12); border-radius: 99px;
        }

        /* ── OVERLAY ACCIONES (edit mode) ── */
        .mesa-actions-overlay {
          position: absolute; top: -12px; right: -12px;
          display: flex; gap: 3px; opacity: 0; transition: opacity .15s;
        }
        .mesa-card:hover .mesa-actions-overlay,
        .mesa-card.sel   .mesa-actions-overlay { opacity: 1; }
        .mesa-act-btn {
          width: 24px; height: 24px; border-radius: 7px; display: flex;
          align-items: center; justify-content: center; cursor: pointer;
          border: 1px solid ${C.border}; background: ${C.surface};
          color: ${C.textSub}; transition: background .12s;
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
        }
        .mesa-act-btn:hover { background: ${C.bg}; }
        .mesa-act-btn.del:hover { background: ${C.dangerLight}; color: ${C.danger}; border-color: ${C.dangerBorder}; }

        /* ── MODAL ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,.4);
          display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px;
          backdrop-filter: blur(2px);
        }
        .modal {
          background: ${C.surface}; border-radius: 16px; padding: 24px;
          width: 100%; max-width: 360px;
          box-shadow: 0 16px 48px rgba(0,0,0,.14);
          border: 1px solid ${C.border};
        }
        .modal-title { font-size: 16px; font-weight: 800; color: ${C.text}; margin-bottom: 20px; }
        .field { margin-bottom: 14px; }
        .field label { display: block; font-size: 11px; font-weight: 700; color: ${C.textMuted}; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px; }
        .field input {
          width: 100%; background: ${C.bg}; border: 1px solid ${C.border};
          border-radius: 8px; padding: 9px 12px; font-size: 13px;
          font-family: 'Inter', system-ui, sans-serif; color: ${C.text}; outline: none;
        }
        .field input:focus { border-color: ${C.accentMid}; }
        .forma-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        .forma-opt {
          padding: 12px 8px; border-radius: 10px; border: 1px solid ${C.border};
          background: ${C.bg}; cursor: pointer; display: flex; flex-direction: column;
          align-items: center; gap: 7px; font-size: 11px; font-weight: 600; color: ${C.textSub};
          transition: all .15s;
        }
        .forma-opt:hover  { border-color: ${C.accentMid}; background: ${C.accentLight}; color: ${C.accent}; }
        .forma-opt.active { border-color: ${C.accent}; background: ${C.accentLight}; color: ${C.accent}; }
        .modal-footer { display: flex; gap: 8px; margin-top: 20px; justify-content: flex-end; }

        /* ── TOASTS ── */
        .toast-wrap { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; z-index: 200; }
        .toast {
          padding: 9px 16px; border-radius: 99px; font-size: 12px; font-weight: 600;
          display: flex; align-items: center; gap: 7px;
          box-shadow: 0 4px 16px rgba(0,0,0,.08);
        }
        .toast.ok  { background: ${C.accentLight}; border: 1px solid ${C.accentMid}; color: ${C.accent}; }
        .toast.err { background: ${C.dangerLight}; border: 1px solid ${C.dangerBorder}; color: ${C.danger}; }

        .floor-empty {
          position: absolute; inset: 0; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 10px;
          color: ${C.textMuted};
        }
        .floor-empty-txt { font-size: 13px; font-weight: 500; }
      `}</style>

      <div className="mr-root">

        {/* ═══════ HEADER ═══════ */}
        <div className="mr-header">
          <div className="mr-brand">
            <div className="mr-brand-icon">
              <LayoutGrid size={15} strokeWidth={2} />
            </div>
            Plano del restaurante
          </div>

          <div className="mr-stats">
            <div className="mr-stat">
              <div className="mr-stat-val clr-blue">{mesas.length}</div>
              <div className="mr-stat-lbl">Total</div>
            </div>
            <div className="mr-stat-sep" />
            <div className="mr-stat">
              <div className="mr-stat-val clr-green">{libres}</div>
              <div className="mr-stat-lbl">Libres</div>
            </div>
            <div className="mr-stat-sep" />
            <div className="mr-stat">
              <div className="mr-stat-val clr-orange">{ocupadas}</div>
              <div className="mr-stat-lbl">Ocupadas</div>
            </div>
            <div className="mr-stat-sep" />
            <div className="occ-bar-wrap">
              <div className="occ-bar-lbl">
                <span>Ocupación</span><span>{pct}%</span>
              </div>
              <div className="occ-track">
                <div className="occ-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          <div className="mr-actions">
            {savedFlash && (
              <span className="save-flash">
                <CheckCircle2 size={13} strokeWidth={2.5} /> Posición guardada
              </span>
            )}
            {mode === "edit" && (
              <button
                style={{ ...btnBase, background: C.accent, color: "white", boxShadow: "0 2px 8px rgba(22,163,74,.25)" }}
                onClick={() => setShowCreate(true)}
              >
                <Plus size={14} strokeWidth={2.5} /> Nueva mesa
              </button>
            )}
            <button
              style={{
                ...btnBase,
                background: mode === "edit" ? C.accentLight : C.bg,
                color:      mode === "edit" ? C.accent      : C.textSub,
                border:     `1px solid ${mode === "edit" ? C.accentMid : C.border}`,
              }}
              onClick={() => { setMode(m => m === "edit" ? "view" : "edit"); setSelected(null); }}
            >
              {mode === "edit"
                ? <><Check   size={13} strokeWidth={2.5} /> Listo</>
                : <><Pencil  size={13} strokeWidth={2}   /> Editar plano</>
              }
            </button>
            <button
              style={{ ...btnBase, background: C.bg, color: C.textSub, border: `1px solid ${C.border}`, padding: "7px 10px" }}
              onClick={cargarMesas} disabled={loading}
            >
              <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? "spin 1s linear infinite" : undefined }} />
            </button>
          </div>
        </div>

        <div className="mr-body">

          {/* ═══════ SIDEBAR ═══════ */}
          <div className="mr-sidebar">
            <div className="sidebar-section">
              <div className="sidebar-title">Mesas</div>
              <div className="sidebar-list">
                {mesas.map(m => (
                  <div
                    key={m.id}
                    className={`sidebar-item ${selected === m.id ? "selected" : ""}`}
                    onClick={() => { setSelected(m.id); if (mode === "view") navigate(`/cuenta/${m.id}`); }}
                  >
                    <div className={`sidebar-dot ${m.estado === "LIBRE" ? "libre" : "ocupada"}`} />
                    <span className="sidebar-name">{m.nombre}</span>
                    <span className="sidebar-badge">
                      <Users size={9} strokeWidth={2} />{m.capacidad}
                    </span>
                    {mode === "edit" && (
                      <button
                        className="sidebar-edit-btn"
                        onClick={e => { e.stopPropagation(); setEditTarget({ ...m }); }}
                      >
                        <Edit3 size={10} strokeWidth={2} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {mode === "edit" && (
              <>
                <div className="sidebar-divider" />
                <div className="sidebar-section" style={{ paddingBottom: 14 }}>
                  <div className="sidebar-title">Cómo editar</div>
                  <div className="sidebar-hint">
                    <div className="sidebar-hint-row"><Move     size={11} color={C.textMuted} /> Arrastra para mover</div>
                    <div className="sidebar-hint-row"><Edit3    size={11} color={C.textMuted} /> ✎ para renombrar</div>
                    <div className="sidebar-hint-row"><Trash2   size={11} color={C.textMuted} /> 🗑 para eliminar</div>
                    <div className="sidebar-hint-row"><CheckCircle2 size={11} color={C.textMuted} /> Posición auto-guardada</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ═══════ FLOOR ═══════ */}
          <div className="mr-floor-wrap">
            {mode === "edit" && (
              <div className="edit-banner">
                <span className="mode-badge">
                  <Pencil size={11} strokeWidth={2.5} /> Modo edición
                </span>
                <span style={{ fontSize: 11, color: C.textSub }}>
                  Arrastra las mesas para reorganizar el plano
                </span>
              </div>
            )}

            <div
              ref={floorRef}
              className={`mr-floor ${mode === "edit" ? "edit-mode" : ""}`}
              onClick={() => setSelected(null)}
            >
              <div className="barra-fija">BARRA</div>

              {mesas.length === 0 && !loading && (
                <div className="floor-empty">
                  <LayoutGrid size={32} color={C.textMuted} strokeWidth={1.5} />
                  <div className="floor-empty-txt">Sin mesas en el plano</div>
                </div>
              )}

              {mesas.map(mesa => {
                const libre  = mesa.estado === "LIBRE";
                const isSel  = selected === mesa.id;
                const cap    = mesa.capacidad;
                const w      = Math.min(cap * 14, 62);
                const hh     = Math.min(cap * 10, 42);

                return (
                  <div
                    key={mesa.id}
                    className={`mesa-card ${mesa.forma} ${libre ? "libre" : "ocupada"} ${isSel ? "sel" : ""}`}
                    style={{ left: mesa.x, top: mesa.y }}
                    onMouseDown={e => onMouseDown(e, mesa.id)}
                    onTouchStart={e => onTouchStart(e, mesa.id)}
                    onClick={e => {
                      e.stopPropagation();
                      if (mode === "view") navigate(`/cuenta/${mesa.id}`);
                      else setSelected(mesa.id);
                    }}
                  >
                    {mesa.forma === "barra" ? (
                      <>
                        <span style={{ fontSize: 10, fontWeight: 700, color: libre ? C.libre : C.ocupada, textAlign: "center", padding: "2px 4px" }}>
                          {mesa.nombre}
                        </span>
                        <div className="mesa-pill">{mesa.estado}</div>
                      </>
                    ) : (
                      <>
                        {/* sillas cuadrada */}
                        {mesa.forma === "cuadrada" ? (
                          <>
                            <div className="chair" style={{ width: w, height: 7, top: -12, left: "50%", transform: "translateX(-50%)" }} />
                            <div className="chair" style={{ width: w, height: 7, bottom: -12, left: "50%", transform: "translateX(-50%)" }} />
                            {cap >= 4 && (<>
                              <div className="chair" style={{ height: hh, width: 7, left: -12, top: "50%", transform: "translateY(-50%)" }} />
                              <div className="chair" style={{ height: hh, width: 7, right: -12, top: "50%", transform: "translateY(-50%)" }} />
                            </>)}
                          </>
                        ) : (
                          <>
                            <div className="chair" style={{ width: 10, height: 10, borderRadius: "50%", top: -13, left: "50%", transform: "translateX(-50%)" }} />
                            <div className="chair" style={{ width: 10, height: 10, borderRadius: "50%", bottom: -13, left: "50%", transform: "translateX(-50%)" }} />
                            {cap >= 4 && (<>
                              <div className="chair" style={{ width: 10, height: 10, borderRadius: "50%", left: -13, top: "50%", transform: "translateY(-50%)" }} />
                              <div className="chair" style={{ width: 10, height: 10, borderRadius: "50%", right: -13, top: "50%", transform: "translateY(-50%)" }} />
                            </>)}
                          </>
                        )}
                        <div className="mesa-name">{mesa.nombre}</div>
                        <div className="mesa-cap-txt"><Armchair size={9} strokeWidth={2} />{cap}</div>
                        <div className="mesa-pill">{mesa.estado}</div>
                      </>
                    )}

                    {mode === "edit" && (
                      <div className="mesa-actions-overlay">
                        <button
                          className="mesa-act-btn"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); setEditTarget({ ...mesa }); }}
                        >
                          <Edit3 size={11} strokeWidth={2} />
                        </button>
                        <button
                          className="mesa-act-btn del"
                          onMouseDown={e => e.stopPropagation()}
                          onClick={e => { e.stopPropagation(); eliminarMesa(mesa); }}
                        >
                          <Trash2 size={11} strokeWidth={2} />
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

      {/* ═══════ MODAL CREAR ═══════ */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Nueva mesa</div>

            <div className="field">
              <label>Nombre</label>
              <input autoFocus value={newNombre}
                onChange={e => setNewNombre(e.target.value)}
                onKeyDown={e => e.key === "Enter" && crearMesa()}
                placeholder="Ej. Mesa 5, Barra 1…" />
            </div>

            <div className="field">
              <label>Forma</label>
              <div className="forma-grid">
                {(["cuadrada","redonda","barra"] as const).map(f => (
                  <div key={f} className={`forma-opt ${newForma === f ? "active" : ""}`} onClick={() => setNewForma(f)}>
                    <FormaIcon forma={f} size={20} />
                    {f === "cuadrada" ? "Cuadrada" : f === "redonda" ? "Redonda" : "Barra"}
                  </div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Capacidad / puntos</label>
              <input type="number" min={1} max={20} value={newCap} onChange={e => setNewCap(Number(e.target.value))} />
            </div>

            <div className="modal-footer">
              <button style={{ ...btnBase, background: C.bg, color: C.textSub, border: `1px solid ${C.border}` }} onClick={() => setShowCreate(false)}>
                Cancelar
              </button>
              <button style={{ ...btnBase, background: C.accent, color: "white", boxShadow: "0 2px 8px rgba(22,163,74,.22)", opacity: !newNombre.trim() ? .5 : 1 }}
                onClick={crearMesa} disabled={!newNombre.trim()}>
                <Plus size={13} strokeWidth={2.5} /> Crear mesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL EDITAR ═══════ */}
      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Editar mesa</div>

            <div className="field">
              <label>Nombre</label>
              <input autoFocus value={editTarget.nombre}
                onChange={e => setEditTarget(t => t && { ...t, nombre: e.target.value })}
                onKeyDown={e => e.key === "Enter" && guardarEdicion()} />
            </div>

            <div className="field">
              <label>Forma</label>
              <div className="forma-grid">
                {(["cuadrada","redonda","barra"] as const).map(f => (
                  <div key={f} className={`forma-opt ${editTarget.forma === f ? "active" : ""}`}
                    onClick={() => setEditTarget(t => t && { ...t, forma: f })}>
                    <FormaIcon forma={f} size={20} />
                    {f === "cuadrada" ? "Cuadrada" : f === "redonda" ? "Redonda" : "Barra"}
                  </div>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Capacidad / puntos</label>
              <input type="number" min={1} max={20} value={editTarget.capacidad}
                onChange={e => setEditTarget(t => t && { ...t, capacidad: Number(e.target.value) })} />
            </div>

            <div className="modal-footer">
              <button style={{ ...btnBase, background: C.dangerLight, color: C.danger, border: `1px solid ${C.dangerBorder}` }}
                onClick={() => { setEditTarget(null); eliminarMesa(editTarget!); }}>
                <Trash2 size={13} strokeWidth={2} /> Eliminar
              </button>
              <button style={{ ...btnBase, background: C.bg, color: C.textSub, border: `1px solid ${C.border}` }}
                onClick={() => setEditTarget(null)}>
                Cancelar
              </button>
              <button style={{ ...btnBase, background: C.accent, color: "white", boxShadow: "0 2px 8px rgba(22,163,74,.22)", opacity: !editTarget.nombre.trim() ? .5 : 1 }}
                onClick={guardarEdicion} disabled={!editTarget.nombre.trim()}>
                <Check size={13} strokeWidth={2.5} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TOASTS ═══════ */}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === "ok"
              ? <CheckCircle2 size={13} strokeWidth={2.5} />
              : <AlertCircle  size={13} strokeWidth={2.5} />}
            {t.msg}
          </div>
        ))}
      </div>

      {confirm && <ConfirmModal {...confirm} onCancelar={() => setConfirm(null)} />}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}