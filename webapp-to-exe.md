# Technical Feature Reference Guide

This document provides detailed explanations, architectural flows, and code snippets of the advanced features implemented in this application. Use this guide to adapt and implement similar patterns in your other projects.

---

## 🚀 Summary of Key Technical Patterns
1. **Desktop App Packaging (`Tauri + NSIS`)**: Wrapping a standard React single-page application into a secure desktop application with a Windows `.exe` setup builder.
2. **Asymmetric Cryptographic Licensing**: Generating signed `license.dat` configuration payloads using a secure backend private key and verifying them offline in the app using the browser's built-in Web Crypto API and a public key.
3. **Clock-Rollback Protection**: Storing base64-obfuscated historical execution times in browser local storage to detect and block users who attempt to rewind system dates to extend trial durations.
4. **Dynamic HSL-Based Theming Customizer**: Controlling branding dynamically across the entire app by exposing a color hue angle slider (0-360) and modifying CSS custom properties in real-time.
5. **WhatsApp Simulator with Slash Command Autocomplete**: Parsing text area changes, rendering a floating template selection menu, and interpolating dynamic template values.

---

## 1. Tauri + NSIS Installer Binding (Setup `.exe`)

### Architecture
Tauri compiles a lightweight Rust-based wrapper around system-native WebViews (Webview2 on Windows). When executing a release build:
1. Vite compiles the React app static files to `/dist`.
2. Tauri embeds these static files directly into the compiled executable.
3. The build output is wrapped inside a Windows setup installer `.exe` using NSIS.

### License Check in the Installer
During installation, a custom NSIS hook script (`src-tauri/hooks.nsh`) checks the directory where the installer is running for the presence of the customer-specific `license.dat`. If missing, the installation is terminated immediately.

#### NSIS Hook Code (`src-tauri/hooks.nsh`):
```nsis
!macro NSIS_HOOK_PREINSTALL
  ; Check if license.dat exists in the directory containing the installer ($EXEDIR)
  IfFileExists "$EXEDIR\license.dat" license_found no_license
  
  no_license:
    ; Terminate setup and show error popup
    MessageBox MB_OK|MB_ICONSTOP "Error: license.dat not found in the same folder as the installer. Please place your license.dat file in the same folder as this setup installer and try again."
    Abort
    
  license_found:
    ; Create app config directory inside user's system APPDATA directory
    CreateDirectory "$APPDATA\com.tz.leadmanagement"
    ; Copy license.dat from installer folder into the application's config directory
    CopyFiles "$EXEDIR\license.dat" "$APPDATA\com.tz.leadmanagement\license.dat"
!macroend
```

---

## 2. Cryptographic Offline License Verification

The application is licensed using asymmetric (public-private) cryptography. The developer signs the license files, and the client application validates them offline using a hardcoded public key.

```
[ Developer Backend (build_packaged.cjs) ]
  ├── Client Info JSON + Expiry
  ├── Sign with PRIVATE_KEY.pem (SHA-256 RSA)
  └── Output: license.dat (Data + Base64 Signature)
              │
              ▼ (Sent to Client)
[ Client App Frontend (licenseChecker.js) ]
  ├── Read license.dat
  ├── Extract Signature & Canonical JSON
  ├── Verify with hardcoded PUBLIC_KEY (Web Crypto API)
  └── Block/Allow App Access
```

### Backend: Generating and Signing License (`build_packaged.cjs`)
This script executes during the build process, taking customer information and outputting a signed `license.dat` file:

```javascript
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function generateLicense(customer, email, type, expires = null) {
  // 1. Prepare license payload (excluding the signature)
  const licenseData = { customer, email, type };
  if (expires) {
    licenseData.expires = expires; // format: "YYYY-MM-DD"
  }

  // 2. Canonicalize the JSON object
  const canonicalData = JSON.stringify(licenseData);

  // 3. Load private key
  const privateKeyPem = fs.readFileSync(path.join(__dirname, 'private_key.pem'), 'utf8');

  // 4. Generate SHA256 RSA signature
  const sign = crypto.createSign('SHA256');
  sign.update(canonicalData);
  const signature = sign.sign(privateKeyPem, 'base64');

  // 5. Append signature and write license.dat
  licenseData.signature = signature;
  fs.writeFileSync('license.dat', JSON.stringify(licenseData, null, 2));
  console.log("✔ license.dat file generated successfully.");
}
```

