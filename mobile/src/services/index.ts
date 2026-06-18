// src/types/index.ts
// Tipos espejo de los modelos/respuestas de FastAPI (main.py / models.py).
// No se redefine lógica de negocio aquí, solo formas de datos para el cliente.

export interface Mesa {
  id: number;
  nombre: string;
  estado: "LIBRE" | "OCUPADA" | string;
  forma?: "cuadrada" | "redonda" | "barra";
  capacidad?: number;
  x?: number;
  y?: number;
}

export interface Cuenta {
  id: number;
  mesa_id: number;
  estado: "ABIERTA" | "PAGADA" | "ANULADA" | string;
  fecha_apertura?: string;
  fecha_cierre?: string | null;
}

export interface DetalleCuenta {
  id: number;
  producto: string;
  cantidad: number;
  precio_unitario: number;
}

export interface Producto {
  id: number;
  nombre: string;
  precio: number;
}

export interface DetalleOrdenActividad {
  id: number;
  orden_id: number;
  fecha: string;
  producto: string;
  cantidad: number;
  observacion?: string | null;
  estado: "PENDIENTE" | "PREPARACION" | "LISTO" | "ENTREGADO" | string;
}

export interface OrdenCocina {
  id: number;
  orden_id: number;
  mesa: string;
  producto: string;
  cantidad: number;
  observacion: string | null;
  estado: "PENDIENTE" | "PREPARACION" | "LISTO" | "ENTREGADO" | string;
  fecha: string;
}

export interface ProductoCarritoItem {
  id: number; // id local temporal del item en el carrito
  productoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  observacion: string;
}

export type ConfirmTipo = "default" | "warning" | "danger" | "success" | "money";

export interface ConfirmState {
  titulo: string;
  descripcion?: string;
  tipo?: ConfirmTipo;
  textoConfirmar?: string;
  onConfirmar: () => void;
}

export interface ToastItem {
  id: number;
  msg: string;
  type: "ok" | "err";
}