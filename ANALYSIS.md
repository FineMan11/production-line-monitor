# AI Root Cause Analysis Feature — Deferred Plan

> **Status:** Planned, not yet implemented.
> Implement this after the core troubleshooting features are stable.

---

## Overview

A dedicated **Analysis page** powered by Claude API that lets supervisors and admins:
- Browse all troubleshooting sessions with rich filters (tester type, handler type, hard bin, session type, date range, status)
- Run AI root cause analysis per session on demand using full context: steps, hard bin, tester type, past sessions on same tester
- Save the generated root cause back to the session for future reference

Entry point: "Analysis →" button above Troubleshooting History on the Maintenance page.

---

## 1. Database

**File:** `backend/app/models/troubleshooting.py`
- Add: `root_cause = db.Column(db.Text, nullable=True)` on `TroubleshootingSession`
- Update `to_dict()` to include `"root_cause": self.root_cause`

**Migration:**
```bash
docker compose exec backend flask db migrate -m "add root_cause to troubleshooting_sessions"
docker compose exec backend flask db upgrade
```

---

## 2. Backend — Analysis Service

**New file:** `backend/app/services/analysis_service.py`

### `generate_root_cause(session_id, user_id) -> TroubleshootingSession`
1. Load session + all steps + tester (name, tester_type)
2. Load last 10 closed sessions on same tester (excluding current) for context
3. Build Claude prompt (see template below)
4. Call `anthropic.Anthropic().messages.create(...)` with model `claude-sonnet-4-6`
5. Extract text, strip whitespace
6. Save to `session.root_cause`; call `log_action()`
7. Return session (caller commits)

### `get_analysis_sessions(tester_type, handler_type, hard_bin, session_type, date_from, date_to, solved) -> list`
- Query `TroubleshootingSession` with joins to `Tester` and `Handler`
- Apply each filter when provided
- Return sessions ordered by `started_at DESC`

### Claude Prompt Template
```
You are a semiconductor testing equipment analyst.

Equipment: {tester.name} ({tester.tester_type})
Session type: {session_type} | Hard bin: {hard_bin or "N/A"}

CURRENT SESSION STEPS:
{numbered list: Action / Result / [PC failure block if upchuck] / Plan if jamming}

PAST SESSIONS ON THIS TESTER (most recent 10):
{same format, condensed}

Identify:
1. Most likely root cause
2. Contributing factors
3. Recommended long-term fix

Be concise and technical. Max 200 words.
```

---

## 3. Backend — Analysis API

**New file:** `backend/app/api/analysis.py`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/analysis/sessions` | GET | jwt_required | List sessions with filters |
| `/api/analysis/sessions/<id>/analyse` | POST | supervisor/admin | Generate + save root cause |

**Query params for GET:** `tester_type`, `handler_type`, `hard_bin`, `session_type`, `date_from`, `date_to`, `solved`

**Register in** `backend/app/__init__.py`:
```python
from .api.analysis import analysis_bp
app.register_blueprint(analysis_bp, url_prefix="/api/analysis")
```

---

## 4. Dependencies & Config

**`backend/requirements.txt`** — add:
```
anthropic>=0.34.0
```

**`.env` / `.env.example`** — add:
```
ANTHROPIC_API_KEY=
```

**`backend/app/config.py`** — add:
```python
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
```

Usage in service: `anthropic.Anthropic(api_key=current_app.config["ANTHROPIC_API_KEY"])`

---

## 5. Frontend

### New files
| File | Purpose |
|------|---------|
| `frontend/src/services/analysisService.js` | `getAnalysisSessions(params)`, `analyseSession(id)` |
| `frontend/src/pages/AnalysisPage.jsx` | Filter bar + session cards with AI analyse button |

### Modified files
| File | Change |
|------|--------|
| `frontend/src/App.jsx` | Add `/analysis` route (ProtectedRoute requiredRole="supervisor") |
| `frontend/src/components/Navbar.jsx` | Add "Analysis" link for supervisor + admin |
| `frontend/src/pages/MaintenancePage.jsx` | Add "Analysis →" button above TroubleshootingList |

### AnalysisPage layout
```
┌─────────────────────────────────────────────────────────┐
│ [Tester Type ▾] [Handler Type ▾] [Hard Bin ▾]          │
│ [Session Type ▾] [Status ▾] [Date From] [Date To]      │
│                                             [Load]      │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ETS-01 · HB04 · Upchuck  Solved  19 Mar 2026       │ │
│ │ Technician: Ali  · 3 steps                         │ │
│ │                                                     │ │
│ │ [Analyse with AI ▶]                                │ │
│ │   ↳ Root Cause: "Worn socket contactor on pin…"   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Behaviour
- On load: empty state until user applies filters and clicks **Load**
- If `root_cause` exists on a session → display in a teal block
- If not → show **"Analyse with AI"** button (supervisor/admin only)
- Clicking button → loading state → calls `POST /api/analysis/sessions/<id>/analyse` → result displayed and persisted

---

## Verification Checklist
1. Add `ANTHROPIC_API_KEY=<key>` to `.env`
2. Run migration for `root_cause` column
3. Rebuild backend: `docker compose up --build -d backend`
4. Log in as supervisor/admin → "Analysis" link appears in Navbar
5. Maintenance page → "Analysis →" button navigates to `/analysis`
6. Apply filters → Load → sessions appear
7. Click "Analyse with AI" → loading → root cause text appears
8. Reload page → root cause persists
9. Operator role → Analysis page blocked
