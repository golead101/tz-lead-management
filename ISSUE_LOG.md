# Issue Log

This document tracks issues encountered during development, their root causes, and the applied solutions.

## Format

**Issue [Number/Date]:** [Short description of the issue]
- **Description:** [Detailed explanation of the problem]
- **Root Cause:** [Why the issue occurred]
- **Solution:** [How the issue was fixed]
- **Files Modified:** [List of files changed to fix the issue]

---

**Issue [1/2026-08-01]:** Remove Hardcoded Admin 'Stefan Salvatore'
- **Description:** A dummy user "Stefan Salvatore" (Admin) was hardcoded into the UI and the database, appearing in the active Counselors list.
- **Root Cause:** Hardcoded strings in the Sidebar mockup UI and a dummy record initialized in the Firestore database.
- **Solution:** Replaced "Stefan Salvatore" with a generic "Admin User" in the sidebar preview of `ConfigSettings.jsx`. Ran a one-time script block during hot-reload to invoke `removeCounselor` and wipe the user's hardcoded entry (`stefan@academy.com`) from the live Firestore DB.
- **Files Modified:** `src/modules/ConfigSettings.jsx`

**Issue [2/2026-08-01]:** Update Filter Dropdown Default Labels to "ALL"
- **Description:** The filter dropdowns in the grid view displayed their default selected text as "All Programs", "All Stages", etc., instead of a uniform "ALL".
- **Root Cause:** The default `<option>` tags in the filter select elements were explicitly set to long descriptive strings.
- **Solution:** Modified the display text for the initial `<option>` of every filter (Course, Stage, Temperature, Owner, Source, Campaign) to "ALL" in `GridView.jsx`. Updated the `getDisplayDateRange()` logic to return "ALL" instead of "All Time" to match the behavior.
- **Files Modified:** `src/modules/GridView.jsx`

**Issue [3/2026-08-01]:** Adjust Filter Dropdown Width
- **Description:** Filter dropdown fields were too wide and had too much whitespace after updating their default text to "ALL".
- **Root Cause:** The `.gv-filter-select` CSS class had a fixed `width: 140px;`.
- **Solution:** Changed the width to `width: auto;`, added a `min-width: 85px;`, and set `max-width: 125px;` in `index.css` to dynamically shrink them while keeping them neat.
- **Files Modified:** `src/index.css`

**Issue [4/2026-08-01]:** Remove Role Switcher from Topbar
- **Description:** A sandbox dropdown allowing Counselors to switch identities was visible in the header.
- **Root Cause:** A developer testing tool was left exposed in the UI.
- **Solution:** Removed the `role-switcher-container` block from `Topbar.jsx` to prevent users from changing their active identity via the UI.
- **Files Modified:** `src/components/Topbar.jsx`

**Issue [5/2026-08-05]:** Remove Default Lead Values
- **Description:** Leads were automatically assigned a default course ("Data Science..."), name ("Anonymous Inquiry"), and temperature ("Warm") when none were provided.
- **Root Cause:** Hardcoded fallback values in `CRMContext.jsx` state initialization.
- **Solution:** Modified the fallback logic to leave `name` and `course` blank, and changed the default temperature for new leads to "Hot". 
- **Files Modified:** `src/context/CRMContext.jsx`

**Issue [6/2026-08-05]:** Auto-downgrade Hot Leads
- **Description:** Leads need to automatically transition from Hot to Warm if untouched.
- **Root Cause:** Feature request for dynamic status downgrading.
- **Solution:** Added logic in `onSnapshot` inside `CRMContext.jsx` to dynamically downgrade any lead marked as 'Hot' to 'Warm' if it is older than 4 days.
- **Files Modified:** `src/context/CRMContext.jsx`

**Issue [7/2026-08-05]:** Move Activity History Tab
- **Description:** The Activity History tab needed to be moved from a sub-menu under Leads to a top-level tab.
- **Root Cause:** UI restructure request.
- **Solution:** Removed it from the Leads dropdown array and updated the main menu visibility conditions in `Sidebar.jsx` to display it right before Settings.
- **Files Modified:** `src/components/Sidebar.jsx`

**Issue [8/2026-08-05]:** Firestore Undefined Temperature Crash
- **Description:** Opening the inbound WhatsApp chat caused a crash (`Unsupported field value: undefined`).
- **Root Cause:** Legacy/local leads were missing the `temperature` field. My previous update mapped missing temperatures to `undefined`, which `setDoc` rejects.
- **Solution:** Ensured the mapped temperature fallback safely evaluates to 'Hot' in all data loaders (Firestore snapshots and localStorage initializers) so `undefined` is never passed back.
- **Files Modified:** `src/context/CRMContext.jsx`
