use escpos::{
    driver::WindowsUsbPrintDriver,
    printer::Printer,
    utils::{JustifyMode, Protocol},
};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct LineaVenta {
    pub nombre: String,
    pub cantidad: u32,
    pub precio_unit: f64,
    pub subtotal: f64,
}

#[derive(Deserialize)]
pub struct DatosFactura {
    pub negocio: String,
    pub direccion: String,
    pub telefono: String,
    pub num_factura: String,
    pub fecha: String,
    pub cajero: String,
    pub cliente: String,
    pub lineas: Vec<LineaVenta>,
    pub subtotal: f64,
    pub impuesto: f64,
    pub total: f64,
    pub metodo_pago: String,
    pub monto_pagado: Option<f64>,
    pub cambio: Option<f64>,
}

pub fn imprimir_factura(
    datos: DatosFactura,
    vendor_id: u16,
    product_id: u16,
) -> Result<(), String> {
    let driver = WindowsUsbPrintDriver::open_by_vid_pid(vendor_id, product_id)
        .map_err(|e| format!("No se pudo abrir la impresora: {e}"))?;

    let mut p = Printer::new(driver, Protocol::default(), None);

    p.justify(JustifyMode::CENTER)
        .map_err(|e| e.to_string())?
        .bold(true)
        .map_err(|e| e.to_string())?
        .size(2, 2)
        .map_err(|e| e.to_string())?
        .writeln(&datos.negocio)
        .map_err(|e| e.to_string())?
        .size(1, 1)
        .map_err(|e| e.to_string())?
        .bold(false)
        .map_err(|e| e.to_string())?
        .writeln(&datos.direccion)
        .map_err(|e| e.to_string())?
        .writeln(&format!("Tel: {}", datos.telefono))
        .map_err(|e| e.to_string())?
        .writeln("================================")
        .map_err(|e| e.to_string())?;

    p.justify(JustifyMode::LEFT)
        .map_err(|e| e.to_string())?
        .writeln(&format!("Factura #: {}", datos.num_factura))
        .map_err(|e| e.to_string())?
        .writeln(&format!("Fecha   : {}", datos.fecha))
        .map_err(|e| e.to_string())?
        .writeln(&format!("Cajero  : {}", datos.cajero))
        .map_err(|e| e.to_string())?
        .writeln(&format!("Cliente : {}", datos.cliente))
        .map_err(|e| e.to_string())?
        .writeln("--------------------------------")
        .map_err(|e| e.to_string())?;

    p.bold(true)
        .map_err(|e| e.to_string())?
        .writeln("CANT  DESCRIPCION       TOTAL")
        .map_err(|e| e.to_string())?
        .bold(false)
        .map_err(|e| e.to_string())?
        .writeln("--------------------------------")
        .map_err(|e| e.to_string())?;

    for linea in &datos.lineas {
        let nombre_corto = if linea.nombre.len() > 16 {
            &linea.nombre[..16]
        } else {
            &linea.nombre
        };
        p.writeln(&format!(
            "{:<5} {:<16} {:>7.2}",
            linea.cantidad, nombre_corto, linea.subtotal
        ))
        .map_err(|e| e.to_string())?;
    }

    p.writeln("================================")
        .map_err(|e| e.to_string())?
        .writeln(&format!("Subtotal:          {:>8.2}", datos.subtotal))
        .map_err(|e| e.to_string())?
        .writeln(&format!("Impuesto (IVA):    {:>8.2}", datos.impuesto))
        .map_err(|e| e.to_string())?
        .bold(true)
        .map_err(|e| e.to_string())?
        .writeln(&format!("TOTAL:             {:>8.2}", datos.total))
        .map_err(|e| e.to_string())?
        .bold(false)
        .map_err(|e| e.to_string())?
        .writeln("--------------------------------")
        .map_err(|e| e.to_string())?
        .writeln(&format!(
            "Pago ({}):       {:>8.2}",
            datos.metodo_pago,
            datos.monto_pagado.unwrap_or(datos.total)
        ))
        .map_err(|e| e.to_string())?;

    if let Some(cambio) = datos.cambio {
        p.writeln(&format!("Cambio:            {:>8.2}", cambio))
            .map_err(|e| e.to_string())?;
    }

    p.justify(JustifyMode::CENTER)
        .map_err(|e| e.to_string())?
        .writeln("")
        .map_err(|e| e.to_string())?
        .writeln("¡Gracias por su compra!")
        .map_err(|e| e.to_string())?
        .writeln("")
        .map_err(|e| e.to_string())?
        .cut()
        .map_err(|e| e.to_string())?
        .print()
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn imprimir_precuenta(
    datos: DatosFactura,
    vendor_id: u16,
    product_id: u16,
) -> Result<(), String> {
    let driver = WindowsUsbPrintDriver::open_by_vid_pid(vendor_id, product_id)
        .map_err(|e| format!("No se pudo abrir la impresora: {e}"))?;

    let mut p = Printer::new(driver, Protocol::default(), None);

    p.justify(JustifyMode::CENTER)
        .map_err(|e| e.to_string())?
        .bold(true)
        .map_err(|e| e.to_string())?
        .writeln("*** PRE-CUENTA ***")
        .map_err(|e| e.to_string())?
        .bold(false)
        .map_err(|e| e.to_string())?
        .writeln(&datos.negocio)
        .map_err(|e| e.to_string())?
        .writeln("================================")
        .map_err(|e| e.to_string())?
        .justify(JustifyMode::LEFT)
        .map_err(|e| e.to_string())?
        .writeln(&format!("Mesa/Pedido : {}", datos.num_factura))
        .map_err(|e| e.to_string())?
        .writeln(&format!("Fecha       : {}", datos.fecha))
        .map_err(|e| e.to_string())?
        .writeln("--------------------------------")
        .map_err(|e| e.to_string())?;

    for linea in &datos.lineas {
        let nombre_corto = if linea.nombre.len() > 16 {
            &linea.nombre[..16]
        } else {
            &linea.nombre
        };
        p.writeln(&format!(
            "{:<5} {:<16} {:>7.2}",
            linea.cantidad, nombre_corto, linea.subtotal
        ))
        .map_err(|e| e.to_string())?;
    }

    p.writeln("================================")
        .map_err(|e| e.to_string())?
        .bold(true)
        .map_err(|e| e.to_string())?
        .writeln(&format!("TOTAL A PAGAR:     {:>8.2}", datos.total))
        .map_err(|e| e.to_string())?
        .bold(false)
        .map_err(|e| e.to_string())?
        .justify(JustifyMode::CENTER)
        .map_err(|e| e.to_string())?
        .writeln("")
        .map_err(|e| e.to_string())?
        .writeln("No es comprobante fiscal")
        .map_err(|e| e.to_string())?
        .cut()
        .map_err(|e| e.to_string())?
        .print()
        .map_err(|e| e.to_string())?;

    Ok(())
}