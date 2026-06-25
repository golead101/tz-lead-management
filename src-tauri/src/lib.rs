use rsa::{RsaPublicKey, pkcs1v15::VerifyingKey};
use rsa::signature::{Verifier};
use sha2::Sha256;
use base64::prelude::*;

const PUBLIC_KEY_PEM: &str = "-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtJEe5+ibpBugaAf5M8EP
pdqZ1ISLJmyM+zrOKEddWdkJf1BMfhmp0zJT2ZgDAgn9Gh2Um7QWaEZqFoh3svn5
XWR/T3KQgETprIxToNRkJHvBoJMW21LxPEkyZz4nZb/m8qPVti61OZxvz1hYsWWx
7mbXoMH5uZB3QrBsQhsZiUVJU62P6SgETwIRHLjx9lm5fce111bn91wFsW5X5ONz
pRnIbMIRSvumnOB0X1XMo6b/G51Yjr45jdYVP3AShTricGf4a2t6tKlPEAB/ar7X
WM7Dd/XTEoYThK4edGtAOFR6CngaIVp32c/E/RMH8H7tDgRQDG9suyK03stzH6iy
9wIDAQAB
-----END PUBLIC KEY-----";

#[derive(serde::Serialize, serde::Deserialize)]
struct SignedLicenseData {
  customer: String,
  email: String,
  #[serde(rename = "type")]
  license_type: String,
  expires: String,
  #[serde(rename = "firebaseProjectId")]
  firebase_project_id: String,
  #[serde(rename = "machineId", skip_serializing_if = "Option::is_none")]
  machine_id: Option<String>,
}

#[derive(serde::Deserialize)]
struct FullLicensePayload {
  customer: String,
  email: String,
  #[serde(rename = "type")]
  license_type: String,
  expires: String,
  #[serde(rename = "firebaseProjectId")]
  firebase_project_id: String,
  #[serde(rename = "machineId")]
  machine_id: Option<String>,
  signature: String,
}

#[derive(serde::Serialize)]
struct LicenseVerificationResult {
  success: bool,
  reason: String,
  customer: String,
  email: String,
  #[serde(rename = "type")]
  license_type: String,
  expires: String,
}

fn is_leap_year(year: i32) -> bool {
  year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
}

fn utc_date_to_epoch(year: i32, month: i32, day: i32) -> u64 {
  let mut days = 0i64;
  for y in 1970..year {
    days += if is_leap_year(y) { 366 } else { 365 };
  }
  let month_days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  for m in 1..(month as usize) {
    if m == 2 && is_leap_year(year) {
      days += 29;
    } else {
      days += month_days[m - 1];
    }
  }
  days += (day as i64) - 1;
  (days * 86400 + 23 * 3600 + 59 * 60 + 59) as u64
}

const XOR_KEY: &[u8] = b"tz_lead_crm_security_key_32bytes";

fn encrypt_decrypt_state(data: &[u8]) -> Vec<u8> {
  let mut result = Vec::with_capacity(data.len());
  for (i, &byte) in data.iter().enumerate() {
    result.push(byte ^ XOR_KEY[i % XOR_KEY.len()]);
  }
  result
}

fn check_and_update_state_time(app_handle: &tauri::AppHandle, current_time: u64) -> Result<(), String> {
  use tauri::Manager;
  let mut path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
  std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
  path.push("state.bin");

  if path.exists() {
    if let Ok(encrypted_bytes) = std::fs::read(&path) {
      let decrypted_bytes = encrypt_decrypt_state(&encrypted_bytes);
      if let Ok(decrypted_str) = String::from_utf8(decrypted_bytes) {
        if let Ok(last_time) = decrypted_str.parse::<u64>() {
          if current_time + 120 < last_time {
            return Err("rollback".to_string());
          }
        }
      }
    }
  }

  let mut time_to_write = current_time;
  if path.exists() {
    if let Ok(encrypted_bytes) = std::fs::read(&path) {
      let decrypted_bytes = encrypt_decrypt_state(&encrypted_bytes);
      if let Ok(decrypted_str) = String::from_utf8(decrypted_bytes) {
        if let Ok(last_time) = decrypted_str.parse::<u64>() {
          if last_time > time_to_write {
            time_to_write = last_time;
          }
        }
      }
    }
  }

  let time_str = time_to_write.to_string();
  let encrypted_bytes = encrypt_decrypt_state(time_str.as_bytes());
  std::fs::write(path, encrypted_bytes).map_err(|e| e.to_string())?;
  Ok(())
}

fn get_local_machine_id() -> Option<String> {
  #[cfg(target_os = "windows")]
  {
    use std::process::Command;
    let output = Command::new("reg")
      .args(&["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"])
      .output()
      .ok()?;
    if output.status.success() {
      let text = String::from_utf8_lossy(&output.stdout);
      for line in text.lines() {
        if line.contains("MachineGuid") {
          let parts: Vec<&str> = line.split_whitespace().collect();
          if parts.len() >= 3 {
            return Some(parts[2].to_string());
          }
        }
      }
    }
  }
  None
}

#[tauri::command]
fn get_machine_id() -> Result<String, String> {
  get_local_machine_id().ok_or_else(|| "Could not retrieve Machine ID".to_string())
}

