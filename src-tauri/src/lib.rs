#[tauri::command]
fn read_license_file(app_handle: tauri::AppHandle) -> Result<String, String> {
  use tauri::Manager;
  let mut path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
  path.push("license.dat");
  if path.exists() {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
  } else {
    // Fallback search in standard %APPDATA%/com.tz.leadmanagement/ folder
    if let Ok(appdata) = std::env::var("APPDATA") {
      let alt_path = std::path::Path::new(&appdata)
        .join("com.tz.leadmanagement")
        .join("license.dat");
      if alt_path.exists() {
        return std::fs::read_to_string(alt_path).map_err(|e| e.to_string());
      }
    }
    Err("License file not found".to_string())
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![read_license_file])
    .setup(|app| {
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
