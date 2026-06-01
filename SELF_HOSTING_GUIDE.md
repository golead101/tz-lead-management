# White-Label Self-Hosting Guide — Dynamic IFrames & Isolated Databases

This guide explains how you can distribute this Lead Management CRM template as a white-label product for your clients. Using this architecture, **Client A** and **Client B** can host their own completely independent copies of the application on Vercel, Netlify, or Firebase. 

The code automatically adapts to whichever domain they choose without requiring any manual modifications.

---

## 1. The Dynamic Domain Architecture

Instead of hardcoding a domain name (like `https://crm.yourcompany.com`) inside the frontend code, the application dynamically inspects the browser at runtime using:
`window.location.origin`

This variable evaluates to the exact protocol, domain name, and port of the active server. The application uses this value to generate the embed code displayed in the dashboard:

```javascript
// Detect the exact hosting location at runtime
const activeDomain = window.location.origin;

// Dynamically generate the copyable iframe code
const iframeSnippet = `
<iframe 
  src="${activeDomain}/forms/embed/default" 
  width="100%" 
  height="480px" 
  style="border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"
  loading="lazy">
</iframe>`;
```

---

## 2. Complete Client Examples & Execution Flows

Here is how the exact same codebase operates step-by-step for two separate clients when they deploy the template under their own domains using their own private databases.

---

### 💻 Client A Execution Flow: Aarav Tech Academy

* **Client A Domain:** `https://abc.com`
* **Dedicated CRM Host:** `https://crm.abc.com` (Hosted on Vercel)
* **Custom Database:** Client A's private Firebase database (`abc-crm-db`)

#### 🔄 Step-by-Step Flow:
1. **Purchase & Config:** Client A gets your source code. They open their Firebase Console, create a database project called `abc-crm-db`, and gather their unique credentials.
2. **One-Click Deploy:** Client A imports the project into their **Vercel** account and assigns their domain `crm.abc.com`. In Vercel's settings dashboard, they add their private environment keys:
   * `VITE_FIREBASE_API_KEY` = `AIzaSyA_abc_123`
   * `VITE_FIREBASE_PROJECT_ID` = `abc-crm-db`
3. **Automatic IFrame Generation:** When Client A logs into `https://crm.abc.com/sandbox`, the React app automatically reads `window.location.origin` (evaluating to `https://crm.abc.com`) and displays this pre-configured copyable iframe container:
   ```html
   <iframe 
     src="https://crm.abc.com/forms/embed/default" 
     width="100%" 
     height="480px" 
     style="border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"
     loading="lazy">
   </iframe>
   ```
4. **Site Embedding & Data Capture:** Client A copy-pastes this iframe onto their main site (`https://abc.com/admissions`). When a prospective student submits the form, it executes:
   ```javascript
   // Automatically uses Client A's Vercel credentials injected during deployment
   firebase.firestore().collection('leads').add(studentData);
   ```
5. **Outcome:** The new lead lands instantly inside **Client A's private database** (`abc-crm-db`) and dashboard pipeline.

---

### 💻 Client B Execution Flow: Apex Learning Group

* **Client B Domain:** `https://xyz.com`
* **Dedicated CRM Host:** `https://crm.xyz.com` (Hosted on Netlify)
* **Custom Database:** Client B's private Firebase database (`xyz-academy-crm`)

#### 🔄 Step-by-Step Flow:
1. **Purchase & Config:** Client B gets the exact same source code. They open their Firebase Console, create a database project called `xyz-academy-crm`, and gather their credentials.
2. **One-Click Deploy:** Client B imports the project into their **Netlify** account and assigns their domain `crm.xyz.com`. In Netlify's settings dashboard, they add their private environment keys:
   * `VITE_FIREBASE_API_KEY` = `AIzaSyB_xyz_987`
   * `VITE_FIREBASE_PROJECT_ID` = `xyz-academy-crm`
3. **Automatic IFrame Generation:** When Client B logs into `https://crm.xyz.com/sandbox`, the React app automatically reads `window.location.origin` (evaluating to `https://crm.xyz.com`) and displays this pre-configured copyable iframe container:
   ```html
   <iframe 
     src="https://crm.xyz.com/forms/embed/default" 
     width="100%" 
     height="480px" 
     style="border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);"
     loading="lazy">
   </iframe>
   ```
4. **Site Embedding & Data Capture:** Client B copy-pastes this iframe onto their main site (`https://xyz.com/register`). When a prospective student submits the form, it executes:
   ```javascript
   // Automatically uses Client B's Netlify credentials injected during deployment
   firebase.firestore().collection('leads').add(studentData);
   ```
5. **Outcome:** The new lead lands instantly inside **Client B's private database** (`xyz-academy-crm`) and dashboard pipeline.

---

## 3. Data Saving & isolated Database Configuration

Since both clients deploy their own instances, they do not share leads. Each client's data is saved to their own database via environment variables.

### 🔄 The Data Capture & Saving Flow

When a prospective student submits their details, the flow proceeds as follows:

```
[ Student on abc.com ]
        │ (Fills Form inside IFrame)
        ▼
[ IFrame: crm.abc.com/forms/embed ]
        │ (Submits Lead Data)
        ▼
[ Database API Call: POST /leads ]
        │ (Reads credentials from Client A's Environment Variables)
        ▼
[ Client A's Private Database ] (Leads stored securely and isolated)
```

### 🔑 Environment Variables Configuration
To hook up their own databases without editing code, clients simply provide their database keys in their hosting dashboard settings (Vercel, Netlify, or a `.env` file in the root):

#### Client A's Environment Panel
```env
VITE_DATABASE_API_KEY=AIzaSyA_ClientA_SecureKey987
VITE_DATABASE_URL=https://abc-crm-db.firebaseio.com
```

#### Client B's Environment Panel
```env
VITE_DATABASE_API_KEY=AIzaSyB_ClientB_SecureKey123
VITE_DATABASE_URL=https://xyz-crm-db.firebaseio.com
```

---

## 4. How to Package the Product for Your Clients

When selling this platform, provide these 3 steps to your clients to get up and running:

1. **Host the Code:** Import this React repository into a new, free Vercel or Netlify project.
2. **Assign Subdomain:** Add a custom subdomain in the hosting panel (e.g., `crm.yourdomain.com`).
3. **Configure Environment:** Create a database (e.g., Firebase, Supabase, or REST endpoint) and paste the credentials into the Environment Variables panel of the hosting provider.

Once deployed, the clients can log in, customize their pipeline, and copy their dynamically generated iframe code straight from the **Lead Integration Sandbox**!
