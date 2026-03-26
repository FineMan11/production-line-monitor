# Production Line Monitor — Ecosystem Specification

This document defines the business requirements, operational context, and functional scope of the system.
It is the authoritative source for *what the system must do* and *why*.
For *how it is built*, see [CLAUDE.md](CLAUDE.md).

---

## 1. Business Context

### Facility
A semiconductor and electronics testing facility operating production lines with 52 tester stations.

### Shifts
| Shift | Hours |
|-------|-------|
| Morning | 07:00 – 19:00 |
| Night | 19:00 – 07:00 |

### Equipment
| Category | Types |
|----------|-------|
| Testers | INVTG, ETS364, J750 |
| Handlers | JHT, MT, CAS |

### Problem Being Solved
Before this system:
- Station status was tracked on whiteboards or by word of mouth
- Job sheets (form K-MF0105) were filled in by hand every shift
- Downtime durations were estimated, not measured
- Supervisors had no real-time view of line health
- Troubleshooting steps were undocumented or lost on paper
- No way to search past solutions when a recurring problem appeared

### Success Criteria
- Supervisors can see all 52 station statuses in one view at any moment
- Every status change is timestamped and stored permanently
- Job sheets are created automatically and filled digitally
- Technicians can log and track troubleshooting sessions step by step
- Past troubleshooting solutions are searchable
- The system runs on the local factory network — no internet required

---

## 2. User Roles and Permissions

| Role | Who Uses It | Key Permissions |
|------|------------|-----------------|
| `operator` | Floor operators | View dashboard, update station status |
| `line_technician` | Technicians | Above + log maintenance + create/manage troubleshooting sessions |
| `supervisor` | Shift supervisors | Above + manage stations, view audit logs, delete sessions, access analytics |
| `admin` | IT / system admin | Full access including user management and system settings |

### Role Rules
- A user has exactly one role
- The role is embedded in the JWT at login — no per-request database lookup
- Screens and API endpoints enforce role at the point of access
- Supervisors cannot create user accounts — that is admin-only

---

## 3. Module Specifications

### 3.1 Dashboard
**Purpose:** Give supervisors and operators a real-time view of all 52 tester stations.

**Functional requirements:**
- Display all 52 stations as cards arranged by zone or tester type
- Each card shows: tester ID, tester type, handler name, current status, time in current status
- Status colour coding: Running (green), Maintenance (orange), Engineering (blue), Down (red)
- Status changes appear on all connected browsers instantly (WebSocket — no polling)
- Clicking a station opens a modal with actions: change status, view history, open troubleshooting

**Data sources:**
- `testers` table (station config)
- `status_history` table (most recent entry per tester = current status)
- `handlers` table (which handler is on which tester)
- Socket.IO `status_update` event (real-time push)

**Access:** All roles

---

### 3.2 Job Sheets (Digital K-MF0105)
**Purpose:** Replace paper form K-MF0105 with a digital record per tester per shift.

**Functional requirements:**
- One job sheet is created automatically per tester per shift at shift start
- A job sheet contains: tester ID, shift (morning/night), date, supervisor name, operator name
- RIO daily entries: time, flow, site, totals, submitted-by — operators can add entries throughout the shift
- Unproductive time log: reason, start time, end time (auto-calculated duration)
- Job sheets are closed at shift end — never deleted
- Corrections to an entry create a new entry with a note — original is preserved
- Supervisors can view any job sheet; operators can only view their own tester's current sheet

**Data sources:**
- `jobsheets` table
- `jobsheet_entries` table (append-only)

**Access:** All roles (operators scoped to their tester)

**Status:** ✅ Complete (Phase 2)

---

### 3.3 Maintenance Logging
**Purpose:** Log start and end times for maintenance work with technician attribution.

**Functional requirements:**
- Technician logs a maintenance event: tester, start time, description, technician name
- End time is recorded when maintenance is complete
- Duration is calculated automatically
- Logs are linked to the active job sheet for the tester's shift
- Maintenance logs feed into downtime analytics

**Data sources:**
- `maintenance_logs` table

**Access:** `line_technician` and above

**Status:** ✅ Complete (Phase 3)

---

