# Cloud Functions → Local EXE Migration

## Why We Moved Most Cloud Functions to Local

This project originally had **13 Firebase Cloud Functions** handling all outbound API calls (WhatsApp messaging, Google Ads syncing, credentials validation, template management, and user account creation). We migrated **10 of those functions** to run locally inside the Tauri desktop EXE. Only **3 inbound webhook listeners** remain deployed on Firebase.

---

## The Problem with Cloud Functions for Every Client

| Problem | Explanation |
|---|---|
| **Per-client deployment** | Every new client needed their own Firebase project. That meant running `firebase deploy --only functions` for each one — requiring Firebase CLI installed, Node.js configured, and manual terminal commands. |
| **Not scalable for distribution** | Our goal is a universal `.exe` build where you change the `.env` file and hand it to the client. Cloud Functions broke that model because you can't deploy backend code by editing an environment file. |
| **Cost per invocation** | Firebase Cloud Functions bill per invocation and per GB-second of compute. Every WhatsApp message, every Google Ads sync, every template fetch was a paid function call. With dozens of clients sending hundreds of messages daily, costs add up fast. |
| **Cold start latency** | Cloud Functions go idle after a few minutes. The first call after idle takes 2-8 seconds to cold-start the Node.js runtime. Users would see slow responses when sending a WhatsApp message after a period of inactivity. |
| **Unnecessary network hop** | The EXE already has Firestore access and the user's credentials in memory. Routing an API call through a cloud function that just decrypts a token and forwards the request to Meta/Google is an extra round-trip for no reason. |

---

## What Moved to Local (10 Functions)

These functions are **outbound operations** — the EXE initiates them when the user clicks a button or an automation triggers. They don't need a public URL. They just need an internet connection and the decrypted API credentials.

| # | Function Name | What It Did on Cloud | How It Works Locally Now |
|---|---|---|---|
| 1 | `sendWhatsAppMessage` | Decrypted WhatsApp token → POST to Meta Graph API → logged message in Firestore | EXE decrypts token via Web Crypto API → POST directly to `graph.facebook.com` → writes chat log to Firestore |
| 2 | `googleAdsValidate` | Decrypted Google credentials → exchanged OAuth token → test query to Google Ads API | EXE decrypts credentials → exchanges OAuth token at `oauth2.googleapis.com` → test query to `googleads.googleapis.com` |
| 3 | `metaValidate` | Decrypted Meta token → test call to Graph API `/me` endpoint | EXE decrypts token → calls `graph.facebook.com/v20.0/me` directly |
| 4 | `googleAdsSync` | Decrypted credentials → queried Google Ads lead submissions → wrote new leads to Firestore | EXE does the full OAuth + query + deduplication + Firestore write cycle locally |
| 5 | `getWhatsAppTemplates` | Decrypted token → fetched templates from Meta Business Account → returned list | EXE decrypts token → GET `message_templates` from Meta → caches in Firestore |
| 6 | `createWhatsAppTemplate` | Decrypted token → POST new template to Meta → returned status | EXE decrypts token → POST template to Meta Graph API → saves to Firestore |
| 7 | `deleteWhatsAppTemplate` | Decrypted token → DELETE template from Meta → returned result | EXE decrypts token → DELETE call to Meta → removes from Firestore |
| 8 | `createUserAccount` | Used Firebase Admin SDK to create Auth user → wrote user doc to Firestore | EXE creates a temporary secondary Firebase App instance → `createUserWithEmailAndPassword` → writes user doc → deletes temp app (admin session stays logged in) |
| 9 | `sendWhatsAppMessage` (auto trigger 1) | Called by stage change automation (Demo Scheduled / Converted) | Now calls `localSendWhatsAppMessage` directly inside the EXE |
| 10 | `sendWhatsAppMessage` (auto trigger 2) | Called by call logging automation when stage shifts | Same local function call |

### How Local Decryption Works

The backend Cloud Functions encrypted sensitive credentials (API tokens, secrets) using **AES-256-CBC** with a SHA-256 hashed key. The encrypted format is `iv_hex:ciphertext_hex`.

