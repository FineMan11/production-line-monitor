# Feature: Email / SMS Alerts

## Status: Backlog (no assigned phase)

---

## Problem Statement

Critical events — a station going Down, a troubleshooting session that has been open for hours — currently require a supervisor to be watching the dashboard. If they step away, they miss the event until they return. There is no push notification mechanism.

---

## Proposed Solution

A configurable alert system that sends email (and optionally SMS) notifications to specified recipients when defined events occur. Configured by admins via the Admin panel.

---

## User Stories

- **As a supervisor**, I want to receive an email when any tester station is set to Down status, so I can react even when I'm not at a terminal.
- **As an admin**, I want to configure which events trigger alerts and who receives them, without touching code.
- **As a supervisor**, I want to be alerted if a troubleshooting session has been open for more than 2 hours without being closed.
- **As an admin**, I want to disable alerts during planned maintenance windows without removing the configuration.

---

## Open Questions

- [ ] Is there an SMTP server available on the factory network, or does this go through an external email provider?
- [ ] Is SMS a hard requirement, or is email sufficient for v1?
- [ ] Who should receive alerts — a fixed list of addresses, or per-role (all supervisors)?
- [ ] Should alerts have a cooldown (e.g. don't re-alert for the same station Down within 30 minutes)?
- [ ] Should the supervisor be able to acknowledge an alert from within the system?

---

## Technical Approach

### Backend

**New service:** `backend/app/services/alert_service.py`
- `send_alert(event_type, context)` — dispatch notification via configured channels
- `should_alert(event_type, entity_id)` — check cooldown / suppression rules

**New Celery task:** `backend/app/tasks/stale_session_alert.py`
- Periodic: find open troubleshooting sessions older than threshold → send alert

**Modified:**
- `status_service.update_status()` — call `alert_service.send_alert("station_down", {...})` when new status is Down
- `troubleshooting_service.create_session()` — call `alert_service.send_alert("session_opened", {...})`

**New model:** `AlertConfig` in `backend/app/models/alert_config.py`
- `event_type` (String), `enabled` (Boolean), `recipients` (JSON array of emails), `cooldown_minutes` (Integer)
- Seeded with defaults on first run

**New endpoints:** `/api/admin/alerts/`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/alerts/` | GET | admin | List alert configs |
| `/api/admin/alerts/<event_type>` | PATCH | admin | Update recipients, enable/disable, cooldown |

**New config:**
```
ALERT_EMAIL_ENABLED=true
SMTP_HOST=smtp.internal
SMTP_PORT=587
SMTP_FROM=production-monitor@facility.local
```

### Frontend

**Modified:** `src/pages/AdminPage.jsx`
- Add "Alert Settings" tab
- List each event type with toggle (enabled/disabled), recipients, cooldown setting

**New component:** `src/components/admin/AlertSettingsForm.jsx`
- Per-event toggles, recipient email list editor, cooldown input

---

## Database Changes

| Table | Change | Reason |
|-------|--------|--------|
| `alert_configs` | New table | Store per-event alert configuration |
| `alert_log` | New table (optional) | Track sent alerts for cooldown and audit |

---

## Acceptance Criteria

- [ ] When a station is set to Down, an email is sent to all configured recipients within 60 seconds
- [ ] If alerts are disabled for an event type, no email is sent even if the event occurs
- [ ] Cooldown works: if the same station goes Down again within the cooldown period, no second email is sent
- [ ] Admin can update recipients and settings via the UI without restarting the server
- [ ] Alert emails include: tester name, event type, timestamp, and a link to the dashboard
