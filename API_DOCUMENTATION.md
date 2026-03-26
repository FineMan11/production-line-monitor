# Production Line Monitor — API Documentation

All endpoints are prefixed with `/api`. All requests (except login) require `Authorization: Bearer <access_token>`.

Responses use standard HTTP status codes. Errors return `{"error": "message"}` or `{"error": "...", "details": {...}}`.

---

## Authentication

### POST /api/auth/login
**Auth:** None

**Request:**
```json
{ "username": "string", "password": "string" }
```

**Response 200:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": { "id": 1, "username": "ali", "role": "line_technician" }
}
```

**Response 401:** `{"error": "Invalid credentials"}`

---

### POST /api/auth/refresh
**Auth:** Bearer refresh_token

**Response 200:**
```json
{ "access_token": "string" }
```

---

### POST /api/auth/logout
**Auth:** Bearer access_token

**Response 200:** `{"message": "Logged out"}`

---

### GET /api/auth/me
**Auth:** Bearer access_token

**Response 200:**
```json
{ "id": 1, "username": "ali", "role": "line_technician", "full_name": "Ali Hassan" }
```

---

## Dashboard

### GET /api/dashboard/testers
**Auth:** All roles

**Response 200:**
```json
[
  {
    "id": 1,
    "name": "ETS-01",
    "tester_type": "ETS364",
    "handler": { "id": 3, "name": "JHT-A", "handler_type": "JHT" },
    "status": { "name": "Running", "color_code": "green" },
    "status_since": "2026-03-26T07:00:00Z",
    "device": "XYZ-100",
    "site_count": 4
  }
]
```

---

### GET /api/dashboard/handlers
**Auth:** All roles

**Response 200:**
```json
[
  {
    "id": 3,
    "name": "JHT-A",
    "handler_type": "JHT",
    "assigned_tester_id": 1
  }
]
```

---

## Testers

### GET /api/testers/\<id\>
**Auth:** All roles

**Response 200:** Same shape as a single object from `/api/dashboard/testers` plus `status_history` array.

---

### PATCH /api/testers/\<id\>/status
**Auth:** operator+

**Request:**
```json
{ "status_id": 2, "note": "optional note" }
```

**Response 200:**
```json
{ "message": "Status updated", "status": { "name": "Maintenance", "color_code": "orange" } }
```

---

### GET /api/testers/\<id\>/history
**Auth:** All roles

**Query params:** `limit` (default 50), `offset` (default 0)

**Response 200:**
```json
[
  {
    "id": 101,
    "status": { "name": "Down", "color_code": "red" },
    "changed_by": "ali",
    "changed_at": "2026-03-26T10:32:00Z",
    "note": "socket problem"
  }
]
```

---

## Maintenance

### GET /api/maintenance/
**Auth:** All roles

**Query params:** `tester_id`, `date_from`, `date_to`, `open_only`

**Response 200:**
```json
[
  {
    "id": 5,
    "tester_id": 1,
    "tester_name": "ETS-01",
    "started_at": "2026-03-26T09:00:00Z",
    "ended_at": null,
    "duration_minutes": null,
    "notes": "Replacing socket",
    "technician": "Ali Hassan"
  }
]
```

---

### POST /api/maintenance/
**Auth:** line_technician+

**Request:**
```json
{
  "tester_id": 1,
  "started_at": "2026-03-26T09:00:00Z",
  "notes": "Replacing socket",
  "technician": "Ali Hassan"
}
```

**Response 201:** Created maintenance log object.

---

### PATCH /api/maintenance/\<id\>/close
**Auth:** line_technician+

**Request:**
```json
{
  "ended_at": "2026-03-26T10:30:00Z",
  "notes": "Socket replaced, tester back online"
}
```

**Response 200:** Updated maintenance log object.

---

## Troubleshooting

### GET /api/troubleshooting/
**Auth:** All roles

**Query params:** `tester_id`, `open_only`, `date`, `session_type`

**Response 200:** Array of session summary objects.

---

### POST /api/troubleshooting/
**Auth:** line_technician+

**Request (upchuck):**
```json
{
  "tester_id": 1,
  "session_type": "upchuck",
  "hard_bin": "HB04",
  "technician": "Ali Hassan"
}
```

**Request (jamming):**
```json
{
  "tester_id": 1,
  "session_type": "jamming",
  "description": "Handler jam at pickup position",
  "technician": "Ali Hassan"
}
```

**Response 201:**
```json
{
  "id": 42,
  "tester_id": 1,
  "session_type": "upchuck",
  "hard_bin": "HB04",
  "started_at": "2026-03-26T11:00:00Z",
  "solved": false,
  "steps": []
}
```

**Response 409:** `{"error": "A session is already open for this tester"}`

---

### GET /api/troubleshooting/\<id\>
**Auth:** All roles

**Response 200:** Full session object including `steps` array and `similar_solutions` (Phase 6+).

---

### POST /api/troubleshooting/\<id\>/steps
**Auth:** line_technician+

**Request:**
```json
{
  "action_tags": ["Clean Socket", "Swap Socket"],
  "action": "Cleaned and replaced socket unit 2",
  "result": "Same HB04 failure on next run",
  "pin_number": "P42",
  "hb_observed": "HB04",
  "sb_observed": "SB12",
  "failure_description": "Open circuit",
  "measured_value": "0.1",
  "upper_limit": "1.0",
  "lower_limit": "0.0",
  "site_count": 4,
  "site_number": "1,3"
}
```

*All PC failure fields (pin_number, hb_observed, etc.) are only relevant for upchuck sessions.*

**Response 201:** The created step object.

---

### PATCH /api/troubleshooting/\<id\>/close
**Auth:** line_technician+

**Request:**
```json
{ "solved": true }
```

**Response 200:** Updated session object.

---

### PATCH /api/troubleshooting/steps/\<id\>
**Auth:** line_technician+

**Request:** Any subset of step fields (same shape as POST steps body).

**Response 200:** Updated step object.

---

### DELETE /api/troubleshooting/\<id\>
**Auth:** supervisor+

**Response 200:** `{"message": "Session deleted"}`

---

## Admin

### GET /api/admin/users
**Auth:** admin

**Response 200:** Array of user objects (no password hashes).

---

### POST /api/admin/users
**Auth:** admin

**Request:**
```json
{
  "username": "newuser",
  "full_name": "Name Here",
  "password": "initial_password",
  "role": "operator"
}
```

**Response 201:** Created user object.

---

### PATCH /api/admin/users/\<id\>
**Auth:** admin

**Request:** Any of `full_name`, `role`, `is_active`, `password`.

**Response 200:** Updated user object.

---

### GET /api/admin/audit-logs
**Auth:** admin (supervisor can view, admin can search all)

**Query params:** `user_id`, `action`, `date_from`, `date_to`, `limit`, `offset`

**Response 200:**
```json
[
  {
    "id": 200,
    "user": "ali",
    "action": "update_status",
    "entity": "tester:1",
    "detail": "Status changed to Maintenance",
    "ip_address": "192.168.1.5",
    "timestamp": "2026-03-26T09:00:00Z"
  }
]
```

---

## Planned Endpoints (not yet implemented)

| Endpoint | Method | Feature |
|----------|--------|---------|
| `/api/jobsheets/` | GET | Job sheets list |
| `/api/jobsheets/<id>` | GET | Job sheet detail with entries |
| `/api/jobsheets/<id>/entries` | POST | Add RIO entry |
| `/api/jobsheets/<id>/close` | PATCH | Close shift sheet |
| `/api/jobsheets/<id>/parse-log` | POST | Phase 5: auto-parse log file |
| `/api/knowledge/` | GET/POST | Phase 6: knowledge base |
| `/api/analysis/sessions` | GET | Phase 7: AI analysis sessions |
| `/api/analysis/sessions/<id>/analyse` | POST | Phase 7: trigger AI RCA |
| `/api/analytics/downtime` | GET | Analytics: downtime chart data |
| `/api/analytics/errors` | GET | Analytics: error frequency data |
| `/api/analytics/resolution-rate` | GET | Analytics: resolution rate |
| `/api/analytics/top-actions` | GET | Analytics: top action tags |
| `/api/export/jobsheet/<id>/pdf` | GET | Export job sheet as PDF |
| `/api/export/maintenance/excel` | GET | Export maintenance logs |
| `/api/admin/alerts/` | GET/PATCH | Alert configuration |

---

## Error Format

All error responses follow this structure:

**Client errors (4xx):**
```json
{ "error": "Human-readable message" }
```

**Server errors (5xx):**
```json
{ "error": "An unexpected error occurred. Reference: ERR-a1b2c3d4" }
```

The error reference ID can be searched in `logs/errors.log` for the full stack trace.
