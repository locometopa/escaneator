//! Parte nativa de Escaneator: guarda los trabajos en Documentos\Escaneator
//! y maneja el escáner de Windows (WIA) a través de PowerShell.

use std::fs;
use std::path::PathBuf;
use std::process::Command;

use tauri::Manager;

const GUION_ESCANER: &str = include_str!("escaner.ps1");

fn carpeta(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .document_dir()
        .map_err(|e| format!("no se encuentra la carpeta Documentos: {e}"))?;
    let dir = base.join("Escaneator");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Solo se aceptan nombres sencillos: nada de rutas ni caracteres prohibidos en Windows.
fn ruta_trabajo(app: &tauri::AppHandle, nombre: &str) -> Result<PathBuf, String> {
    let n = nombre.trim();
    let prohibido = |c: char| matches!(c, '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|') || c.is_control();
    if n.is_empty() || n.len() > 120 || n.starts_with('.') || n.chars().any(prohibido) {
        return Err("nombre no válido".into());
    }
    Ok(carpeta(app)?.join(format!("{n}.json")))
}

#[tauri::command]
fn listar_trabajos(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let mut lista = Vec::new();
    for entrada in fs::read_dir(carpeta(&app)?).map_err(|e| e.to_string())? {
        let ruta = entrada.map_err(|e| e.to_string())?.path();
        if ruta.extension().and_then(|x| x.to_str()) == Some("json") {
            if let Some(n) = ruta.file_stem().and_then(|x| x.to_str()) {
                lista.push(n.to_string());
            }
        }
    }
    lista.sort_by_key(|a| a.to_lowercase());
    Ok(lista)
}

#[tauri::command]
fn guardar_trabajo(app: tauri::AppHandle, nombre: String, contenido: String) -> Result<(), String> {
    fs::write(ruta_trabajo(&app, &nombre)?, contenido).map_err(|e| e.to_string())
}

#[tauri::command]
fn leer_trabajo(app: tauri::AppHandle, nombre: String) -> Result<String, String> {
    fs::read_to_string(ruta_trabajo(&app, &nombre)?).map_err(|e| e.to_string())
}

#[tauri::command]
fn borrar_trabajo(app: tauri::AppHandle, nombre: String) -> Result<(), String> {
    fs::remove_file(ruta_trabajo(&app, &nombre)?).map_err(|e| e.to_string())
}

/// Ejecuta el guion de escáner y devuelve lo que escribe por la salida.
fn powershell(argumentos: Vec<String>) -> Result<String, String> {
    let guion = std::env::temp_dir().join("escaneator_escaner.ps1");
    // Con BOM para que Windows PowerShell lea bien los acentos.
    let mut bytes = vec![0xEF, 0xBB, 0xBF];
    bytes.extend_from_slice(GUION_ESCANER.as_bytes());
    fs::write(&guion, bytes).map_err(|e| e.to_string())?;

    let mut orden = Command::new("powershell.exe");
    orden
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File"])
        .arg(&guion)
        .args(&argumentos);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        orden.creation_flags(0x0800_0000); // CREATE_NO_WINDOW: sin ventana negra
    }
    let salida = orden.output().map_err(|e| format!("no se pudo iniciar PowerShell: {e}"))?;
    let texto = String::from_utf8_lossy(&salida.stdout).trim().to_string();
    if !salida.status.success() {
        let error = String::from_utf8_lossy(&salida.stderr).trim().to_string();
        return Err(if !texto.is_empty() { texto } else if !error.is_empty() { error } else { "error desconocido del escáner".into() });
    }
    Ok(texto)
}

/// Devuelve un JSON con los escáneres conectados: [{ "id": "...", "nombre": "..." }]
#[tauri::command]
async fn listar_escaneres() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| powershell(vec!["-Accion".into(), "listar".into()]))
        .await
        .map_err(|e| e.to_string())?
}

/// Escanea una hoja y la devuelve como JPEG en base64.
#[tauri::command]
async fn escanear(id: String, ppp: u32, color: bool) -> Result<String, String> {
    let ppp = ppp.clamp(75, 600);
    tauri::async_runtime::spawn_blocking(move || {
        powershell(vec![
            "-Accion".into(),
            "escanear".into(),
            "-Id".into(),
            id,
            "-Ppp".into(),
            ppp.to_string(),
            "-Color".into(),
            if color { "1".into() } else { "0".into() },
        ])
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            listar_trabajos,
            guardar_trabajo,
            leer_trabajo,
            borrar_trabajo,
            listar_escaneres,
            escanear
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar Escaneator");
}
