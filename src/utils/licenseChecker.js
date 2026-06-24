import { PEM_PUBLIC_KEY } from './licenseKeys';

// Helper: Convert PEM/Base64 string to ArrayBuffer binary
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "");
  return base64ToArrayBuffer(base64);
}

/**
 * Validates a signed license.dat payload using the Web Crypto API
 * @param {Object} licensePayload The license JSON parsed from the file
 * @param {string} currentProjectId The active Firebase Project ID
 * @returns {Promise<{success: boolean, reason?: string, license?: Object, details?: string}>}
 */
export async function verifySoftwareLicense(licensePayload, currentProjectId) {
  try {
    if (!licensePayload || !licensePayload.signature) {
      return { success: false, reason: "missing" };
    }

    // 1. Separate signature from payload data
    const { signature, ...licenseData } = licensePayload;

    // 2. Assert Firebase Project ID matches (prevents database swapping)
    if (licenseData.firebaseProjectId !== currentProjectId) {
      return { success: false, reason: "id_mismatch" };
    }

    // 3. Convert both data and signature to binary arrays
    const dataString = JSON.stringify(licenseData);
    const dataBytes = new TextEncoder().encode(dataString);
    const signatureBytes = base64ToArrayBuffer(signature);

    // 4. Import public key into the Web Crypto system
    const publicKeyDer = pemToArrayBuffer(PEM_PUBLIC_KEY);
    const cryptoKey = await window.crypto.subtle.importKey(
      "spki",
      publicKeyDer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["verify"]
    );

    // 5. Perform cryptographic verification
    const isValidSignature = await window.crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      signatureBytes,
      dataBytes
    );

    if (!isValidSignature) {
      return { success: false, reason: "tampered" };
    }

    // 6. Expiry check
    if (licenseData.type === 'trial') {
      const expiryDate = new Date(licenseData.expires);
      expiryDate.setHours(23, 59, 59, 999);
      const currentDate = new Date();

      if (currentDate > expiryDate) {
        return { success: false, reason: "expired", license: licenseData };
      }
    }

    return { success: true, license: licenseData };
  } catch (err) {
    return { success: false, reason: "tampered", details: err.message };
  }
}

/**
 * Checks system clock integrity against local cache, leads list timestamps, and public time API
 * @param {Array} leadsList Current CRM leads database records in memory
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
export async function checkClockIntegrity(leadsList = []) {
  const currentDate = new Date();
  
  // 1. Local storage history cache check
  const lastRunObfuscated = localStorage.getItem('crm_license_last_run_time');
  if (lastRunObfuscated) {
    try {
      const decodedLastRun = new Date(window.atob(lastRunObfuscated));
      // Tolerates 2 minutes clock skew
      if (currentDate < new Date(decodedLastRun.getTime() - 120000)) {
        console.error("Local storage rollback check triggered.");
        return { success: false, reason: "rollback" };
      }
    } catch (e) {
      return { success: false, reason: "rollback" };
    }
  }

  // 2. Firestore leads record timestamp check (strong protection)
  if (leadsList && leadsList.length > 0) {
    let latestDbTime = null;
    leadsList.forEach(lead => {
      const dates = [
        lead.createdDate ? new Date(lead.createdDate) : null,
        lead.lastContacted ? new Date(lead.lastContacted) : null,
        ...(lead.timeline || []).map(log => log.timestamp ? new Date(log.timestamp) : null),
        ...(lead.whatsappMessages || []).map(msg => msg.timestamp ? new Date(msg.timestamp) : null)
      ].filter(d => d !== null && !isNaN(d.getTime()));

      dates.forEach(d => {
        if (!latestDbTime || d > latestDbTime) {
          latestDbTime = d;
        }
      });
    });

    if (latestDbTime && currentDate < new Date(latestDbTime.getTime() - 120000)) {
      console.error("Firestore data records timestamp check triggered. Latest database record is:", latestDbTime);
      return { success: false, reason: "rollback" };
    }
  }

  // 3. Web time synchronization check (runs with a quick 2.5s timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    // Fetching from a reliable public time API
    const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=UTC', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.dateTime) {
        const webTime = new Date(data.dateTime);
        // Only flag rollback if local clock is in the past compared to actual internet time by more than 2 hours
        if (currentDate.getTime() < webTime.getTime() - 2 * 60 * 60 * 1000) {
          console.error("Web clock rollback detected. Web time:", webTime, "Local time:", currentDate);
          return { success: false, reason: "rollback" };
        }
      }
    }
  } catch (err) {
    // If request times out or client is completely offline, fail silently and rely on local/db checks.
    console.log("Web time API unreachable. Offline fallback active.");
  }

  // Update stored timestamp to current date for the next startup check
  localStorage.setItem('crm_license_last_run_time', window.btoa(currentDate.toISOString()));
  return { success: true };
}
