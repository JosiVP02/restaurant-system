import { invoke } from "@tauri-apps/api/core";
import { api } from "../services/api";

export interface ImpresoraInfo {
  nombre: string;
  vendor_id: number;
  product_id: number;
}

export interface LineaVenta {
  nombre: string;
  cantidad: number;
  precio_unit: number;
  subtotal: number;
}

export interface DatosFactura {
  negocio: string;
  direccion: string;
  telefono: string;
  num_factura: string;
  fecha: string;
  cajero: string;
  cliente: string;
  lineas: LineaVenta[];
  subtotal: number;
  impuesto: number;
  total: number;
  metodo_pago: string;
  monto_pagado?: number;
  cambio?: number;
}

export function usePrinter() {
  const getImpresora = async (): Promise<ImpresoraInfo | null> => {
    try {
      const res = await api.get("/configuracion");
      const vid = res.data.impresora_vid;
      const pid = res.data.impresora_pid;
      if (!vid || !pid) return null;
      return { nombre: "Térmica USB", vendor_id: vid, product_id: pid };
    } catch { return null; }
  };

  const listarImpresoras = (): Promise<ImpresoraInfo[]> =>
    invoke("cmd_listar_impresoras");

  const imprimirFactura = async (datos: DatosFactura) => {
    const imp = await getImpresora();
    if (!imp) throw new Error("Sin impresora configurada. Ve a Configuración.");
    await invoke("cmd_imprimir_factura", {
      datos,
      vendorId: imp.vendor_id,
      productId: imp.product_id,
    });
  };

  const imprimirPrecuenta = async (datos: DatosFactura) => {
    const imp = await getImpresora();
    if (!imp) throw new Error("Sin impresora configurada. Ve a Configuración.");
    await invoke("cmd_imprimir_precuenta", {
      datos,
      vendorId: imp.vendor_id,
      productId: imp.product_id,
    });
  };

  return { listarImpresoras, imprimirFactura, imprimirPrecuenta, getImpresora };
}