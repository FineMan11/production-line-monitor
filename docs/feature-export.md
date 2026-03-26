# Feature: Excel / PDF Export

## Status: Backlog (no assigned phase)

---

## Problem Statement

Supervisors and admins need to share production data with management or archive it outside the system. Currently there is no way to get a clean, formatted report from the application — data can only be viewed on screen.

---

## Proposed Solution

Export buttons on key pages (Job Sheets, Maintenance Logs, Analytics) that generate a formatted Excel or PDF file and download it directly to the browser.

---

## User Stories

- **As a supervisor**, I want to export the current shift's job sheet as a PDF that looks like the original K-MF0105 form, for filing or sharing.
- **As a supervisor**, I want to export a date range of maintenance logs for a tester to Excel for analysis.
- **As an admin**, I want to export analytics data (downtime, error frequency) to Excel for monthly management reports.

---

## Open Questions

- [ ] For job sheet PDF — should it match the exact layout of the paper K-MF0105 form, or is a clean digital format acceptable?
- [ ] For Excel exports — should formulas be included, or just raw data?
- [ ] Who should be able to export? (supervisor+, or all roles for their own data?)
- [ ] Should there be a record of what was exported and by whom (audit trail)?

---

## Technical Approach

### Backend

**New service:** `backend/app/services/export_service.py`
- `export_jobsheet_pdf(sheet_id)` — render PDF using a template library (e.g. `reportlab` or `weasyprint`)
- `export_maintenance_excel(filters)` — generate `.xlsx` using `openpyxl`
- `export_analytics_excel(params)` — generate `.xlsx` from analytics query results

**New endpoints:** `/api/export/`
| Endpoint | Method | Auth | Response |
|----------|--------|------|----------|
| `/api/export/jobsheet/<id>/pdf` | GET | jwt_required | `application/pdf` file |
| `/api/export/jobsheet/<id>/excel` | GET | jwt_required | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `/api/export/maintenance/excel` | GET | supervisor+ | `.xlsx` file |
| `/api/export/analytics/excel` | GET | supervisor+ | `.xlsx` file |

**New dependencies:**
- `openpyxl` — Excel generation
- `reportlab` or `weasyprint` — PDF generation (evaluate which is easier to template)

### Frontend

**New component:** `src/components/ExportButton.jsx`
- Props: `endpoint`, `filename`, `format` (`pdf` or `excel`)
- On click: calls the export endpoint, receives blob, triggers browser download
- Shows loading spinner while waiting
- Shows error toast if export fails

**Modified pages:**
- `JobSheetPage.jsx` — add `<ExportButton>` in sheet header
- `MaintenancePage.jsx` — add export button for current filter results
- `AnalyticsPage.jsx` — add export button per chart (data only) and full-page export

**New service method:** `src/services/exportService.js`
- `downloadExport(endpoint, filename)` — handles blob fetch + browser download trigger

---

## Database Changes

None required. Optionally add `export_logs` table for audit trail if required.

---

## Acceptance Criteria

- [ ] Clicking export on a job sheet generates a PDF download within 5 seconds
- [ ] The exported PDF contains all RIO entries, unproductive time, tester ID, shift, and date
- [ ] Excel exports include column headers and one row per record
- [ ] Export works correctly when there are zero records (produces an empty sheet, not an error)
- [ ] All exports are logged in the audit trail with user, timestamp, and what was exported
