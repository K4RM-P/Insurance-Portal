# Product Requirements Document (PRD)
## LIC Customer Database & Dashboard App

**Version:** 1.0
**Date:** August 5, 2026
**Author:** [Your Name]
**Status:** Draft for Development

---

## 1. Overview

### 1.1 Purpose
An LIC (Life Insurance Corporation) agent needs a single application to store, manage, and monitor all their customers' policy information. Today this is likely tracked in scattered notebooks, spreadsheets, or memory. This app centralizes every client's personal and policy details into one searchable database, and surfaces time-sensitive information (birthdays, premium due dates) on a dashboard so the agent never misses a follow-up.

### 1.2 Problem Statement
LIC agents manage dozens to hundreds of clients, each with multiple date-sensitive obligations (premium due dates, birthdays, maturity dates). Missing a premium due date reminder can mean a lapsed policy and lost commission; missing a birthday is a missed relationship-building opportunity. There's currently no lightweight, purpose-built tool for this.

### 1.3 Goals
- Store complete, structured records for every client and their policy.
- Make it fast to add and edit client records.
- Make it fast to find any client via flexible search.
- Proactively surface upcoming birthdays and premium due dates.
- Allow data export to Excel for backup, reporting, or offline use.

### 1.4 Non-Goals (v1)
- No online/cloud sync or multi-device access (unless specified in tech approach below).
- No payment processing or actual premium collection.
- No client-facing portal — this is an internal, agent-only tool.
- No SMS/email automation (alerts are in-app only, for v1).

### 1.5 Target User
A single LIC insurance agent (or small back-office team) managing their own client book. Not built for multi-tenant/enterprise use in v1.

---

## 2. Data Model

### 2.1 Client / Policy Record
Each record represents one **policy** (a client may have multiple policies, so the data model should support multiple records per client — see 2.2).

| Field | Type | Notes |
|---|---|---|
| Company Name | Text | e.g., "LIC of India" — supports future multi-company use |
| Plan Name | Text | e.g., "Jeevan Anand", "Jeevan Labh" |
| Client Name | Text | Required |
| Age | Number | Can be auto-calculated from birthday |
| Date of Birth | Date | Used to calculate age + trigger birthday alerts |
| Address | Text (multi-line) | |
| Phone Number | Text | Support multiple numbers if needed |
| Email | Text | |
| Policy Number | Text | Should be unique identifier |
| Assured Amount (Sum Assured) | Currency/Number | |
| Premium Frequency | Enum | Yearly / Half-Yearly / Quarterly / Monthly (LIC standard: Yly/Hly/Qly/Mly) |
| Premium Amount | Currency/Number | |
| Next Premium Due Date | Date | Core alert-driving field |
| Term | Number (years) | Policy term |
| Commencement Date | Date | Policy start date |
| Maturity Date | Date | Can be auto-calculated (Commencement Date + Term) or entered manually |

### 2.2 Data Model Design Decision
Recommend a **two-table relational structure**:
- **Clients** table: client name, DOB, address, phone, email (personal info, shared across policies)
- **Policies** table: company name, plan name, policy number, assured amount, frequency, premium amount, next due date, term, commencement date, maturity date — each row linked to a client via `client_id`

This avoids duplicate client info if a client has multiple policies, and makes the dashboard/alerts logic cleaner. (If simplicity is preferred for v1, a single flat table works too — see the Claude Code prompt for both options.)

