# Backend — Feature Status & Planning

This file tracks what is built, what is in progress, and what is planned for the backend layer.
For full business requirements, see [ECOSYSTEM_SPECIFICATION.md](../ECOSYSTEM_SPECIFICATION.md).
For architecture rules, see [CLAUDE.md](../CLAUDE.md).

---

## Currently Implemented

### Authentication (`app/api/auth.py`, `app/auth/routes.py`)
- `POST /api/auth/login` — validate credentials, return access + refresh tokens
- `POST /api/auth/refresh` — issue new access token via refresh token
- `POST /api/auth/logout` — add JTI to blocklist
- `GET /api/auth/me` — return current user profile

### Dashboard (`app/api/dashboard.py`)
- `GET /api/dashboard/testers` — all 52 testers with current status
- `GET /api/dashboard/handlers` — all handlers with current assignment

### Testers (`app/api/tester.py`)
- `GET /api/testers/<id>` — single tester detail
- `PATCH /api/testers/<id>/status` — update status (emits Socket.IO event)
- `GET /api/testers/<id>/history` — status change history

### Maintenance (`app/api/maintenance.py`)
- `GET /api/maintenance/` — list maintenance logs (filterable by tester, date)
- `POST /api/maintenance/` — create a new maintenance log
- `PATCH /api/maintenance/<id>/close` — record end time

### Admin (`app/api/admin.py`)
- `GET /api/admin/users` — list all users
- `POST /api/admin/users` — create user
- `PATCH /api/admin/users/<id>` — update user (role, active status)
- `GET /api/admin/audit-logs` — paginated audit log viewer

### Models
| Model | File | Status |
|-------|------|--------|
| `User` | `models/user.py` | ✅ Complete |
| `Role`, `Permission` | `models/role.py` | ✅ Complete |
| `AuditLog` | `models/audit_log.py` | ✅ Complete |
| `Tester`, `StatusHistory` | `models/tester.py` | ✅ Complete |
| `Handler` | `models/handler.py` | ✅ Complete |
| `Status` | `models/status.py` | ✅ Complete |
| `MaintenanceLog` | `models/maintenance.py` | ✅ Complete |

### Utilities
- `utils/decorators.py` — `role_required()` RBAC decorator
- `utils/audit.py` — `log_action()` helper (called after every state change)

---

## In Progress (Phase 3)

### Troubleshooting (`app/api/troubleshooting.py`)
| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| `/api/troubleshooting/` | GET | jwt_required | 🔄 Modified |
| `/api/troubleshooting/` | POST | line_technician+ | 🔄 Modified |
| `/api/troubleshooting/<id>` | GET | jwt_required | 🔄 Modified |
| `/api/troubleshooting/<id>/steps` | POST | line_technician+ | 🔄 Modified |
| `/api/troubleshooting/<id>/close` | PATCH | line_technician+ | 🔄 Modified |
| `/api/troubleshooting/steps/<id>` | PATCH | line_technician+ | 🔄 Modified |
| `/api/troubleshooting/<id>` | DELETE | supervisor+ | 🔄 Modified |

**Models:** `TroubleshootingSession`, `TroubleshootingStep` in `models/troubleshooting.py`
**Service:** `services/troubleshooting_service.py`
**Pending:** 2 migrations to run (`flask db upgrade`)

---

## Planned — Phase 4: JHT Handler Monitoring

### New service: `services/jht_service.py`
- Poll or listen to JHT handler network endpoint
- Parse handler state into `{handler_id, status, changed_at}`
- Emit `status_update` Socket.IO event
- Store change in `status_history`

### New Celery task (or daemon): periodic JHT poll
- Run every N seconds via Celery Beat
- Detect state changes, ignore no-change polls
- Dead-letter queue / alerting on connection loss

### Config additions
- `JHT_HOST`, `JHT_PORT`, `JHT_POLL_INTERVAL_SECONDS` in `.env` / `config.py`

**See:** [../docs/feature-jht-monitoring.md](../docs/feature-jht-monitoring.md)

---

## Planned — Phase 5: Auto Job Sheet from Log Files

