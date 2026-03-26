# Feature: Analytics Dashboard

## Status: Planned
## Phase: (after Phase 6)

---

## Problem Statement

Supervisors currently have no way to answer questions like:
- Which tester had the most downtime this month?
- What is our average time-to-resolve a troubleshooting session?
- Which hard bin is causing the most disruptions?
- Is overall line uptime improving or worsening over time?

All the data exists in the system, but there is no aggregation or visualisation layer.

---

## Proposed Solution

A dedicated Analytics page, visible to supervisors and admins, with filterable charts and summary cards drawn from `status_history`, `maintenance_logs`, and `troubleshooting_sessions`.

---

## User Stories

- **As a supervisor**, I want a bar chart of downtime hours per tester for the current week, so I can identify problem stations.
- **As a supervisor**, I want to see the top 5 recurring troubleshooting action tags so I know what the most common fixes are.
- **As an admin**, I want to export any chart's data to Excel for monthly reporting.
- **As a supervisor**, I want to filter all charts by date range and tester type.

---

## Open Questions

- [ ] What is the primary date range the supervisor cares about? (Today / This week / This month / Custom?)
- [ ] Should charts be live (WebSocket-updated) or refreshed manually?
- [ ] Do supervisors need to share analytics reports with people outside the system (e.g. management)? If so, export to PDF is important.
- [ ] Is there a KPI or target the facility tracks (e.g. target uptime %)? Should it be shown as a benchmark line on charts?

---

## Technical Approach

### Backend

**New service:** `backend/app/services/analytics_service.py`
- `get_downtime_by_tester(date_from, date_to, tester_type)` → list of `{tester_id, tester_name, downtime_hours}`
- `get_error_frequency(date_from, date_to, tester_type)` → list of `{tester_id, session_count}`
- `get_resolution_rate(date_from, date_to)` → `{solved: N, unsolved: N}`
- `get_top_actions(date_from, date_to, limit)` → list of `{action_tag, count}`
- `get_uptime_trend(date_from, date_to, granularity)` → list of `{date, uptime_pct}`

All queries are read-only aggregations on existing tables — no new data structures needed.

**New endpoints:** `/api/analytics/`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/analytics/downtime` | GET | supervisor+ | Downtime per tester |
| `/api/analytics/errors` | GET | supervisor+ | Session count per tester |
| `/api/analytics/resolution-rate` | GET | supervisor+ | Solved vs unsolved |
| `/api/analytics/top-actions` | GET | supervisor+ | Most used action tags |
| `/api/analytics/uptime-trend` | GET | supervisor+ | Uptime % over time |

**Query params (all endpoints):** `date_from`, `date_to`, `tester_type`

### Frontend

**New page:** `src/pages/AnalyticsPage.jsx`
- Date range picker + tester type filter at the top
- Four chart widgets below
- Export button (generates Excel/PDF via backend)

**New components:** `src/components/analytics/`
| Component | Chart Type | Data Source |
|-----------|-----------|-------------|
| `DowntimeChart.jsx` | Horizontal bar chart | `/api/analytics/downtime` |
| `ErrorFrequencyChart.jsx` | Bar chart | `/api/analytics/errors` |
| `ResolutionRateChart.jsx` | Donut chart | `/api/analytics/resolution-rate` |
| `TopActionsTable.jsx` | Ranked table | `/api/analytics/top-actions` |
| `UptimeTrendChart.jsx` | Line chart | `/api/analytics/uptime-trend` |
| `AnalyticsFilters.jsx` | Filter bar | — |

**Library:** Recharts (already in tech stack plan)

**New service:** `src/services/analyticsService.js`
- One function per analytics endpoint

---

## Database Changes

None — analytics are derived from existing tables.

---

## Acceptance Criteria

- [ ] All four chart types load correctly with default date range (last 7 days)
- [ ] Changing the date range or tester type filter refreshes all charts
- [ ] Charts render correctly with zero data (empty state, not broken)
- [ ] Analytics page is blocked for operator and line_technician roles
- [ ] Each chart loads within 3 seconds under normal database load