fn read_license_from_disk(app_handle: &tauri::AppHandle) -> Result<String, String> {
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

#[tauri::command]
fn read_license_file(app_handle: tauri::AppHandle) -> Result<String, String> {
  read_license_from_disk(&app_handle)
}

#[tauri::command]
fn write_license_file(app_handle: tauri::AppHandle, contents: String) -> Result<(), String> {
  use tauri::Manager;
  let mut path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
  std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
  path.push("license.dat");
  std::fs::write(path, contents).map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
fn verify_license(app_handle: tauri::AppHandle, current_project_id: String) -> Result<LicenseVerificationResult, String> {
  // 1. Read license string
  let license_str = match read_license_from_disk(&app_handle) {
    Ok(s) => s,
    Err(_) => return Ok(LicenseVerificationResult {
      success: false,
      reason: "missing".to_string(),
      customer: "".to_string(),
      email: "".to_string(),
      license_type: "".to_string(),
      expires: "".to_string(),
    }),
  };

  // 2. Parse payload
  let payload: FullLicensePayload = match serde_json::from_str(&license_str) {
    Ok(p) => p,
    Err(_) => return Ok(LicenseVerificationResult {
      success: false,
      reason: "tampered".to_string(),
      customer: "".to_string(),
      email: "".to_string(),
      license_type: "".to_string(),
      expires: "".to_string(),
    }),
  };

  // 3. Project ID assertion
  if payload.firebase_project_id != current_project_id {
    return Ok(LicenseVerificationResult {
      success: false,
      reason: "id_mismatch".to_string(),
      customer: "".to_string(),
      email: "".to_string(),
      license_type: "".to_string(),
      expires: "".to_string(),
    });
  }

  // 4. Reconstruct signed data
  let signed_data = SignedLicenseData {
    customer: payload.customer.clone(),
    email: payload.email.clone(),
    license_type: payload.license_type.clone(),
    expires: payload.expires.clone(),
    firebase_project_id: payload.firebase_project_id.clone(),
    machine_id: payload.machine_id.clone(),
  };

  let data_string = match serde_json::to_string(&signed_data) {
    Ok(s) => s,
    Err(_) => return Ok(LicenseVerificationResult {
      success: false,
      reason: "tampered".to_string(),
      customer: "".to_string(),
      email: "".to_string(),
      license_type: "".to_string(),
      expires: "".to_string(),
    }),
  };

  // 5. Decode signature
  let signature_bytes = match BASE64_STANDARD.decode(&payload.signature) {
    Ok(b) => b,
    Err(_) => return Ok(LicenseVerificationResult {
      success: false,
      reason: "tampered".to_string(),
      customer: "".to_string(),
      email: "".to_string(),
      license_type: "".to_string(),
      expires: "".to_string(),
    }),
  };

  // 6. Cryptographic signature check
  use rsa::pkcs8::DecodePublicKey;
  let public_key = match RsaPublicKey::from_public_key_pem(PUBLIC_KEY_PEM) {
    Ok(pk) => pk,
    Err(e) => return Err(format!("Embedded public key is invalid: {}", e)),
  };

  let verifying_key = VerifyingKey::<Sha256>::new(public_key);
  let rsa_signature = match rsa::pkcs1v15::Signature::try_from(signature_bytes.as_slice()) {
    Ok(sig) => sig,
    Err(_) => return Ok(LicenseVerificationResult {
      success: false,
      reason: "tampered".to_string(),
      customer: "".to_string(),
      email: "".to_string(),
      license_type: "".to_string(),
      expires: "".to_string(),
    }),
  };

  if verifying_key.verify(data_string.as_bytes(), &rsa_signature).is_err() {
    return Ok(LicenseVerificationResult {
      success: false,
      reason: "tampered".to_string(),
      customer: "".to_string(),
      email: "".to_string(),
      license_type: "".to_string(),
      expires: "".to_string(),
    });
  }

  // 6.5. Machine ID / Hardware Lock Check
  if let Some(ref licensed_machine_id) = payload.machine_id {
    if !licensed_machine_id.trim().is_empty() {
      let current_machine_id = get_local_machine_id().unwrap_or_default();
      if current_machine_id.to_lowercase() != licensed_machine_id.to_lowercase() {
        return Ok(LicenseVerificationResult {
          success: false,
          reason: "hardware_mismatch".to_string(),
          customer: payload.customer,
          email: payload.email,
          license_type: payload.license_type,
          expires: payload.expires,
        });
      }
    }
  }

  // 6.7. Encrypted Clock Rollback Check
  {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    if let Err(e) = check_and_update_state_time(&app_handle, now) {
      if e == "rollback" {
        return Ok(LicenseVerificationResult {
          success: false,
          reason: "rollback".to_string(),
          customer: payload.customer,
          email: payload.email,
          license_type: payload.license_type,
          expires: payload.expires,
        });
      }
    }
  }

  // 7. Expiry Check
  if payload.license_type == "trial" {
    let parts: Vec<&str> = payload.expires.split('-').collect();
    if parts.len() == 3 {
      if let (Ok(year), Ok(month), Ok(day)) = (parts[0].parse::<i32>(), parts[1].parse::<i32>(), parts[2].parse::<i32>()) {
        use std::time::{SystemTime, UNIX_EPOCH};
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        let expiry_epoch = utc_date_to_epoch(year, month, day);
        if now > expiry_epoch {
          return Ok(LicenseVerificationResult {
            success: false,
            reason: "expired".to_string(),
            customer: payload.customer,
            email: payload.email,
            license_type: payload.license_type,
            expires: payload.expires,
          });
        }
      }
    }
  }

  Ok(LicenseVerificationResult {
    success: true,
    reason: "valid".to_string(),
    customer: payload.customer,
    email: payload.email,
    license_type: payload.license_type,
    expires: payload.expires,
  })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![read_license_file, write_license_file, verify_license, get_machine_id])
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
