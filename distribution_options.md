# Commercial Distribution & IP Protection Options

This document outlines the architectural options for distributing the **Lead Management CRM Platform** to clients. It addresses three conflicting requirements:
1. **Intellectual Property (IP) Protection:** Not exposing the source code or letting clients pirate/bypass trials.
2. **Client Data Security:** Storing student data strictly on client-owned Firebase databases.
3. **Accessibility:** Allowing counselors to access the platform easily across multiple devices.

---

## Architecture Matrix Comparison

| Feature | Option 1: SaaS Hub Model (Web Link) | Option 2: Tauri Desktop App (`.exe`) |
| :--- | :--- | :--- |
| **User Access Platform** | Web browser (`https://crm.yourcompany.com`) | Native Windows desktop application |
| **IP Protection** | **Maximum** (Code remains compiled on your central servers; clients only download UI layers). | **High** (Compiled into binary `.exe`; harder to reverse-engineer). |
| **Client Database Isolation** | **100% Isolated** (Browser connects directly to client Firebase via client configurations). | **100% Isolated** (Desktop client connects directly to client Firebase). |
| **Device Compatibility** | **Any Device** (Laptops, mobile browsers, tablets). | **Windows Only** (Must be installed on local laptops). |
| **15-Day Trial Enforcer** | **Server-Controlled** (Cannot be bypassed or modified by the client). | **Client-Controlled** (Verifies locally with cryptographic keys & clock checks). |
| **Update Delivery** | Instant (Deploy to your central hosting). | Manual (Clients must download and reinstall updates). |

---

## Option 1: The "SaaS Hub" Model (Dynamic Firebase Injection)

In this model, you host a single instance of the compiled React code on your own domain. When a client visits, the frontend dynamically loads **their** database credentials.

```
[ Client browser opens crm.yourcompany.com ] ──(Downloads compiled UI only - NO code files)──► [ User Laptop ]
                         │
                         ▼
        [ Checks dynamic Firebase Config ]
                         │
             ┌───────────┴───────────┐
     (Stored in user profile)    (First-time login)
             │                       │
             ▼                       ▼
   [ App connects directly ]  [ Client enters their own ]
   to client's Firestore      [ Firebase credentials    ]
             │
             ├──────────────────────────┐
    (Trial Verification)       (Data Operations)
             │                          │
             ▼                          ▼
  Pings your licensing server:    Reads/writes leads directly
  "Is Org X in 15-day trial?"     to client's Firebase (Secure)
```

### How it protects your code
* The client never receives the React repository or build files.
* The static files (HTML, CSS, compiled JS) are stored on **your** hosting server. The browser runs them in memory but never exposes the underlying project structure.

### How it secures client data
1. During initial setup, the client enters their own Firebase credentials (`apiKey`, `projectId`, etc.).
2. These credentials are saved in the client's local browser storage.
3. When the CRM loads, **[firebase.js](file:///c:/Users/mohda/OneDrive/Desktop/tz-lead-management/src/firebase.js)** reads these credentials and runs `initializeApp(clientConfig)` on the client's side.
4. All Firestore queries bypass your servers entirely and send requests straight to the client's database.

### How the 15-day trial is verified
* The application runs a small licensing query to your central database on startup.
* Your server verifies if the organization’s subscription/trial has expired. If it has, your server instructs the frontend to render a lock screen.

---

## Option 2: The Tauri Desktop App (`.exe`)

In this model, the web application is packaged inside a Rust wrapper and compiled into a native Windows executable (`.exe`).

### How it protects your code
* The React frontend is compiled and embedded into a Rust binary.
* An NSIS installer wraps the executable. It checks the installer directory for a valid `license.dat` signature. If missing, it aborts the installation.

### How it secures client data
* Similar to the SaaS Hub, the compiled desktop application settings panel allows clients to paste their Firebase configuration credentials.
* The credentials are saved locally in the operating system's secure keychain.

### How the 15-day trial is verified
* Verifies the cryptographic signature of the local `license.dat` offline using the browser Web Crypto API and a hardcoded public key in the binary.
* Obfuscates execution timestamps in `localStorage` as Base64 to detect system clock rollbacks.

---

## Implementation Decisions

### If choosing Option 1 (SaaS Hub):
1. **[App.jsx](file:///c:/Users/mohda/OneDrive/Desktop/tz-lead-management/src/App.jsx)** and **[CRMContext.jsx](file:///c:/Users/mohda/OneDrive/Desktop/tz-lead-management/src/context/CRMContext.jsx)** must be modified to allow dynamic client Firebase configuration initialization rather than pulling from hardcoded `.env` files.
2. A separate admin licensing portal must be created to manage client trial periods and generate encryption payloads.

### If choosing Option 2 (Tauri Executable):
1. Install Tauri dependencies (`@tauri-apps/cli`) and run configuration initializers.
2. Implement **[licenseChecker.js](file:///c:/Users/mohda/OneDrive/Desktop/tz-lead-management/src/utils/licenseChecker.js)** to verify signatures locally on startup.
3. Write NSIS custom installer scripts (`hooks.nsh`) to enforce pre-install validation.