### 3.4 Troubleshooting Sessions
**Purpose:** Let technicians document troubleshooting steps in real time and build a history of what was tried and what worked.

**Functional requirements:**
- A technician opens a troubleshooting session on a specific tester
- Session type is either **upchuck** (PC failure / hard bin) or **jamming** (mechanical handler jam)
- For upchuck: hard bin is required (HB04, HB08, HB12)
- A session has a list of steps; each step records:
  - Action taken (from preset action tags or free text)
  - Result observed
  - For upchuck: PC failure block (pin number, HB/SB observed, failure description, measured value vs limits, site failures)
  - For jamming: plan field (next intended action)
- Steps are append-only — existing steps can be edited but not deleted
- A session is closed as "solved" or "not solved"
- Only one session can be open per tester at a time
- Supervisors and admins can delete sessions (permanently)

**Data sources:**
- `troubleshooting_sessions` table
- `troubleshooting_steps` table

**Access:** Create/edit: `line_technician`+; Delete: `supervisor`+

**Status:** 🔄 In Progress (Phase 3)

---

### 3.5 Analytics
**Purpose:** Give supervisors and admins visibility into line performance over time.

**Functional requirements:**
- Downtime by tester: total hours down per tester over a date range
- Downtime by reason: breakdown of status types (Maintenance, Engineering, Down)
- Error frequency: which testers have the most troubleshooting sessions
- Troubleshooting resolution rate: sessions solved vs not solved per tester type
- Most common actions taken (from action tags across all steps)
- Date range filtering, tester type filtering

**Access:** `supervisor` and `admin` only

**Status:** 🔜 Planned

---

### 3.6 Admin Panel
**Purpose:** Manage users, view audit logs, and configure system settings.

**Functional requirements:**
- Create, edit, deactivate user accounts
- Assign roles to users
- View audit log (who did what, when, from which IP)
- System settings: shift times, tester list, handler list, status definitions

**Access:** `admin` only

**Status:** ✅ Partially complete (user management + audit log viewer done; system settings not started)

---

## 4. Data Flow

```
Operator changes status on dashboard
  → PATCH /api/testers/<id>/status
    → status_service.update_status()
      → new row in status_history (append-only)
      → audit log entry written
      → socketio.emit("status_update", {...})
        → all connected dashboards update instantly
        → active job sheet for this tester's shift is flagged (unproductive time begins if Down/Maintenance)
```

```
Technician opens troubleshooting session
  → POST /api/troubleshooting/
    → troubleshooting_service.create_session()
      → new TroubleshootingSession row
      → audit log entry
  → Technician adds steps via POST /api/troubleshooting/<id>/steps
    → each step is a new TroubleshootingStep row (append-only)
  → Technician closes session → PATCH /api/troubleshooting/<id>/close
    → session.resolved_at set, session.solved set
    → audit log entry
```

---

## 5. Non-Functional Requirements

### Availability
- System must run on the local factory network — no internet dependency
- Target: available for all shifts (24/7)
- Single-server deployment is acceptable for current scale

### Performance
- Dashboard must load within 2 seconds for all 52 station cards
- Status updates must appear on all connected clients within 500ms of the change
- API responses for list endpoints must return within 1 second under normal load (50 concurrent users)

### Data Retention
- Status history, job sheets, and audit logs are **never deleted**
- Append-only tables must remain append-only — no soft deletes on these tables
- Troubleshooting sessions may be deleted by supervisor/admin (compliance exception for test data)

### Security
- All API endpoints require JWT except `/api/auth/login`
- Passwords are hashed with Werkzeug — never stored plain
- JWT tokens expire in 24 hours
- Every state-changing action is logged to `audit_logs`
- Error responses never include stack traces

### Scalability
- Current scope: single factory floor, ~52 stations, ~20 concurrent users
- Architecture allows horizontal scaling if needed (stateless Flask + external PostgreSQL/Redis)

---

## 6. Out of Scope (Current)

- Internet access or cloud hosting
- Mobile app (browser on tablet is sufficient for now)
- Integration with ERP or MES systems
- Automated equipment control (read-only from handlers in Phase 4)
- Multi-site (one factory only)
