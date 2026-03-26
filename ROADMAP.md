# Production Line Monitor — Roadmap

This is the master planning document for all current and future work.
Update this file when features are completed, deprioritised, or new ideas emerge.

---

## Phase Overview

| Phase | Name | Status | Scope |
|-------|------|--------|-------|
| Phase 1 | Live Dashboard | ✅ Complete | Real-time tester status, 52 stations, WebSocket |
| Phase 2 | Digital Job Sheets | ✅ Complete | K-MF0105 replacement, shifts, RIO entries |
| Phase 3 | Full-Stack Rebuild + Troubleshooting | 🔄 In Progress | React/PostgreSQL/Docker, troubleshooting sessions |
| Phase 4 | JHT Handler Monitoring | 🔜 Planned | Real-time network link to JHT handlers |
| Phase 5 | Auto Job Sheet from Log Files | 🔜 Planned | Parse tester log files → auto-fill job sheet entries |
| Phase 6 | Technician Knowledge Base | 🔜 Planned | Searchable library of past troubleshooting solutions |
| Phase 7 | AI Root Cause Analysis | 🔜 Planned | Claude-powered RCA on troubleshooting sessions |

---

## Phase 3 — Full-Stack Rebuild + Troubleshooting
**Status:** 🔄 In Progress

### Completed in Phase 3
- React 18 + Vite + Tailwind CSS frontend
- Flask REST API backend with JWT authentication
- PostgreSQL database with Flask-Migrate
- Docker Compose full-stack orchestration
- Nginx reverse proxy
- Role-based access control (operator, line_technician, supervisor, admin)
- Real-time dashboard via Socket.IO
- Maintenance logging
- Admin panel (user management, audit logs)

### In Progress
- **Troubleshooting Sessions** — log and track upchuck/jamming incidents per tester
  - Session model (type, hard bin, technician, open/closed)
  - Steps model (actions taken, results, PC failure observations)
  - Full API (CRUD + close + step management)
  - TroubleshootingModal UI with step carousel
  - StepItem editor with PC failure block (pin, HB, SB, measured values, site failures)
  - Integration with maintenance page history view
  - Two pending database migrations

### Remaining for Phase 3
- [ ] Commit and migrate troubleshooting changes
- [ ] End-to-end test: start session → add steps → close session
- [ ] Validate site count / site number filtering in StepItem
- [ ] Supervisor-level delete session enforcement

---

## Phase 4 — JHT Handler Real-Time Monitoring
**Status:** 🔜 Planned
**See:** [docs/feature-jht-monitoring.md](docs/feature-jht-monitoring.md)

### Goal
Read live status data from JHT handlers over the factory network and reflect it on the dashboard automatically — no manual status updates needed for JHT units.

### Key Questions (open)
- What protocol does JHT expose? (TCP socket, HTTP API, Modbus, proprietary?)
- Can the backend server reach the JHT units directly, or is a middle device needed?
- How often do JHT handlers broadcast state changes?
- What states are available from the hardware vs inferred from timing?

### Rough Scope
- Backend polling/listener service (Celery task or dedicated daemon)
- Parse JHT output into standard status format
- Emit `status_update` Socket.IO event on change
- Dashboard auto-reflects without manual operator input
- Conflict resolution if operator overrides an auto-status

---

## Phase 5 — Auto Job Sheet from Tester Log Files
**Status:** 🔜 Planned
**See:** [docs/feature-auto-jobsheet.md](docs/feature-auto-jobsheet.md)

### Goal
Tester machines produce log files. Parse these automatically to populate job sheet RIO entries — eliminating manual data entry by operators.

### Key Questions (open)
- What format are the log files? (CSV, plain text, proprietary binary?)
- Are log files accessible from the server, or does an operator need to upload them?
- Which fields in the log map to job sheet fields (time, flow, site, totals)?
- How do we handle log files that span across a shift boundary?
- What happens if auto-fill conflicts with a manually entered value?

### Rough Scope
- File watcher or upload endpoint
- Log parser per tester type (INVTG, ETS364, J750 may differ)
- Mapping layer: log fields → job sheet entry fields
- Conflict and duplicate detection
- Operator review step before committing auto-filled entries

---

## Phase 6 — Technician Knowledge Base
**Status:** 🔜 Planned
**See:** [docs/feature-knowledge-base.md](docs/feature-knowledge-base.md)

### Goal
When a technician encounters a recurring problem (same hard bin, same tester type), they should be able to search past solved troubleshooting sessions to find what worked before — without scrolling through history manually.

### Rough Scope
- Search UI: filter by tester type, hard bin, session type, keywords in steps
- "Save as known solution" action on closed sessions
- Knowledge base page with solution cards
- Tag system for solutions (socket issue, alignment, handler jam, etc.)
- Optionally surfaced inside TroubleshootingModal as "Similar past cases"

---

## Phase 7 — AI Root Cause Analysis
**Status:** 🔜 Planned (after Phase 6)
**See:** [ANALYSIS.md](ANALYSIS.md) for full implementation plan

### Goal
Supervisors can trigger an AI-powered analysis on any troubleshooting session. The Claude API reads the steps, hard bin, tester type, and recent history to suggest a root cause and recommended fix.

### Dependencies
- Phase 3 troubleshooting system must be stable
- `ANTHROPIC_API_KEY` in environment
- `root_cause` column on `TroubleshootingSession` (see ANALYSIS.md)

---

## Backlog / Ideas Parking Lot

Features with no assigned phase yet. Add ideas here freely.

| Idea | Description | Priority |
|------|-------------|----------|
| **Email / SMS Alerts** | Notify supervisor when a station goes Down or when a troubleshooting session is opened | Medium |
| **Excel / PDF Export** | Export job sheets, maintenance logs, or troubleshooting history as a report | Medium |
| **Yield Tracking** | Track units tested, passed, failed per device/tester/shift for productivity metrics | Medium |
| **Shift Handover Notes** | A free-text field that a supervisor fills in at end of shift for the next team | Low |
| **Equipment Calibration Log** | Track calibration due dates and log completed calibrations per tester | Low |
| **Spare Parts Inventory** | Track which parts (sockets, alignment plates, chucks) are in stock per zone | Low |
| **Mobile / Tablet View** | Ensure dashboard is usable on a tablet or phone held on the floor | Low |
| **Analytics Dashboard** | Downtime breakdown charts, MTBF per tester, top recurring errors | Medium |
| **Tester Comparison** | Side-by-side view of two testers' downtime history and error frequency | Low |
| **Bulk Status Update** | Supervisor marks multiple stations at once (e.g. zone-wide power outage) | Low |

---

## How to Use This File

- When a phase is complete, mark it ✅ and add a completion date
- When starting a phase, mark it 🔄 and fill in the remaining items
- When a backlog idea gets planned, move it to a phase and create a `docs/feature-*.md` file
- When a question gets answered, update the relevant phase section
