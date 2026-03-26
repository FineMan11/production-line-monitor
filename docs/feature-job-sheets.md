# Feature: Digital Job Sheets (K-MF0105)

## Status: Complete (Phase 2) — UI layer planned
## Phase: 2 (backend done), Phase 3+ (full UI)

---

## Problem Statement

Form K-MF0105 is the paper job sheet filled in by operators every shift. Each sheet covers one tester for one shift. Operators record:
- RIO daily entries (time, flow, site, totals)
- Unproductive time (reason, start, end)
- Responsible technician

Paper forms are easy to lose, hard to audit, and cannot be queried for analytics. Supervisors have no real-time view of what is on each sheet.

---

## Current State

The backend models (`JobSheet`, `JobSheetEntry`) and service layer are built (Phase 2). The API endpoints are likely implemented or stubbed.

The **full UI** for job sheets is not yet built — the existing dashboard and maintenance pages do not include a dedicated job sheet view.

---

## Remaining Work

### Phase 3+: Full Job Sheet UI

**New page:** `src/pages/JobSheetPage.jsx` at route `/jobsheets`
- Operator: see active job sheet for their tester
- Supervisor/Admin: browse all job sheets with tester/shift/date filters

**New components:** `src/components/jobsheet/`
| Component | Purpose |
|-----------|---------|
| `JobSheetHeader.jsx` | Display tester, shift, date, operator, supervisor |
| `JobSheetTable.jsx` | RIO daily entries table with edit/add |
| `JobSheetEntryForm.jsx` | Form to add a new RIO entry |
| `UnproductiveTimeLog.jsx` | List + add unproductive time entries |
| `JobSheetCloseButton.jsx` | Supervisor action to close the sheet at end of shift |

**New service:** `src/services/jobsheetService.js`
- `getActiveJobSheet(testerId)` — current open sheet for a tester
- `getJobSheet(id)` — any sheet by ID
- `searchJobSheets(params)` — list with filters (tester, date range, shift)
- `addEntry(sheetId, body)` — add an RIO entry
- `addUnproductiveTime(sheetId, body)` — add an unproductive time entry
- `closeJobSheet(id)` — close the sheet (supervisor+)

---

## User Stories

- **As an operator**, I want to see my tester's current job sheet so I know what has been recorded for my shift.
- **As an operator**, I want to add an RIO entry (time, flow, site, totals) to the active job sheet.
- **As a line technician**, when I close a maintenance event, I want the unproductive time to be automatically added to the active job sheet.
- **As a supervisor**, I want to see all job sheets for today in one view to check that all testers are logged correctly.
- **As a supervisor**, I want to close a job sheet at the end of shift.
- **As an admin**, I want to browse historical job sheets by tester, date, and shift.

---

## Business Rules

- One job sheet per tester per shift (auto-created at shift start by Celery task)
- Morning shift: 07:00–19:00 | Night shift: 19:00–07:00
- Job sheets are **closed, not deleted** at shift end
- RIO entry corrections are handled by adding a new entry with a note — the original is preserved
- Unproductive time entries are linked to maintenance logs where applicable

---

## Open Questions

- [ ] Is the Celery auto-create task for job sheets already implemented, or stubbed?
- [ ] Does closing a maintenance log automatically add unproductive time to the job sheet today?
- [ ] Should operators be able to see past job sheets, or only the current active sheet?
- [ ] Should the job sheet page be accessible from the TesterCard on the dashboard (click through)?

---

## Acceptance Criteria

- [ ] Each tester has exactly one active job sheet per shift
- [ ] Operators can add RIO entries to the active job sheet
- [ ] Entries are append-only — corrections create a new entry with a note
- [ ] Unproductive time is recorded with reason, start time, and end time
- [ ] Duration is calculated automatically (end - start)
- [ ] Supervisors can close a job sheet; closed sheets are read-only
- [ ] Historical sheets are browsable by tester, date, and shift
