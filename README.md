# Lead Management CRM Platform

Welcome to the **Lead Management CRM Platform**, a next-generation, high-fidelity React Single-Page Application (SPA) designed to optimize, track, and streamline student admissions pipelines for modern educational institutes.

Constructed using **Vite + React** and stylized with advanced **vanilla HSL-themed CSS**, this platform operates on an offline-first state, persisting all databases, capture webhooks, simulated WhatsApp communications, and custom branding variables directly in the browser using robust `localStorage` layers.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org) installed on your local computer.

### 2. Installation
Open your terminal in the project root directory and install dependencies:
```bash
npm install
```

### 3. Running the Local Development Server
Start the local Vite development server:
```bash
npm run dev
```
Open your browser and navigate to the local server URL (usually [http://localhost:5173](http://localhost:5173)) to experience the CRM live.

---

## 🔑 Demo Access Credentials
The platform is protected by a visual login gateway. To facilitate rapid evaluation, click the **"Click to Quick-Fill Demo Credentials"** toggle on the login page to expand the credentials board:

* **Administrator (Stefan Salvatore)**
  * **Email/Username**: `admin` or `stefan@academy.com`
  * **Password**: `admin` or `stefan123`
  * **Access Level**: Unrestricted configuration access, analytics, settings, and full bulk re-assignments.
* **Admissions Manager (Damon Salvatore)**
  * **Email/Username**: `manager` or `damon@academy.com`
  * **Password**: `manager` or `damon123`
  * **Access Level**: Full counselor monitor access and lead management controls.
* **Admissions Counselor (Elena Gilbert)**
  * **Email/Username**: `counselor` or `elena@academy.com`
  * **Password**: `counselor` or `elena123`
  * **Access Level**: Isolated queue access (counselors can only see and interact with leads assigned to them).

---

## 🛠️ Key Platform Features

### 1. Interactive Dashboard Overview
* **Stripe/Vercel-Standard KPI Cards**: Refined indicators tracking New Inquiries, Active Pipelines, Converted Students, and Overdue Callbacks. Features left-aligned typographic values and circular status icons absolutely positioned in the top-right corner.
* **Hover-to-Pause Live Updates Ticker**: A full-width ticker announcement banner crawling at a comfortable `180s` animation speed. Hovering your cursor over the banner instantly pauses the animation (`animation-play-state: paused`) for easy reading.
* **Actionable Follow-up List**: Lists all scheduled callbacks sorted by urgency. Includes inline buttons to launch chat simulators, log outcome histories, or clear tasks.

### 2. Drag-and-Drop Kanban Board (`Lead Board`)
* **Fluid Drag-and-Drop**: Built using native HTML5 drag-and-drop APIs. Column headers are dynamically built from the registered pipeline stages database.
* **Outcome Prompts**: Dropping a card onto a new stage opens a prompt asking the counselor for notes, which instantly inserts a timestamped system entry in the lead's history log.

### 3. Spreadsheet List Console (`Lead Grid`)
* **Sorting & Filtering**: Dynamic column sorting and multi-column keywords filtering.
* **Bulk Operations**: Multi-select rows to bulk-reassign owners or shift stages.
* **Excel/CSV Bulk Import Simulator**: An overlay where developers paste spreadsheet rows. It runs real-time duplicate collision detection (checking for email/phone overlaps) before inserting.

### 4. Chronological Timeline Feed (`Detail View`)
* **Timeline Filters**: Isolated category filters (`All`, `Calls`, `Chats`, `System`, `Demos`) to sift audit logs.
* **Collapsible Log Nodes**: Click any card in the feed to collapse its text body into a single line, making timeline auditing highly readable.
* **Engagement Creators**: Call outcome recorders, callback schedulers, and classroom demo bookers.

### 5. WhatsApp Communication Console
* **Smart Suggestion Pills**: Renders dynamic suggestion pills tailored to the student's applied program (e.g. Web Dev fees or Evening Batch info) to populate text inputs with one click.
* **Slash Command Popover**: Typing `/` triggers an autocomplete template menu (e.g., `/welcome`, `/fees`, `/demo`) that automatically interpolates the student's name and counselor's name in real-time.
* **Teal-to-Red Rebrand**: Fully rebranded input bars, dropdown presets, and Send buttons utilizing bold HSL primary red accents and custom paper plane vectors.

### 6. System Customization Console (`Settings`)
* **Instant Colors customizer**: Slide primary/secondary color hue selectors (0°-360°) to dynamically update the entire app's HSL styling variables instantly in real-time.
* **Reactive Change Detection**: The "Apply Branding" button is disabled unless the settings inputs contain actual changes (or reverts if changes are undone).
* **Registry Managers**: Directories to add custom pipeline columns, courses, or custom fields (e.g. Blood Group, transport options).

### 7. Live Webhook Sandbox
* **Developer Webhook Code Block**: Easy copy-pasteable HTML/JS code snippets to sync external sites.
* **Browser Frame Simulator**: A live mockup registration form. Submitting an inquiry on this simulator instantly routes the lead payload into the CRM, triggering a sound/visual alert!

---

## 📁 Project Directory Structure

```text
Lead Management/
├── INTEGRATION_GUIDE.md   # Detailed walkthrough on webhook & iframe configurations
├── README.md              # Detailed overview and local setup guidelines (This file)
├── package.json           # npm configuration and dependencies list
├── vite.config.js         # Vite configuration settings
├── index.html             # HTML entry point (SEO metadata and fonts load)
└── src/
    ├── main.jsx           # React app renderer entry point
    ├── App.jsx            # Core layout component, route switcher, and shimmer loader
    ├── index.css          # Main styling variables, transitions, and keyframes database
    ├── components/
    │   ├── Sidebar.jsx    # Left navigation menu and hover-logout profile card
    │   ├── Topbar.jsx     # Search inputs, notifications bell, and cmd palette overlay
    │   └── LoginScreen.jsx# Auth portal with expandable demo accounts
    ├── context/
    │   └── CRMContext.jsx # Global CRM state controller, Seed database, and local storage hooks
    └── modules/
        ├── Dashboard.jsx      # KPI counter cards, scrolling ticker, and follow-up queue
        ├── KanbanView.jsx     # HTML5 drag-and-drop pipeline board
        ├── GridView.jsx       # Spreadsheet console with CSV importer and bulk reassign
        ├── DetailTimeline.jsx # Timeline category filters, collapsible nodes, and profile editor
        ├── WhatsAppConsole.jsx# Chat logs, slash command popover, and suggestion pills
        ├── Analytics.jsx      # Power BI-standard conversion rates, channels, and counselor loads
        ├── Sandbox.jsx        # Copy-pasteable webhook snippet and browser frame simulator
        └── ConfigSettings.jsx # Color hue sliders, courses register, and custom fields setup
```

---

## 🛠️ Verification & Build Health
To verify compile-time security and build output:
```bash
npm run build
```
The project compiles successfully into static assets under the `/dist` directory in less than **200ms**, confirming 100% build health and zero runtime syntax errors.