### Frontend: Client Verification (`src/utils/licenseChecker.js`)
At runtime, the application parses the license. It utilizes the browser's native **Web Crypto API** to verify that the signature matches the data and is signed by the matching public key:

```javascript
// Hardcoded PEM Public Key (corresponds to private_key.pem)
const PEM_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq7iLrk47FaC92FgOOlL1
1C0KiWjNDMvO3YoapCXa1QwSQp0RqnhdoFTiiHD1gge0CjhodUTaFBCP1HMwo7UR
1VZT4Nly129b47gByjaYyEDPEEL8MKO2dYcp6pKgvKBEm+JBln2onsf0Fp5jVqlF
UhR9+tEhBeuGlKOKbhaxXtsmcrVPDL1XDGl1uvoqZ4El7csCcRcH+Y2gqRoRwOWg
5cqq9VUsPrpNbY8Sp09mxoScvKUTN1dVMjTj4ku3yV/qTviH0nMmnmSNVtSjLiid
sZC7kHgN0eG7rJTeM0WSR+gGemS5MKe+xgoUJ07mJqnvaeVRYm/KY5LXx6sjLORU
6QIDAQAB
-----END PUBLIC KEY-----`;

// Helper: Convert PEM string to ArrayBuffer binary
function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "");
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function verifySoftwareLicense(licensePayload) {
  try {
    if (!licensePayload || !licensePayload.signature) {
      return { success: false, reason: "not_found" };
    }

    // 1. Separate signature from payload
    const { signature, ...licenseData } = licensePayload;

    // 2. Canonicalize the data and convert both string and signature to binary arrays
    const dataString = JSON.stringify(licenseData);
    const dataBytes = new TextEncoder().encode(dataString);
    const signatureBytes = pemToArrayBuffer(signature);

    // 3. Import public key into the Web Crypto system
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

    // 4. Perform cryptographic verification
    const isValidSignature = await window.crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      signatureBytes,
      dataBytes
    );

    if (!isValidSignature) {
      return { success: false, reason: "tampered" };
    }

    // 5. Expiry Check
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
    return { success: false, reason: "validation_error", details: err.message };
  }
}
```

---

## 3. Clock-Rollback Protection

To prevent users from rolling back their desktop operating system clock (e.g., from 2026 to 2020) to bypass an expired trial license, we implement a persistent check.

### Implementation Pattern:
1. Every time the license check succeeds at application startup, we store the current system date in browser `localStorage`.
2. To prevent the user from simply editing this date string in their browser or local storage files, we encode it using Base64.
3. On future boots, we compare the current operating system time with the saved value. If the current time is **older** than the saved value, clock tampering is flagged, and the app is locked.

#### Implementation Snippet:
```javascript
function checkClockIntegrity() {
  const currentDate = new Date();
  const lastRunObfuscated = localStorage.getItem('crm_license_last_run_time');

  if (lastRunObfuscated) {
    try {
      // Decode stored timestamp from base64
      const decodedLastRun = new Date(window.atob(lastRunObfuscated));
      
      // If the current date is in the past compared to last recorded execution
      if (currentDate < decodedLastRun) {
        console.error("Local system clock tampering detected!");
        return { success: false, reason: "clock_rollback" };
      }
    } catch (e) {
      // Failed decoding indicates user tampered with local storage string
      return { success: false, reason: "clock_rollback" };
    }
  }

  // Update stored timestamp to current date for the next startup check
  localStorage.setItem('crm_license_last_run_time', window.btoa(currentDate.toISOString()));
  return { success: true };
}
```

---

## 4. Dynamic HSL-Based Theming Customizer

This pattern allows shifting the primary color theme of the user interface by sliding a single value, rather than editing style sheets or generating separate builds.

### Step 1: Base CSS Configuration (`src/index.css`)
Define colors globally in CSS using custom properties built around HSL (Hue, Saturation, Lightness). Isolate the hue value:

```css
:root {
  /* Default primary hue angle (210 = blue) */
  --primary-hue: 210;

  /* Derive all variations dynamically using the isolated hue variable */
  --primary: hsl(var(--primary-hue), 85%, 50%);
  --primary-hover: hsl(var(--primary-hue), 85%, 40%);
  --primary-light: hsl(var(--primary-hue), 85%, 96%);
  --primary-glow: hsl(var(--primary-hue), 85%, 50%, 0.15);
}

