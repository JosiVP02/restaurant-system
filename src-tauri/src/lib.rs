use std::process::Command;
use std::os::windows::process::CommandExt;

mod impresora;
use impresora::{DatosFactura, imprimir_factura, imprimir_precuenta};

use local_ip_address::local_ip;
use hostname::get;

const CREATE_NO_WINDOW: u32 = 0x08000000;

// ── COMANDOS TAURI ────────────────────────────────────────────

#[tauri::command]
fn cmd_imprimir_factura(
    datos: DatosFactura,
    vendor_id: u16,
    product_id: u16,
) -> Result<(), String> {
    imprimir_factura(datos, vendor_id, product_id)
}

#[tauri::command]
fn cmd_imprimir_precuenta(
    datos: DatosFactura,
    vendor_id: u16,
    product_id: u16,
) -> Result<(), String> {
    imprimir_precuenta(datos, vendor_id, product_id)
}

#[tauri::command]
fn cmd_listar_impresoras() -> Vec<serde_json::Value> {
    vec![]
}

// ── Verifica si FastAPI ya está corriendo ─────────────────────
fn backend_esta_activo() -> bool {
    std::net::TcpStream::connect("127.0.0.1:8000").is_ok()
}

#[tauri::command]
fn obtener_info_red() -> Result<serde_json::Value, String> {
    let ip = local_ip()
        .map_err(|e| e.to_string())?
        .to_string();

    let host = get()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .to_string();

    Ok(serde_json::json!({
        "host": host,
        "ip": ip,
        "puerto": 8000,
        "url": format!("http://{}:8000", ip)
    }))
}

// ── ENTRY POINT ───────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            cmd_imprimir_factura,
            cmd_imprimir_precuenta,
            cmd_listar_impresoras,
            obtener_info_red,
        ])
        .setup(|app| {
            let raiz = std::env::current_exe()
                .unwrap()
                .parent()
                .unwrap()
                .to_path_buf();

            let python  = raiz.join("runtime").join("python").join("python.exe");
            let backend = raiz.join("runtime").join("backend");

            // ── LOG DE DEBUG ──────────────────────────────────────
            let log_content = format!(
                "current_exe: {:?}\nraiz: {:?}\npython: {:?} existe={}\nbackend: {:?} existe={}\nbackend_activo={}\n",
                std::env::current_exe().unwrap(),
                raiz,
                python, python.exists(),
                backend, backend.exists(),
                backend_esta_activo(),
            );
            std::fs::write(raiz.join("poskey_debug.log"), &log_content).ok();
            // ─────────────────────────────────────────────────────

            if !backend_esta_activo() {
                Command::new(&python)
                    .creation_flags(CREATE_NO_WINDOW)
                    .arg("-m")
                    .arg("uvicorn")
                    .arg("main:app")
                    .arg("--host")
                    .arg("0.0.0.0")
                    .arg("--port")
                    .arg("8000")
                    .current_dir(&backend)
                    .spawn()
                    .expect("No se pudo iniciar FastAPI");
            } else {
                println!("Backend ya estaba activo, reutilizando.");
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}