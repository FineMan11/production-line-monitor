# Feature: JHT Handler Real-Time Monitoring

## Status: Planned
## Phase: 4

---

## Problem Statement

JHT handler status is currently updated manually by operators. If a handler jams or stops, someone must walk to the station, observe the problem, then go to a terminal and update the dashboard. There is always a delay — sometimes minutes — between an event and the dashboard reflecting it.

JHT handlers are networked devices. The goal is to read their status directly from the network so the dashboard updates automatically without operator input.

---

## Proposed Solution

A background Celery task (or lightweight daemon) polls each JHT handler's network endpoint on a short interval. When the reported state differs from the last known state, it:
1. Records a new `status_history` row
2. Emits a `status_update` Socket.IO event
3. Logs the change to the audit trail

The dashboard receives the update instantly via WebSocket — same as manual updates today.

---

## User Stories

- **As a supervisor**, I want to see a handler jam appear on the dashboard within 10 seconds of it happening, so I can dispatch a technician immediately.
- **As an operator**, I no longer need to manually update the status of JHT handlers — the system does it for me.
- **As a supervisor**, if an operator has manually overridden a handler's status, that override should not be silently stomped by the next auto-poll — I want to know a conflict occurred.

---

## Open Questions

- [ ] What network protocol does the JHT handler expose? (HTTP, TCP, Modbus, proprietary?)
- [ ] Is the backend server on the same network segment as the JHT handlers, or is a bridge device needed?
- [ ] What status values does the JHT broadcast? Do they map 1:1 to our Running/Maintenance/Engineering/Down?
- [ ] What poll interval is appropriate? (5s? 10s? Event-driven?)
- [ ] How do we handle a JHT handler going offline (no response)? Treat as Down or Unknown?
- [ ] Conflict resolution: if an operator manually sets status to Engineering, and the handler reports Running, which wins?
- [ ] Does the handler provide the specific jam type or just a binary running/not-running?

---

## Technical Approach

### Backend

**New config keys** (`.env` / `config.py`):
```
JHT_POLL_ENABLED=true
JHT_POLL_INTERVAL_SECONDS=10
JHT_HOSTS={"JHT-01": "192.168.1.101", "JHT-02": "192.168.1.102"}
```

**New service:** `backend/app/services/jht_service.py`
- `poll_handler(handler_id, host)` — connect, read state, return parsed status
- `process_state_change(handler_id, new_status)` — compare with last known, record if changed, emit event
- `get_last_known_status(handler_id)` — query `status_history` for latest entry

**New Celery task** (or Beat schedule): `backend/app/tasks/jht_poll.py`
- Periodic task: iterate all JHT handlers, call `poll_handler`, call `process_state_change`
- On connection failure: log warning, optionally set status to `Unknown`

**Modified:** `backend/app/models/handler.py`
- Add `auto_monitored = db.Column(db.Boolean, default=False)` — flag for handlers under auto-monitoring
- Add `last_polled_at = db.Column(db.DateTime, nullable=True)` — for health visibility

### Frontend

**Dashboard TesterCard change:**
- If the handler is auto-monitored, show a small indicator icon (e.g. wifi symbol) to distinguish auto vs manual status
- No other UI changes needed — the WebSocket path is identical

---

## Database Changes

| Table | Change | Reason |
|-------|--------|--------|
| `handlers` | Add `auto_monitored` (Boolean) | Track which handlers are polled |
| `handlers` | Add `last_polled_at` (DateTime) | Visibility into polling health |
| `status_history` | Add `source` ENUM `manual / auto` | Audit trail: who changed it — human or system |

---

## Acceptance Criteria

- [ ] With JHT polling enabled, a handler state change is reflected on the dashboard within `JHT_POLL_INTERVAL_SECONDS + 1s`
- [ ] Auto-detected changes are recorded in `status_history` with `source = "auto"`
- [ ] If a JHT handler is unreachable for 3 consecutive polls, a warning is logged and status is optionally set to Down/Unknown
- [ ] If polling is disabled in config, no polling occurs and all existing manual functionality works unchanged
- [ ] Auto-monitored handlers show a visual indicator on their station card