The EXE now decrypts these credentials locally using the browser-native **Web Crypto API** — same algorithm, same key derivation, zero npm dependencies:

```
Backend (functions/crypto.js)          →  Frontend (CRMContext.jsx)
crypto.createHash('sha256')            →  crypto.subtle.digest('SHA-256', ...)
crypto.createDecipheriv('aes-256-cbc') →  crypto.subtle.decrypt({ name: 'AES-CBC' }, ...)
```

Both sides use the same encryption key from the environment (`ENCRYPTION_KEY` on server / `VITE_ENCRYPTION_KEY` on client), with the same default fallback value.

---

## What Stays on Cloud (3 Webhook Listeners)

These functions are **inbound listeners** — external services (Meta, Google, WhatsApp) push data TO them. They need a **publicly accessible HTTPS URL** that is always online, even when the user's desktop EXE is closed.

| # | Function Name | Why It Must Stay on Cloud |
|---|---|---|
| 1 | `metaWebhook` | Meta sends lead form submissions and page interaction events to this URL. Meta requires the webhook URL during app setup and verifies it with a challenge token. This URL must be live 24/7 — if it goes down, Meta stops sending leads. A desktop app cannot serve as a reliable public endpoint. |
| 2 | `googleAdsWebhook` | Google Ads pushes real-time lead form submission notifications to this URL. Same reason — Google needs a stable, always-online HTTPS endpoint to deliver webhooks. |
| 3 | `whatsappWebhook` | WhatsApp Cloud API delivers incoming customer messages (replies, new conversations) to this URL. If this goes offline, inbound WhatsApp messages are lost. The EXE cannot guarantee uptime. |

### Key Point About Webhooks

> A webhook is the opposite of an API call. Instead of the app calling an external service, the external service calls the app. This requires a public URL that is always reachable. A desktop `.exe` running on a user's laptop behind NAT/firewall cannot serve this role.

### Deployment Note

These 3 webhook functions only need to be deployed **once per Firebase project**. They are already live on the existing Firebase deployment. When setting up a new client:

1. Create a new Firebase project
2. Deploy only the 3 webhook functions: `firebase deploy --only functions:metaWebhook,functions:googleAdsWebhook,functions:whatsappWebhook`
3. Or optionally, host a single **Master Webhook Gateway** that routes events to the correct client's Firestore based on the webhook payload

No other functions need deployment. Everything else runs inside the `.exe`.

---

## Cost Savings Summary

| Metric | Before (All Cloud) | After (Local + 3 Webhooks) |
|---|---|---|
| Cloud Function invocations per day (est.) | ~500-2000+ | ~20-50 (webhook events only) |
| Cold start delays | Every idle function | Only webhooks (always warm with min instances) |
| Deployment complexity per client | Full `firebase deploy --only functions` (13 functions) | Optional: deploy 3 webhooks only, or use shared gateway |
| `.env`-only client setup | ❌ Not possible | ✅ Change `.env` → rebuild `.exe` → done |

---

## Files Changed in This Migration

| File | Changes |
|---|---|
| `src/context/CRMContext.jsx` | Added `decryptCredential` (Web Crypto AES-256-CBC decryption), `localSendWhatsAppMessage` (direct Meta Graph API call), rewrote 2 automated WhatsApp triggers and `sendWhatsAppMsg` |
| `src/modules/Integrations.jsx` | Rewrote `testGoogleAdsConnection` (direct OAuth + Google Ads API), `testMetaConnection` (direct Graph API), `forceGoogleAdsSync` (full local sync pipeline) |
| `src/modules/gowhatsapp/TemplatesPage.jsx` | Rewrote `loadTemplates`, `handleCreate`, `handleDelete` to use direct Meta Graph API calls |
| `src/modules/ConfigSettings.jsx` | Rewrote `handleAddCounselor` to use secondary Firebase App instance instead of `httpsCallable` |
| `functions/` | **No changes** — all 13 functions remain intact in the codebase for reference and backward compatibility |