### 2.3 Computed / Derived Fields
- **Age**: derived from DOB + current date (don't require manual entry/update)
- **Days until next birthday**: derived, drives birthday alert sorting
- **Days until next premium due**: derived, drives due-date alert sorting
- **Maturity Date**: optionally auto-calculated as Commencement Date + Term (but allow manual override, since LIC maturity dates aren't always exactly term-years-later)
- **Policy Status**: derived label — e.g., "Active", "Due Soon" (within 15/30 days), "Overdue", "Matured"

---

## 3. Features

### 3.1 Navigation
Two main tabs:
1. **Dashboard**
2. **Database**

### 3.2 Dashboard Tab
Purpose: at-a-glance view of what needs attention **today and soon**.

- **Birthday Alerts**
  - List of clients with birthdays in the next N days (default 7–30, configurable)
  - Sorted by soonest first
  - Show: client name, DOB, age turning, days remaining
  - Today's birthdays highlighted distinctly
- **Upcoming Premium Due Dates**
  - List of policies with next premium due within N days (default 30)
  - Sorted by soonest first
  - Show: client name, policy number, plan name, premium amount, due date, days remaining
  - Overdue due dates flagged in red/distinct styling
- **Summary Stats** (nice-to-have)
  - Total clients, total active policies, total assured amount under management, premiums due this month
- **Quick actions**: click any alert card to jump to that client's full record

### 3.3 Database Tab
Purpose: full searchable list of all clients/policies, with add/edit capability.

- **Table/list view** of all records with key columns visible (client name, plan, policy number, next due date, phone)
- **Search bar**: real-time/instant filter across:
  - Company name, plan name, client name, address, phone number, email, policy number (multi-field fuzzy or substring search)
- **Filter/sort options** (nice-to-have): sort by name, due date, premium amount; filter by company or plan
- **Click a row** → opens full client detail view (all fields)
- **Add Client button** → opens form with all fields
- **Edit** → same form, pre-filled, from detail view or inline
- **Delete client** (with confirmation)

### 3.4 Add/Edit Client Form
- Single form covering all fields listed in section 2.1
- Field validation:
  - Required: Client Name, Policy Number, Premium Amount, Next Premium Due Date
  - Date pickers for DOB, Commencement Date, Maturity Date, Next Premium Due Date
  - Numeric validation for Age, Assured Amount, Premium Amount, Term
  - Dropdown/select for Premium Frequency (Yearly/Half-Yearly/Quarterly/Monthly)
  - Phone/email format validation (soft — don't block save on format issues, just warn)
- Auto-calculate Age from DOB (editable override allowed)
- Optionally auto-calculate Maturity Date from Commencement Date + Term (editable override allowed)

### 3.5 Search
- Single search input on Database tab
- Searches across: company name, plan name, client name, address, phone number, email, policy number
- Should be instant (client-side filter) given expected data size (hundreds, not millions, of records)
- Case-insensitive, partial match

### 3.6 Export to Excel
- Button on Database tab (and/or Dashboard): "Export to Excel"
- Exports all client/policy records with all fields as column headers
- Format: `.xlsx`
- Optional: export filtered/searched subset only vs. full database (toggle)
- Filename convention: `LIC_Clients_Export_YYYY-MM-DD.xlsx`

---

## 4. Non-Functional Requirements

- **Data persistence**: All data must persist across sessions/browser restarts (local storage/database — not lost on refresh)
- **Performance**: Instant search/filter for up to ~2,000 records
- **Usability**: Should be usable by a non-technical insurance agent — clear labels, minimal clicks, no jargon
- **Data privacy**: This contains PII (names, DOB, address, phone, email) — should be a private/local app, not publicly hosted without auth
- **Responsive design**: Should work on desktop primarily; mobile-friendly is a bonus
- **Backup**: Excel export doubles as a manual backup mechanism

---

## 5. Suggested Tech Approach

Given this is likely a single-user, locally-run tool, recommended options in order of simplicity:

**Option A — Simple, fast to build (recommended for v1):**
- Single-page React app
- Browser-based storage (IndexedDB via a lightweight wrapper, since localStorage has size/type limits) for persistence
- Client-side Excel export via SheetJS (`xlsx` library)
- No backend server required — runs entirely in-browser

**Option B — More robust, supports larger data / future multi-device:**
- React frontend + lightweight backend (Node/Express) with SQLite or Postgres
- REST API for CRUD operations
- Server-side Excel export
- Enables future features like multi-user access, cloud backup, reminders via email/SMS

**Recommendation:** Start with Option A for speed; the data model (Section 2) is designed to migrate cleanly to Option B later if needed.

---

## 6. Success Criteria

- Agent can add a new client + policy record in under 60 seconds
- Agent can find any client via search in under 5 seconds
- Dashboard correctly surfaces all birthdays and due dates within the configured window, with zero false negatives (missing an alert is worse than a false positive)
- Full database exports correctly to a well-formatted Excel file that opens cleanly in Excel/Google Sheets
- No data loss on refresh/restart

## 7. Future Enhancements (Out of Scope for v1)
- Email/SMS reminders (not just in-app alerts)
- Multi-agent/multi-user support with login
- Cloud sync across devices
- Commission tracking
- Document/file attachments per policy (scanned policy documents)
- Renewal history / payment history log per policy
- Import from Excel (not just export)

---

---

# Prompt for Claude Code

Copy everything below into Claude Code to build the app.

```
Build a web app called "LIC Client Manager" for an LIC (Life Insurance Corporation) insurance agent to manage their customer/policy database. This is a single-user, local-first app — no login/auth needed.

TECH STACK
- React (functional components + hooks) for the frontend, built with Vite
- Tailwind CSS for styling — clean, professional, easy to read for a non-technical user
- IndexedDB for persistent local storage (use the `idb` npm package as a wrapper) — all data must survive page refresh and browser restart
- SheetJS (`xlsx` npm package) for Excel export
- date-fns (or similar) for date calculations
- No backend server — everything runs client-side

DATA MODEL
Use two related IndexedDB object stores:

1. `clients` store — one record per client:
   - id (auto-generated primary key)
   - clientName (string, required)
   - dob (date string, ISO format)
   - address (string, multi-line)
   - phone (string)
   - email (string)

2. `policies` store — one record per policy, linked to a client:
   - id (auto-generated primary key)
   - clientId (foreign key to clients.id)
   - companyName (string, e.g. "LIC of India")
   - planName (string)
   - policyNumber (string, required, should be unique)
   - assuredAmount (number)
   - premiumFrequency (enum: "Yearly" | "Half-Yearly" | "Quarterly" | "Monthly")
   - premiumAmount (number, required)
   - nextPremiumDueDate (date string, ISO format, required)
   - term (number, years)
   - commencementDate (date string, ISO format)
   - maturityDate (date string, ISO format — auto-calculate as commencementDate + term years, but allow manual override)

One client can have multiple policies. The UI should present this as ONE combined form when adding/editing (since in practice the agent is usually entering one client + one policy at a time), but store the data relationally under the hood. If a client name matches an existing client when adding a new record, offer to link the new policy to the existing client rather than duplicating the client's personal info.

APP STRUCTURE
Two tabs at the top of the app: "Dashboard" and "Database". Persist which tab is active in state (default to Dashboard on load).

=== DASHBOARD TAB ===
- "Birthday Alerts" section: card list of clients with birthdays in the next 30 days (make this window configurable via a small dropdown: 7/14/30/60 days), sorted soonest-first. Each card shows: client name, DOB, turning-age, and "Today!" / "in X days" label. Today's birthdays should be visually highlighted (different background color).
- "Upcoming Premium Due Dates" section: card list of policies with nextPremiumDueDate within the next 30 days (same configurable window), sorted soonest-first. Each card shows: client name, plan name, policy number, premium amount, due date, "in X days" or "OVERDUE by X days" (overdue items styled in red/urgent color and sorted to the top).
- Summary stat row at the top: total clients, total active policies, total assured amount (sum), count of premiums due this month.
- Clicking any card navigates to that client's detail view in the Database tab.

=== DATABASE TAB ===
- Search bar at the top — instant, case-insensitive, partial-match search across: companyName, planName, clientName, address, phone, email, policyNumber. Filter the list as the user types (no submit button needed).
- Table/list view below showing all clients+policies with key columns: Client Name, Plan Name, Policy Number, Next Premium Due Date, Phone. Sortable by clicking column headers (at least by Client Name and Next Premium Due Date).
- Clicking a row opens a detail view/modal showing ALL fields for that client + policy in a clean, readable layout.
- "Add Client" button (prominent, top of tab) opens a form modal with ALL fields from the data model above.
- From the detail view, "Edit" button opens the same form pre-filled with existing data.
- From the detail view, "Delete" button removes the record (with a confirmation dialog first).
- "Export to Excel" button — exports the full client+policy list (flattened into one row per policy, joined with client info) to a downloadable .xlsx file named `LIC_Clients_Export_[current-date].xlsx`. Use SheetJS. Include a header row with human-readable column names matching the field list in the PRD.

ADD/EDIT FORM REQUIREMENTS
- All fields from the data model, grouped logically: Client Info (name, DOB, address, phone, email) then Policy Info (company, plan, policy number, assured amount, frequency, premium amount, next due date, term, commencement date, maturity date).
- Required field validation: Client Name, Policy Number, Premium Amount, Next Premium Due Date. Show inline error messages, don't allow save until resolved.
- Date fields use native date pickers.
- Premium Frequency is a dropdown: Yearly, Half-Yearly, Quarterly, Monthly.
- Auto-calculate and display Age next to the DOB field (read-only, derived, updates live as DOB is entered).
- Auto-calculate Maturity Date as commencementDate + term years when both are filled, but let the user manually overwrite it afterward (don't force-lock the field).
- Phone/email: validate format but only show a soft warning, don't block saving.
- Clear "Save" and "Cancel" buttons. On save, write to IndexedDB and return to the Database tab / detail view.

DESIGN / UX
- Clean, professional, high-contrast, easy to read — this will be used daily by a non-technical insurance agent, so prioritize clarity over cleverness.
- Use a card-based layout for the Dashboard, a table for the Database list.
- Use color coding sparingly and meaningfully: red/orange for overdue or due-very-soon items, a highlight color for today's birthdays.
- Fully responsive down to tablet width at minimum; desktop is the primary target.
- Empty states: if there are no clients yet, show a friendly empty state on both tabs prompting the user to add their first client.

BUILD IT AS
A complete, working Vite + React project with all necessary files (package.json, index.html, src/ components, etc.) so it can be run immediately with `npm install && npm run dev`. Structure the code into clear components (e.g., Dashboard.jsx, Database.jsx, ClientForm.jsx, ClientDetail.jsx, SearchBar.jsx, db.js for the IndexedDB layer, export.js for the Excel export logic). Add a few sample/seed client records on first load so the app isn't empty when first opened (clearly mark these as sample data, or make it easy to delete them).
```

---

## How to use this
1. Review the PRD above and adjust any fields, priorities, or the tech approach to match your preferences.
2. Copy the code block under "Prompt for Claude Code" and paste it directly into Claude Code (or Claude Code Desktop) to start the build.
3. Once the first version is running, use follow-up prompts in Claude Code to refine styling, add the "Future Enhancements" from Section 7, or adjust the data model.