### New endpoint: `POST /api/jobsheets/<id>/parse-log`
- Accept multipart file upload (or read from mounted path)
- Delegate to `services/log_parser_service.py`
- Return parsed entries for operator review before commit

### New service: `services/log_parser_service.py`
- Strategy pattern: one parser class per tester type (INVTG, ETS364, J750)
- `parse(file_content, tester_type) -> list[JobSheetEntryDraft]`
- Validate parsed values against job sheet field constraints

### Database addition
- `jobsheet_entries.source` — `"manual"` or `"auto_parsed"` to distinguish entry origin

**See:** [../docs/feature-auto-jobsheet.md](../docs/feature-auto-jobsheet.md)

---

## Planned — Phase 6: Knowledge Base

### New endpoint group: `/api/knowledge/`
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/knowledge/` | GET | List published solutions (filterable) |
| `/api/knowledge/<id>` | GET | Single solution detail |
| `/api/knowledge/` | POST | Publish a closed session as a solution (supervisor+) |
| `/api/knowledge/<id>` | PATCH | Update tags, title, or body |

### New model: `KnowledgeEntry` (file: `models/knowledge.py`)
- `id`, `session_id` (FK → `troubleshooting_sessions`), `title`, `tags` (JSON array), `published_by`, `published_at`
- Read-only after publish (append-only principle)

**See:** [../docs/feature-knowledge-base.md](../docs/feature-knowledge-base.md)

---

## Planned — Phase 7: AI Root Cause Analysis

### New endpoint group: `/api/analysis/`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/analysis/sessions` | GET | jwt_required | List sessions with filters |
| `/api/analysis/sessions/<id>/analyse` | POST | supervisor+ | Generate + save root cause via Claude API |

### New service: `services/analysis_service.py`
- `generate_root_cause(session_id, user_id)` — calls Claude API, saves result
- `get_analysis_sessions(filters)` — query with joins

### Model change: `TroubleshootingSession`
- Add `root_cause = db.Column(db.Text, nullable=True)`

### Dependency: `anthropic>=0.34.0` in `requirements.txt`
### Config: `ANTHROPIC_API_KEY` in `.env` / `config.py`

**See:** [../ANALYSIS.md](../ANALYSIS.md) for full implementation plan

---

## Planned — Analytics

### New endpoint group: `/api/analytics/`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/analytics/downtime` | GET | supervisor+ | Downtime by tester, date range |
| `/api/analytics/errors` | GET | supervisor+ | Error frequency by tester/type |
| `/api/analytics/resolution-rate` | GET | supervisor+ | Solved vs unsolved sessions |
| `/api/analytics/top-actions` | GET | supervisor+ | Most common troubleshooting actions |

### New service: `services/analytics_service.py`
- All queries are read-only aggregations over `status_history` and `troubleshooting_sessions`

---

## Planned — Alerts

### New service: `services/alert_service.py`
- `send_alert(event_type, context)` — dispatch email or SMS notification
- Triggered from `status_service` (station goes Down) and `troubleshooting_service` (session opened)

### Config additions
- `ALERT_EMAIL_ENABLED`, `SMTP_HOST`, `SMTP_PORT`, `ALERT_RECIPIENTS`
- `ALERT_SMS_ENABLED`, `SMS_PROVIDER`, `SMS_API_KEY` (future)

**See:** [../docs/feature-alerts.md](../docs/feature-alerts.md)

---

## Database Migration Log

| Migration | Description | Status |
|-----------|-------------|--------|
| `04cdbf171e0a` | Initial schema | ✅ Applied |
| `28b7c86f9589` | Add testers, handlers, statuses | ✅ Applied |
| `4ed187d3ff1c` | Add jamming session type + plan field | ✅ Applied |
| `82ad1ed14296` | Add description to troubleshooting steps | ✅ Applied |
| `a90cc315325a` | Add device fields to testers and handlers | ✅ Applied |
| `b2e2655074df` | Add troubleshooting sessions and steps | ✅ Applied |
| `f758df5d91b2` | Add site_count and site_number to steps | ⏳ Pending |
| `6ee9d2dce1b6` | Action nullable, site_number to text, add_ | ⏳ Pending |