/* Example element implementation */
.btn-primary {
  background-color: var(--primary);
  border: 1px solid var(--primary-hover);
}
.btn-primary:hover {
  background-color: var(--primary-hover);
}
```

### Step 2: React Range Slider Control (`src/modules/ConfigSettings.jsx`)
Expose a slider component (0° to 360°) and write the value dynamically to the document root element:

```javascript
import React, { useState } from 'react';

export function ConfigSettings() {
  const [hue, setHue] = useState(210);

  const applyNewHue = (newHue) => {
    setHue(newHue);
    // Directly modify the CSS variable on the document root
    document.documentElement.style.setProperty('--primary-hue', newHue);
  };

  return (
    <div className="settings-panel">
      <h3>Select Primary Hue</h3>
      <div className="slider-container">
        <input
          type="range"
          min="0"
          max="360"
          value={hue}
          onChange={(e) => applyNewHue(e.target.value)}
        />
        <span>{hue}°</span>
      </div>
    </div>
  );
}
```

---

## 5. WhatsApp Simulator Slash Commands Popover

The simulator checks inputs for keyboard shortcuts (e.g. `/`) to autocomplete predefined message templates, injecting contextual student and counselor variables automatically.

### Implementation Logic:
1. Handle textarea `onChange` state.
2. Search text using key pattern check (e.g. text ending in `/` or containing slash commands).
3. If active, render popover with candidate autocomplete strings.
4. Replace the `/` trigger string with the interpolated content of the template.

#### React Component (`src/modules/WhatsAppConsole.jsx`):
```javascript
import React, { useState } from 'react';

const PRESETS = [
  { command: '/welcome', text: "Hello {{student_name}}, thank you for contacting us! My name is {{counselor}}." },
  { command: '/schedule', text: "Hey {{student_name}}, is it fine if we schedule a brief introduction call tomorrow at 11 AM?" }
];

export function WhatsAppConsole({ studentName, counselorName }) {
  const [message, setMessage] = useState("");
  const [showPresets, setShowPresets] = useState(false);

  const handleTextChange = (e) => {
    const val = e.target.value;
    setMessage(val);

    // Show template selection menu if textarea ends with '/'
    if (val.endsWith('/')) {
      setShowPresets(true);
    } else if (!val.includes('/')) {
      setShowPresets(false);
    }
  };

  const applyPreset = (templateText) => {
    // 1. Interpolate contextual values into the placeholders
    const interpolated = templateText
      .replace("{{student_name}}", studentName)
      .replace("{{counselor}}", counselorName);

    // 2. Identify slash index and replace command prefix
    const lastSlash = message.lastIndexOf('/');
    const prefix = message.substring(0, lastSlash);

    // 3. Update message and hide popover
    setMessage(prefix + interpolated);
    setShowPresets(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        value={message}
        onChange={handleTextChange}
        placeholder="Type a message or / to see presets..."
      />

      {showPresets && (
        <ul className="presets-dropdown" style={{ position: 'absolute', bottom: '100%', left: 0 }}>
          {PRESETS.map((p) => (
            <li key={p.command} onClick={() => applyPreset(p.text)}>
              <strong>{p.command}</strong> - {p.text.substring(0, 40)}...
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```
