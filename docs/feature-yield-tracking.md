# Feature: Yield Tracking

## Status: Backlog (no assigned phase)

---

## Problem Statement

The system tracks uptime and downtime, but not productivity in terms of units. A tester can be marked Running for 12 hours but produce very few tested units. Without yield data, it is impossible to measure whether line changes actually improve output or just reduce downtime.

---

## Proposed Solution

Add yield fields to job sheet entries (units tested, units passed, units failed) and build a yield summary view per tester per shift. Tie into analytics to show yield trends over time.

---

## User Stories

- **As a supervisor**, I want to see how many units each tester produced per shift so I can compare productivity across stations.
- **As an operator**, I want to record tested/passed/failed counts alongside my existing RIO entry so they are captured in one place.
- **As a supervisor**, I want to see a yield % trend chart over the past month, broken down by tester type or device.

---

## Open Questions

- [ ] Is yield data available from tester log files (Phase 5 auto-parse), or must it be entered manually?
- [ ] Should yield be per RIO entry (granular) or one total per shift per tester (simpler)?
- [ ] Is there a target yield % that should be shown as a benchmark line on charts?
- [ ] Should yield be tied to a specific device/part number, or just a raw count?
- [ ] Does "units failed" mean hard bin failures or all rejects?

---

## Technical Approach

### Backend

**Modified model:** `JobSheetEntry` in `backend/app/models/jobsheet.py`
- Add `units_tested = db.Column(db.Integer, nullable=True)`
- Add `units_passed = db.Column(db.Integer, nullable=True)`
- Add `units_failed = db.Column(db.Integer, nullable=True)`
- Yield % is derived: `units_passed / units_tested * 100` — not stored

**New analytics endpoint:** `GET /api/analytics/yield`
- Params: `date_from`, `date_to`, `tester_type`, `device`
- Returns: list of `{tester_id, tester_name, total_tested, total_passed, yield_pct}`

**Modified service:** `analytics_service.py`
- Add `get_yield_by_tester(date_from, date_to, tester_type)` query

### Frontend

**Modified:** `src/components/jobsheet/JobSheetEntryForm.jsx`
- Add optional numeric inputs: Units Tested, Units Passed, Units Failed
- Auto-calculate and display Yield % when all three are filled

**Modified:** `src/components/jobsheet/JobSheetTable.jsx`
- Add columns: Units Tested, Passed, Failed, Yield %
- Show shift totals at bottom of table

**New component:** `src/components/analytics/YieldChart.jsx`
- Line chart: yield % per tester over time
- Benchmark line at target yield (configurable)

---

## Database Changes

| Table | Change | Reason |
|-------|--------|--------|
| `jobsheet_entries` | Add `units_tested`, `units_passed`, `units_failed` (nullable Integer) | Store yield counts per entry |

---

## Acceptance Criteria

- [ ] Operators can optionally enter units tested/passed/failed on any job sheet entry
- [ ] Yield % is displayed correctly in the job sheet table when counts are present
- [ ] Entries without yield data display a dash, not zero or an error
- [ ] Analytics yield chart loads correctly and handles testers with no yield data
- [ ] Shift totals in the job sheet correctly sum only entries that have yield data
